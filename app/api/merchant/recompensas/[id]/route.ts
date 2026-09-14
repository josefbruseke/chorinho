import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

const COLUNAS = "id, title, description, stamp_cost, point_cost, active, max_redemptions, redeemed";

type LinhaDeRecompensa = {
  id: string;
  title: string;
  description: string | null;
  stamp_cost: number;
  point_cost: number;
  active: boolean;
  max_redemptions: number;
  redeemed: number;
};

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
});

/**
 * Liga, desliga ou ajusta o teto de resgates de um prêmio.
 *
 * Desligar precisa valer na hora: o prêmio problemático some da vitrine antes
 * do próximo cliente pedir por ele.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { ativa?: unknown; maxResgates?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const temAtiva = typeof corpo.ativa === "boolean";
  const temMax = corpo.maxResgates !== undefined;
  if (!temAtiva && !temMax) {
    return NextResponse.json({ erro: "nada para atualizar" }, { status: 400 });
  }

  const maxResgates = Number(corpo.maxResgates);
  if (temMax && (!Number.isInteger(maxResgates) || maxResgates < 0)) {
    return NextResponse.json(
      { erro: "o limite de resgates precisa ser um número inteiro, zero ou mais" },
      { status: 400 },
    );
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    // O `eq` na loja é a autorização de verdade: sem ele, o id de um prêmio
    // de outro comércio serviria para mexer no prêmio do vizinho.
    const { data: atual } = await admin
      .from("rewards")
      .select("id, active, max_redemptions")
      .eq("id", id)
      .eq("establishment_id", loja.id)
      .maybeSingle();

    if (!atual) return NextResponse.json({ erro: "prêmio não encontrado" }, { status: 404 });

    const { data: atualizado, error } = await admin
      .from("rewards")
      .update({
        active: temAtiva ? Boolean(corpo.ativa) : atual.active,
        max_redemptions: temMax ? maxResgates : atual.max_redemptions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("establishment_id", loja.id)
      .select(COLUNAS)
      .single();

    if (error || !atualizado) {
      return NextResponse.json({ erro: "não foi possível atualizar o prêmio" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, recompensa: mapearRecompensa(atualizado) });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao atualizar o prêmio" }, { status: 500 });
  }
}
