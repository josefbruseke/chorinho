import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * Classe de ponto padrão da plataforma — o ponto da cidade. Não existe outra
 * hoje, mas fica nomeada em vez de um `1` solto no meio do insert.
 */
const PONTO_DA_CIDADE = 1;

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

type LinhaDeRecompensa = {
  id: string;
  title: string;
  description: string | null;
  stamp_cost: number;
  point_cost: number;
  active: boolean;
  max_redemptions: number;
  redeemed: number;
  piece_id: string | null;
};

const COLUNAS = "id, title, description, stamp_cost, point_cost, active, max_redemptions, redeemed, piece_id";

/** Do formato da tabela para o que a tela do lojista consome. */
const mapearRecompensa = (r: LinhaDeRecompensa) => ({
  id: r.id,
  titulo: r.title,
  descricao: r.description,
  selos: r.stamp_cost,
  pontos: r.point_cost,
  ativa: r.active,
  maxResgates: r.max_redemptions,
  resgatados: r.redeemed,
  pecaId: r.piece_id,
});

/** As recompensas da loja, todas — inclusive as desligadas. */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const { data: recompensas } = await supabaseAdmin()
      .from("rewards")
      .select(COLUNAS)
      .eq("establishment_id", loja.id)
      .order("created_at", { ascending: true });

    // As peças que este prêmio pode entregar junto — o gatilho direto: o
    // cliente gasta os próprios carimbos e leva a peça.
    const { data: programas } = await supabaseAdmin()
      .from("discount_programs")
      .select("id")
      .eq("establishment_id", loja.id);
    const idsDeProgramas = (programas ?? []).map(p => p.id);
    const { data: pecas } = idsDeProgramas.length
      ? await supabaseAdmin()
          .from("pieces")
          .select("id, title, level")
          .in("program_id", idsDeProgramas)
          .eq("active", true)
      : { data: [] };

    return NextResponse.json({
      loja: { nome: loja.nome },
      recompensas: (recompensas ?? []).map(mapearRecompensa),
      // M9: toda peça ativa pode ser prometida. O filtro que existia aqui só
      // deixava passar peça já registrada na rede.
      pecas: (pecas ?? []).map(p => ({ id: p.id, titulo: p.title, nivel: p.level })),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao listar as recompensas" }, { status: 500 });
  }
}

/** Cadastra um prêmio. */
export async function POST(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { titulo?: unknown; descricao?: unknown; selos?: unknown; pontos?: unknown; pecaId?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const titulo = String(corpo.titulo ?? "").trim();
  const descricao = typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 280) : "";
  const selos = Number(corpo.selos);
  const pontos = Number(corpo.pontos);
  const pecaId = typeof corpo.pecaId === "string" && corpo.pecaId ? corpo.pecaId : null;

  if (titulo.length < 2 || titulo.length > 80) {
    return NextResponse.json({ erro: "o título precisa ter entre 2 e 80 caracteres" }, { status: 400 });
  }
  if (!Number.isInteger(selos) || selos < 0 || !Number.isInteger(pontos) || pontos < 0) {
    return NextResponse.json(
      { erro: "carimbos e pontos precisam ser números inteiros, zero ou mais" },
      { status: 400 },
    );
  }
  // Prêmio de graça vira fila na porta: qualquer um resgata sem ter voltado
  // nenhuma vez, e o programa deixa de significar visita.
  if (selos === 0 && pontos === 0) {
    return NextResponse.json(
      { erro: "um prêmio precisa custar carimbos, pontos, ou os dois — de graça não pode" },
      { status: 400 },
    );
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    // A peça prometida precisa ser desta loja: prometer a peça da vizinha
    // seria entregar um desconto que não é da loja para dar.
    if (pecaId) {
      const { data: peca } = await admin.from("pieces").select("id, program_id").eq("id", pecaId).maybeSingle();
      const { data: programa } = peca
        ? await admin.from("discount_programs").select("establishment_id").eq("id", peca.program_id).maybeSingle()
        : { data: null };

      if (!peca || programa?.establishment_id !== loja.id) {
        return NextResponse.json({ erro: "peça não encontrada nesta loja" }, { status: 404 });
      }
    }

    const { data: reward, error } = await admin
      .from("rewards")
      .insert({
        establishment_id: loja.id,
        title: titulo,
        description: descricao || null,
        stamp_cost: selos,
        point_cost: pontos,
        point_type_id: PONTO_DA_CIDADE,
        piece_id: pecaId,
        active: true,
      })
      .select(COLUNAS)
      .single();

    if (error || !reward) return NextResponse.json({ erro: "não foi possível salvar o prêmio" }, { status: 500 });

    return NextResponse.json({ ok: true, recompensa: mapearRecompensa(reward) });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[recompensas] falha ao criar o prêmio:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao criar o prêmio" }, { status: 500 });
  }
}
