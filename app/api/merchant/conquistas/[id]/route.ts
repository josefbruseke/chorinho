import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * Liga e desliga uma conquista.
 *
 * Desligada, ninguém mais reivindica. Quem já conquistou fica com o selo: o
 * selo prova que aquela pessoa esteve lá, e isso não deixa de ser verdade
 * porque a loja mudou de campanha.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { id } = await params;
  let corpo: { ativa?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }
  if (typeof corpo.ativa !== "boolean") {
    return NextResponse.json({ erro: "informe se a conquista fica ativa" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: conquista } = await admin
      .from("achievements")
      .select("id, establishment_id")
      .eq("id", id)
      .maybeSingle();

    if (!conquista || conquista.establishment_id !== loja.id) {
      return NextResponse.json({ erro: "conquista não encontrada nesta loja" }, { status: 404 });
    }

    await admin.from("achievements").update({ active: corpo.ativa }).eq("id", id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao atualizar a conquista" }, { status: 500 });
  }
}
