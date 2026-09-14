import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDePdv, balcaoDoOperador, carimbosDaVenda } from "~~/services/pdv/emitir";

export const runtime = "nodejs";

/**
 * Quantos carimbos esta venda daria — o número que o atendente lê em voz alta
 * antes de confirmar. Não grava nada e não queima passe nenhum.
 *
 * A conta é a mesma de `processarVendas`, e vem do mesmo lugar de propósito:
 * uma prévia que dissesse um número e a venda creditasse outro seria pior do
 * que não ter prévia.
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
    const boostBps = corpo.boostBps === undefined ? undefined : Number(corpo.boostBps);

    return NextResponse.json({ carimbos: carimbosDaVenda(boostBps), loja: balcao.nome });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ carimbos: null });
  }
}
