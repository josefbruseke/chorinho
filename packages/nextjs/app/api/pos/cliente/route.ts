import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { abrirAtendimento } from "~~/services/passe/atendimento";
import { ErroDePdv, JANELA_DA_FILA_SEGUNDOS, balcaoDoOperador, resolverCliente } from "~~/services/pdv/emitir";
import { lerPontos, relayerConfigurado } from "~~/services/relayer/servidor";
import { PASSE_VALIDADE_SEGUNDOS } from "~~/utils/pass";

export const runtime = "nodejs";

/**
 * Identifica o cliente no balcão e abre um atendimento.
 *
 * Usado na entrega de prêmio, onde o atendente precisa VER o que aquele
 * cliente pode levar antes de escolher. O passe é queimado aqui; o que segue
 * valendo por cinco minutos é o token de atendimento.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  let corpo: { qr?: unknown; codigo?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  try {
    const balcao = await balcaoDoOperador(userId);

    const cliente = await resolverCliente(
      {
        saleRef: "",
        qr: typeof corpo.qr === "string" ? corpo.qr : undefined,
        codigo: typeof corpo.codigo === "string" ? corpo.codigo : undefined,
        valorCentavos: 0,
      },
      // Aqui a janela é curta: o cliente está na frente do atendente agora.
      // A folga da fila offline não faz sentido numa entrega presencial.
      Math.min(JANELA_DA_FILA_SEGUNDOS, PASSE_VALIDADE_SEGUNDOS + 60),
    );

    const admin = supabaseAdmin();

    const [{ data: saldo }, { data: recompensas }] = await Promise.all([
      admin
        .from("stamp_balances_cache")
        .select("balance, streak_current")
        .eq("wallet", cliente.carteira)
        .eq("establishment_id", balcao.id)
        .maybeSingle(),
      admin
        .from("rewards")
        .select("onchain_id, title, stamp_cost, point_cost, max_redemptions, redeemed")
        .eq("establishment_id", balcao.id)
        .eq("active", true)
        .order("stamp_cost", { ascending: true }),
    ]);

    const carimbos = saldo?.balance ?? 0;
    // Prêmio pago em ponto da cidade não tem espelho no banco: o saldo só
    // existe na cadeia. Sem esta leitura o balcão ofereceria ao atendente um
    // botão que o contrato vai recusar na frente do cliente.
    const pontos = relayerConfigurado() ? await lerPontos(cliente.carteira as `0x${string}`).catch(() => 0) : 0;

    return NextResponse.json({
      cliente: { carteira: cliente.carteira, nome: cliente.nome },
      atendimento: abrirAtendimento(cliente.carteira, balcao.id),
      cartela: { saldo: carimbos, pontos, sequencia: saldo?.streak_current ?? 0 },
      recompensas: (recompensas ?? [])
        .filter(r => r.onchain_id !== null)
        .map(r => ({
          id: r.onchain_id,
          titulo: r.title,
          selos: r.stamp_cost,
          pontos: r.point_cost,
          esgotada: r.max_redemptions > 0 && r.redeemed >= r.max_redemptions,
          // O contrato confere de novo na entrega; isto é só para a tela saber
          // o que destacar.
          pronta: carimbos >= r.stamp_cost && pontos >= r.point_cost,
        })),
    });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao identificar o cliente" }, { status: 500 });
  }
}
