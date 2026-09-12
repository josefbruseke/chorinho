import { type NextRequest, NextResponse } from "next/server";
import { criarProgramaNaRede, redeConfigurada } from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { erroDoContrato } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * Os programas de desconto da loja.
 *
 * O programa é a regra com nome — "Clube da Manhã, 10%, até vinte reais". A
 * peça aponta para ele e traz só o próprio nível, então mexer no teto aqui
 * muda todas as peças já emitidas sem reemitir nenhuma.
 *
 * Lista também os programas conjuntos de vizinhas que convidaram esta loja: é
 * nesta tela que o convite se aceita, e um convite que não aparece em lugar
 * nenhum é um convite que ninguém responde.
 */

const COLUNAS =
  "id, onchain_id, name, description, kind, base_benefit, cap_cents, product, starts_at, ends_at, joint, active";

type LinhaDePrograma = {
  id: string;
  onchain_id: number | null;
  name: string;
  description: string | null;
  kind: number;
  base_benefit: number;
  cap_cents: number;
  product: string | null;
  starts_at: string | null;
  ends_at: string | null;
  joint: boolean;
  active: boolean;
};

const mapear = (p: LinhaDePrograma) => ({
  id: p.id,
  onchainId: p.onchain_id,
  nome: p.name,
  descricao: p.description,
  tipo: p.kind === 1 ? ("valor" as const) : ("percentual" as const),
  beneficioBase: p.base_benefit,
  tetoCentavos: p.cap_cents,
  produto: p.product,
  comecaEm: p.starts_at,
  terminaEm: p.ends_at,
  conjunto: p.joint,
  ativo: p.active,
  // Sem `onchain_id` a peça não tem a que apontar: o programa existe só no
  // nosso banco, e o balcão não consegue honrar desconto nenhum.
  rascunho: p.onchain_id === null,
});

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const [{ data: meus }, { data: vinculos }] = await Promise.all([
      admin.from("discount_programs").select(COLUNAS).eq("establishment_id", loja.id).order("created_at"),
      admin
        .from("program_members")
        .select("id, status, program_id, responded_at")
        .eq("establishment_id", loja.id)
        .order("invited_at"),
    ]);

    // Os programas de terceiros em que esta loja está envolvida, com o nome de
    // quem convidou — "aceitar o convite de alguém" só faz sentido com o nome
    // de alguém na tela.
    const idsDeTerceiros = (vinculos ?? []).map(v => v.program_id).filter(id => !(meus ?? []).some(p => p.id === id));

    const { data: programasDeTerceiros } = idsDeTerceiros.length
      ? await admin.from("discount_programs").select(`${COLUNAS}, establishment_id`).in("id", idsDeTerceiros)
      : { data: [] };

    const idsDeLojas = [...new Set((programasDeTerceiros ?? []).map(p => p.establishment_id))];
    const { data: donas } = idsDeLojas.length
      ? await admin.from("establishments").select("id, name").in("id", idsDeLojas)
      : { data: [] };
    const nomeDaLoja = new Map((donas ?? []).map(l => [l.id, l.name]));

    const membrosPorPrograma = new Map((vinculos ?? []).map(v => [v.program_id, v]));

    return NextResponse.json({
      loja: { id: loja.id, nome: loja.nome, registrada: loja.onchainId !== null },
      programas: (meus ?? []).map(p => ({
        ...mapear(p),
        // O criador entra aceito no próprio programa, na cadeia e aqui.
        participacao: p.joint ? (membrosPorPrograma.get(p.id)?.status ?? "aceita") : null,
      })),
      convites: (programasDeTerceiros ?? []).map(p => ({
        ...mapear(p),
        deQuem: nomeDaLoja.get(p.establishment_id) ?? "outra loja",
        participacao: membrosPorPrograma.get(p.id)?.status ?? "convidada",
      })),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[programas] falha ao listar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao listar os programas" }, { status: 500 });
  }
}

/**
 * Cria o programa.
 *
 * Grava no Supabase antes da rede, como no catálogo de prêmios: o que o
 * lojista digitou não some porque um RPC caiu. Sem rede, fica rascunho.
 */
export async function POST(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const nome = String(corpo.nome ?? "").trim();
  const descricao = typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 280) : "";
  const tipo = corpo.tipo === "valor" ? 1 : 0;
  const beneficio = Number(corpo.beneficioBase);
  const teto = Number(corpo.tetoCentavos ?? 0);
  const produto = typeof corpo.produto === "string" && corpo.produto.trim() ? corpo.produto.trim().slice(0, 60) : null;
  const conjunto = corpo.conjunto === true;
  const terminaEm = typeof corpo.terminaEm === "string" && corpo.terminaEm ? corpo.terminaEm : null;

  // O nome vira `bytes32` na cadeia. Trinta e dois BYTES, não caracteres: em
  // português um acento come dois. Avisar aqui evita o lojista descobrir que
  // "Clube da Manhã Especial" virou "Clube da Manhã Especi" só depois.
  if (nome.length < 2 || new TextEncoder().encode(nome).length > 32) {
    return NextResponse.json(
      { erro: "o nome precisa ter de 2 a 32 caracteres (acentos contam dobrado)" },
      { status: 400 },
    );
  }
  if (!Number.isInteger(beneficio) || beneficio <= 0) {
    return NextResponse.json({ erro: "o benefício precisa ser um número inteiro maior que zero" }, { status: 400 });
  }
  if (tipo === 0 && beneficio > 10_000) {
    return NextResponse.json({ erro: "um desconto percentual não pode passar de 100%" }, { status: 400 });
  }
  if (!Number.isInteger(teto) || teto < 0) {
    return NextResponse.json({ erro: "o teto precisa ser zero ou um valor em centavos" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: programa, error } = await admin
      .from("discount_programs")
      .insert({
        establishment_id: loja.id,
        name: nome,
        description: descricao || null,
        kind: tipo,
        base_benefit: beneficio,
        cap_cents: teto,
        product: produto,
        ends_at: terminaEm,
        joint: conjunto,
      })
      .select(COLUNAS)
      .single();

    if (error || !programa) {
      console.error("[programas] falha ao gravar:", error?.message);
      return NextResponse.json({ erro: "não foi possível salvar o programa" }, { status: 500 });
    }

    const registro = await registrarNaRede(loja.onchainId, programa);
    if (!registro.ok) {
      return NextResponse.json({ ok: true, programa: mapear(programa), aviso: registro.aviso });
    }

    // O criador já entra aceito na própria pool — o contrato faz o mesmo.
    if (conjunto) {
      await admin.from("program_members").insert({
        program_id: programa.id,
        establishment_id: loja.id,
        status: "aceita",
        responded_at: new Date().toISOString(),
      });
    }

    const { data: atualizado } = await admin
      .from("discount_programs")
      .update({ onchain_id: registro.onchainId, onchain_tx_hash: registro.hash })
      .eq("id", programa.id)
      .select(COLUNAS)
      .single();

    return NextResponse.json({
      ok: true,
      programa: mapear(atualizado ?? { ...programa, onchain_id: registro.onchainId }),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[programas] falha ao criar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao criar o programa" }, { status: 500 });
  }
}

type Registro = { ok: true; onchainId: number; hash: string } | { ok: false; aviso: string };

const registrarNaRede = async (lojaOnchainId: number | null, p: LinhaDePrograma): Promise<Registro> => {
  if (!redeConfigurada()) {
    return { ok: false, aviso: "programa salvo como rascunho: a rede não está configurada neste ambiente." };
  }
  if (lojaOnchainId === null) {
    return { ok: false, aviso: "programa salvo como rascunho: sua loja ainda não foi registrada na rede." };
  }

  try {
    const criado = await criarProgramaNaRede({
      lojaOnchainId,
      nome: p.name,
      kind: p.kind,
      baseBenefit: p.base_benefit,
      capCents: p.cap_cents,
      product: p.product,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      joint: p.joint,
      supabaseId: p.id,
    });

    if (!criado) return { ok: false, aviso: "programa salvo, mas a rede não confirmou o registro." };
    return { ok: true, ...criado };
  } catch (e) {
    console.error("[programas] falha na rede:", e instanceof Error ? e.message : e);
    if (erroDoContrato(e)?.nome === "NotEstablishmentOwner") {
      return { ok: false, aviso: "programa salvo como rascunho: a plataforma não tem permissão nesta loja." };
    }
    return { ok: false, aviso: "programa salvo como rascunho: não foi possível registrar na rede agora." };
  }
};
