import { type NextRequest, NextResponse } from "next/server";
import { criarPecaNaRede, emCirculacao, redeConfigurada } from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { erroDoContrato } from "~~/services/relayer/servidor";
import { uriDoToken } from "~~/utils/midia";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * A coleção da loja: as peças de cada programa.
 *
 * A peça não carrega regra — só aponta para um programa e diz o próprio nível.
 * Bronze é nível 1, ouro é 3, e o benefício sai de `base × nível` limitado pelo
 * teto do programa. É assim que uma coleção inteira nasce de uma regra só.
 */

const COLUNAS =
  "id, onchain_id, title, description, level, max_supply, max_per_wallet, starts_at, ends_at, active, program_id";

type LinhaDePeca = {
  id: string;
  onchain_id: number | null;
  title: string;
  description: string | null;
  level: number;
  max_supply: number;
  max_per_wallet: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  program_id: string;
};

const mapear = (p: LinhaDePeca, emCirculacaoAgora: number) => ({
  id: p.id,
  onchainId: p.onchain_id,
  titulo: p.title,
  descricao: p.description,
  nivel: p.level,
  tiragem: p.max_supply,
  maxPorCarteira: p.max_per_wallet,
  comecaEm: p.starts_at,
  terminaEm: p.ends_at,
  ativa: p.active,
  programaId: p.program_id,
  emCirculacao: emCirculacaoAgora,
  rascunho: p.onchain_id === null,
});

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/** Os programas da loja e as peças de cada um. */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: programas } = await admin
      .from("discount_programs")
      .select("id, onchain_id, name, kind, base_benefit, cap_cents, active")
      .eq("establishment_id", loja.id)
      .order("created_at");

    const ids = (programas ?? []).map(p => p.id);
    const { data: pecas } = ids.length
      ? await admin.from("pieces").select(COLUNAS).in("program_id", ids).order("created_at")
      : { data: [] };

    // Quantas já saíram de cada tiragem. Vem da cadeia: é o número que faz o
    // "restam 12 de 50" significar alguma coisa.
    const tokenIds = (pecas ?? []).map(p => p.onchain_id).filter((id): id is number => id !== null);
    const circulando = redeConfigurada() && tokenIds.length ? await emCirculacao(tokenIds).catch(() => null) : null;

    return NextResponse.json({
      loja: { nome: loja.nome, registrada: loja.onchainId !== null },
      programas: (programas ?? []).map(p => ({
        id: p.id,
        onchainId: p.onchain_id,
        nome: p.name,
        tipo: p.kind === 1 ? "valor" : "percentual",
        beneficioBase: p.base_benefit,
        tetoCentavos: p.cap_cents,
        ativo: p.active,
      })),
      pecas: (pecas ?? []).map(p => mapear(p, (p.onchain_id && circulando?.get(p.onchain_id)) || 0)),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[colecao] falha ao listar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao listar a coleção" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const programaId = String(corpo.programaId ?? "");
  const titulo = String(corpo.titulo ?? "").trim();
  const descricao = typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 280) : "";
  const nivel = Number(corpo.nivel ?? 1);
  const tiragem = Number(corpo.tiragem ?? 0);
  const maxPorCarteira = Number(corpo.maxPorCarteira ?? 0);
  const terminaEm = typeof corpo.terminaEm === "string" && corpo.terminaEm ? corpo.terminaEm : null;

  if (titulo.length < 2 || titulo.length > 80) {
    return NextResponse.json({ erro: "o nome da peça precisa ter entre 2 e 80 caracteres" }, { status: 400 });
  }
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 100) {
    return NextResponse.json({ erro: "o nível precisa ser um inteiro de 1 a 100" }, { status: 400 });
  }
  if (!Number.isInteger(tiragem) || tiragem < 0 || !Number.isInteger(maxPorCarteira) || maxPorCarteira < 0) {
    return NextResponse.json({ erro: "tiragem e limite por pessoa precisam ser zero ou mais" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: programa } = await admin
      .from("discount_programs")
      .select("id, onchain_id, establishment_id")
      .eq("id", programaId)
      .maybeSingle();

    if (!programa || programa.establishment_id !== loja.id) {
      return NextResponse.json({ erro: "programa não encontrado nesta loja" }, { status: 404 });
    }

    const { data: peca, error } = await admin
      .from("pieces")
      .insert({
        program_id: programa.id,
        title: titulo,
        description: descricao || null,
        level: nivel,
        max_supply: tiragem,
        max_per_wallet: maxPorCarteira,
        ends_at: terminaEm,
      })
      .select(COLUNAS)
      .single();

    if (error || !peca) {
      console.error("[colecao] falha ao gravar:", error?.message);
      return NextResponse.json({ erro: "não foi possível salvar a peça" }, { status: 500 });
    }

    const registro = await registrarNaRede(programa.onchain_id, peca);
    if (!registro.ok) {
      return NextResponse.json({ ok: true, peca: mapear(peca, 0), aviso: registro.aviso });
    }

    const { data: atualizado } = await admin
      .from("pieces")
      .update({ onchain_id: registro.tokenId, onchain_tx_hash: registro.hash })
      .eq("id", peca.id)
      .select(COLUNAS)
      .single();

    return NextResponse.json({ ok: true, peca: mapear(atualizado ?? { ...peca, onchain_id: registro.tokenId }, 0) });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[colecao] falha ao criar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao criar a peça" }, { status: 500 });
  }
}

type Registro = { ok: true; tokenId: number; hash: string } | { ok: false; aviso: string };

/**
 * @dev O `tokenId` é escolhido aqui, não pelo contrato: no ERC-1155 ele é
 *      global, e quem cria a peça precisa dizer qual é. Pegamos o próximo
 *      depois do maior já usado. Se duas lojas criarem no mesmo instante, a
 *      segunda leva `PieceAlreadyExists` e a peça fica rascunho — melhor do que
 *      inventar um id aleatório e transformar a coleção num amontoado de
 *      números sem ordem.
 */
const registrarNaRede = async (programaOnchainId: number | null, p: LinhaDePeca): Promise<Registro> => {
  if (!redeConfigurada()) {
    return { ok: false, aviso: "peça salva como rascunho: a rede não está configurada neste ambiente." };
  }
  if (programaOnchainId === null) {
    return { ok: false, aviso: "peça salva como rascunho: o programa dela ainda não está na rede." };
  }

  const admin = supabaseAdmin();
  const { data: ultima } = await admin
    .from("pieces")
    .select("onchain_id")
    .not("onchain_id", "is", null)
    .order("onchain_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tokenId = (ultima?.onchain_id ?? 0) + 1;

  try {
    const hash = await criarPecaNaRede({
      tokenId,
      programaOnchainId,
      level: p.level,
      maxSupply: p.max_supply,
      maxPerWallet: p.max_per_wallet,
      startsAt: p.starts_at,
      endsAt: p.ends_at,
      uri: uriDoToken("peca", tokenId),
    });

    return { ok: true, tokenId, hash };
  } catch (e) {
    console.error("[colecao] falha na rede:", e instanceof Error ? e.message : e);
    switch (erroDoContrato(e)?.nome) {
      case "PieceAlreadyExists":
        return {
          ok: false,
          aviso: "peça salva como rascunho: outro cadastro pegou o mesmo número. Tente ligá-la de novo.",
        };
      case "NotEstablishmentOwner":
        return { ok: false, aviso: "peça salva como rascunho: a plataforma não tem permissão nesta loja." };
      default:
        return { ok: false, aviso: "peça salva como rascunho: não foi possível registrar na rede agora." };
    }
  }
};
