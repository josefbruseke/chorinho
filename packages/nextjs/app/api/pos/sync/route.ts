import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDePdv, MAX_POR_LOTE, processarVendas } from "~~/services/pdv/emitir";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * Esvazia a fila do tablet que ficou sem internet.
 *
 * Manda tudo num lote só: é o que faz o gás por venda virar fração de centavo.
 * O veredito volta venda a venda para o PDV poder remover da fila só o que de
 * fato entrou — apagar a fila inteira porque "a requisição deu 200" é como se
 * perdem vendas de verdade.
 */
export async function POST(request: NextRequest) {
  // Sem sessão não é erro: o tablet do balcão opera pelo cookie do terminal
  // pareado. Quem decide se este pedido tem balcão é o `balcaoDoOperador`.
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  let corpo: { vendas?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (!Array.isArray(corpo.vendas)) {
    return NextResponse.json({ erro: "envie a lista de vendas" }, { status: 400 });
  }

  const vendas = corpo.vendas.slice(0, MAX_POR_LOTE).map((v: Record<string, unknown>) => ({
    saleRef: String(v?.saleRef ?? ""),
    qr: typeof v?.qr === "string" ? v.qr : undefined,
    codigo: typeof v?.codigo === "string" ? v.codigo : undefined,
    valorCentavos: Number(v?.valorCentavos),
    boostBps: v?.boostBps === undefined ? undefined : Number(v.boostBps),
  }));

  try {
    const { resultados } = await processarVendas(userId, vendas);
    return NextResponse.json({
      resultados,
      restantes: Math.max(0, corpo.vendas.length - vendas.length),
    });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha inesperada ao sincronizar" }, { status: 500 });
  }
}
