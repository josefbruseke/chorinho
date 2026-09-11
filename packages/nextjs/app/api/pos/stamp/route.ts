import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDePdv, processarVendas } from "~~/services/pdv/emitir";
import { PASSE_VALIDADE_SEGUNDOS } from "~~/utils/pass";

export const runtime = "nodejs";

/**
 * Uma venda, agora, com o cliente na frente do atendente.
 *
 * A janela do passe aqui é curta de propósito — o cliente está com a tela na
 * mão, não há motivo para aceitar um passe de ontem. A folga de um minuto
 * cobre o relógio do tablet estar torto.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  try {
    const { balcao, resultados } = await processarVendas(
      userId,
      [
        {
          saleRef: String(corpo.saleRef ?? ""),
          qr: typeof corpo.qr === "string" ? corpo.qr : undefined,
          codigo: typeof corpo.codigo === "string" ? corpo.codigo : undefined,
          valorCentavos: Number(corpo.valorCentavos),
          boostBps: corpo.boostBps === undefined ? undefined : Number(corpo.boostBps),
        },
      ],
      { janelaSegundos: PASSE_VALIDADE_SEGUNDOS + 60 },
    );

    const resultado = resultados[0];
    if (!resultado) return NextResponse.json({ erro: "venda não processada" }, { status: 400 });

    return NextResponse.json({ ...resultado, loja: balcao.nome }, { status: resultado.ok ? 200 : 422 });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha inesperada no balcão" }, { status: 500 });
  }
}
