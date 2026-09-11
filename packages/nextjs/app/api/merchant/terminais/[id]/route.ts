import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * Desliga um terminal.
 *
 * Tablet roubado, funcionário que saiu, aparelho que quebrou: o lojista precisa
 * conseguir cortar o acesso sozinho, na hora, sem abrir chamado. A revogação é
 * imediata — o próximo carimbo daquele aparelho já não passa.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    // O `eq` na loja é a autorização de verdade: sem ele, o id de um terminal
    // de outro comércio serviria para desligar o caixa do vizinho.
    const { data: revogado } = await admin
      .from("pos_terminals")
      .update({ revoked_at: new Date().toISOString(), token_hash: null, pairing_code: null })
      .eq("id", id)
      .eq("establishment_id", loja.id)
      .is("revoked_at", null)
      .select("id")
      .maybeSingle();

    if (!revogado) return NextResponse.json({ erro: "terminal não encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao remover terminal" }, { status: 500 });
  }
}
