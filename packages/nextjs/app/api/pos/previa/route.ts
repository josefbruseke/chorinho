import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDePdv, VALOR_SIMBOLICO_CENTAVOS, balcaoDoOperador } from "~~/services/pdv/emitir";
import { preverCarimbos, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/**
 * Quantos carimbos esta venda daria — o número que o atendente lê em voz alta
 * antes de confirmar. Não grava nada e não queima passe nenhum.
 */
export async function POST(request: NextRequest) {
  // Sem sessão não é erro: o tablet do balcão opera pelo cookie do terminal
  // pareado. Quem decide se este pedido tem balcão é o `balcaoDoOperador`.
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  // O corpo virou opcional: sem valor de venda, a única coisa que ainda muda a
  // conta é o bônus de produto.
  let corpo: { boostBps?: unknown } = {};
  try {
    corpo = await request.json();
  } catch {
    // prévia sem corpo é o caso normal agora
  }

  try {
    const balcao = await balcaoDoOperador(userId);
    if (!relayerConfigurado()) return NextResponse.json({ carimbos: null, loja: balcao.nome });

    const carimbos = await preverCarimbos(
      BigInt(balcao.onchainId),
      BigInt(VALOR_SIMBOLICO_CENTAVOS),
      Number(corpo.boostBps ?? 10_000),
    );
    return NextResponse.json({ carimbos, loja: balcao.nome });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ carimbos: null });
  }
}
