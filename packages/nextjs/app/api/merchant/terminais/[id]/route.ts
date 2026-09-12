import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { VALIDADE_DO_PAREAMENTO_SEGUNDOS, gerarCodigoDePareamento } from "~~/services/pdv/acesso";

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

/**
 * Gera um código novo para um terminal que ainda não pareou.
 *
 * O código morre em trinta minutos, e é comum ele vencer entre criar o terminal
 * e chegar ao tablet com ele. Sem esta rota, a saída era apagar o terminal e
 * criar outro — o que gasta uma vaga do plano e apaga o nome que o lojista
 * escolheu, para resolver um relógio que virou.
 *
 * Só vale para terminal ainda não pareado. Um terminal em uso continua em uso:
 * trocar o código dele aqui não desliga nada, e quem quer desligar tem o botão
 * certo para isso.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const codigo = gerarCodigoDePareamento();

    // O `eq` na loja é a autorização, como no DELETE: sem ele o id do terminal
    // do vizinho serviria para gerar um código de acesso ao balcão dele.
    const { data: terminal } = await supabaseAdmin()
      .from("pos_terminals")
      .update({
        pairing_code: codigo,
        pairing_expires_at: new Date(Date.now() + VALIDADE_DO_PAREAMENTO_SEGUNDOS * 1000).toISOString(),
      })
      .eq("id", id)
      .eq("establishment_id", loja.id)
      .is("revoked_at", null)
      .is("paired_at", null)
      .select("id, name")
      .maybeSingle();

    if (!terminal) {
      return NextResponse.json({ erro: "terminal não encontrado ou já pareado" }, { status: 404 });
    }

    return NextResponse.json({ id: terminal.id, nome: terminal.name, codigo });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao gerar o código" }, { status: 500 });
  }
}
