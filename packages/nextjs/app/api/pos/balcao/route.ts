import { NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDePdv, balcaoDoOperador } from "~~/services/pdv/emitir";

export const runtime = "nodejs";

/**
 * Qual balcão esta conta atende.
 *
 * O PDV pergunta isso ao abrir: o atendente precisa ver o nome da loja antes
 * de digitar qualquer coisa — é assim que ele percebe na hora que entrou com a
 * conta errada, em vez de descobrir depois de carimbar o cliente.
 */
export async function GET() {
  // Sem sessão não é erro: o tablet do balcão opera pelo cookie do terminal
  // pareado. Quem decide se este pedido tem balcão é o `balcaoDoOperador`.
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  try {
    const balcao = await balcaoDoOperador(userId);
    return NextResponse.json({
      id: balcao.id,
      nome: balcao.nome,
      onchainId: balcao.onchainId,
      terminal: balcao.terminal ? { id: balcao.terminal.id, nome: balcao.terminal.nome } : null,
    });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao identificar o balcão" }, { status: 500 });
  }
}
