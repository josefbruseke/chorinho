import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * A coleção da loja: as peças de cada programa.
 *
 * A peça não carrega regra — só aponta para um programa e diz o próprio nível.
 * Bronze é nível 1, ouro é 3, e o benefício sai de `base × nível` limitado pelo
 * teto do programa. É assim que uma coleção inteira nasce de uma regra só.
 */

const COLUNAS = "id, title, description, level, max_supply, max_per_customer, starts_at, ends_at, active, program_id";

type LinhaDePeca = {
  id: string;
  title: string;
  description: string | null;
  level: number;
  max_supply: number;
  max_per_customer: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  program_id: string;
};

const mapear = (p: LinhaDePeca) => ({
  id: p.id,
  titulo: p.title,
  descricao: p.description,
  nivel: p.level,
  tiragem: p.max_supply,
  maxPorCliente: p.max_per_customer,
  comecaEm: p.starts_at,
  terminaEm: p.ends_at,
  ativa: p.active,
  programaId: p.program_id,
  // M9: quantas peças já saíram de cada tiragem é o que faz "restam 12 de 50"
  // significar alguma coisa. Vem de `piece_holdings` quando ela existir; até
  // lá o número é desconhecido, e dizer zero seria inventar.
  emCirculacao: null,
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
      .select("id, name, kind, base_benefit, cap_cents, active")
      .eq("establishment_id", loja.id)
      .order("created_at");

    const ids = (programas ?? []).map(p => p.id);
    const { data: pecas } = ids.length
      ? await admin.from("pieces").select(COLUNAS).in("program_id", ids).order("created_at")
      : { data: [] };

    return NextResponse.json({
      loja: { nome: loja.nome },
      programas: (programas ?? []).map(p => ({
        id: p.id,
        nome: p.name,
        tipo: p.kind === 1 ? "valor" : "percentual",
        beneficioBase: p.base_benefit,
        tetoCentavos: p.cap_cents,
        ativo: p.active,
      })),
      pecas: (pecas ?? []).map(mapear),
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
  const maxPorCliente = Number(corpo.maxPorCliente ?? 0);
  const terminaEm = typeof corpo.terminaEm === "string" && corpo.terminaEm ? corpo.terminaEm : null;

  if (titulo.length < 2 || titulo.length > 80) {
    return NextResponse.json({ erro: "o nome da peça precisa ter entre 2 e 80 caracteres" }, { status: 400 });
  }
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 100) {
    return NextResponse.json({ erro: "o nível precisa ser um inteiro de 1 a 100" }, { status: 400 });
  }
  if (!Number.isInteger(tiragem) || tiragem < 0 || !Number.isInteger(maxPorCliente) || maxPorCliente < 0) {
    return NextResponse.json({ erro: "tiragem e limite por pessoa precisam ser zero ou mais" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: programa } = await admin
      .from("discount_programs")
      .select("id, establishment_id")
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
        max_per_customer: maxPorCliente,
        ends_at: terminaEm,
      })
      .select(COLUNAS)
      .single();

    if (error || !peca) {
      console.error("[colecao] falha ao gravar:", error?.message);
      return NextResponse.json({ erro: "não foi possível salvar a peça" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, peca: mapear(peca) });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[colecao] falha ao criar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao criar a peça" }, { status: 500 });
  }
}
