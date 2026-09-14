import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { abrirAtendimento } from "~~/services/passe/atendimento";
import {
  ErroDePdv,
  JANELA_DA_FILA_SEGUNDOS,
  balcaoDoOperador,
  lerCartela,
  resolverCliente,
} from "~~/services/pdv/emitir";
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
      },
      // Aqui a janela é curta: o cliente está na frente do atendente agora.
      // A folga da fila offline não faz sentido numa entrega presencial.
      Math.min(JANELA_DA_FILA_SEGUNDOS, PASSE_VALIDADE_SEGUNDOS + 60),
    );

    const [cartela, { data: recompensas }] = await Promise.all([
      lerCartela(balcao.id, cliente.profileId),
      supabaseAdmin()
        .from("rewards")
        // M9: o antigo id de rede saiu do catálogo — o prêmio é identificado pelo id da
        // própria linha. Filtrar por registro na rede deixaria a lista vazia em
        // toda loja que cadastrou prêmio depois da amputação.
        .select("id, title, stamp_cost, point_cost, max_redemptions, redeemed")
        .eq("establishment_id", balcao.id)
        .eq("active", true)
        .order("stamp_cost", { ascending: true }),
    ]);

    // M9: ponto da cidade não tem mais onde ser contado. Vem zero em vez de
    // sumir do corpo porque a tela mostra quanto falta, e "faltam N pontos" é
    // uma resposta honesta — "este prêmio não existe" não seria.
    const pontos = 0;

    return NextResponse.json({
      cliente: { id: cliente.profileId, nome: cliente.nome },
      atendimento: abrirAtendimento(cliente.profileId, balcao.id),
      cartela: { saldo: cartela.saldo, pontos, sequencia: cartela.sequencia },
      recompensas: (recompensas ?? []).map(r => ({
        id: r.id,
        titulo: r.title,
        selos: r.stamp_cost,
        pontos: r.point_cost,
        esgotada: r.max_redemptions > 0 && r.redeemed >= r.max_redemptions,
        // A entrega confere de novo, contra a cartela do momento; isto é só
        // para a tela saber o que destacar.
        pronta: cartela.saldo >= r.stamp_cost && pontos >= r.point_cost,
      })),
    });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao identificar o cliente" }, { status: 500 });
  }
}
