import { NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { lerAssinatura, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/**
 * Os planos hoje — sem preço fechado, a cobrança ainda está em definição.
 *
 * `tier` é o mesmo número que o contrato `SubscriptionManager` grava
 * (0 = sem plano, ver `services/relayer/servidor.ts`), então o plano atual
 * lido da rede casa direto com um item desta lista.
 */
const PLANOS = [
  { tier: 1, nome: "Balcão", resumo: "Uma loja, começando agora.", recursos: ["1 loja", "2 terminais"] },
  {
    tier: 2,
    nome: "Bairro",
    resumo: "Quem quer aparecer mais para o bairro.",
    recursos: ["Destaque no mapa", "Peças colecionáveis", "Conquistas e selos"],
  },
  {
    tier: 3,
    nome: "Rede",
    resumo: "Mais de uma unidade, com visão de conjunto.",
    recursos: ["Multi-unidade", "Relatórios", "Tipo de ponto próprio"],
  },
] as const;

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/**
 * O estado da assinatura, lido direto da rede — é ela que o contrato usa
 * para decidir se o balcão ainda emite carimbo.
 */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);

    if (loja.onchainId === null || !relayerConfigurado()) {
      return NextResponse.json({
        loja: { nome: loja.nome },
        planos: PLANOS,
        assinatura: null,
        motivo: loja.onchainId === null ? "loja ainda não registrada na rede" : "a rede está indisponível agora",
      });
    }

    try {
      const assinatura = await lerAssinatura(BigInt(loja.onchainId));
      return NextResponse.json({ loja: { nome: loja.nome }, planos: PLANOS, assinatura, motivo: null });
    } catch {
      // RPC fora do ar: a tela mostra os planos e some com o estado da rede,
      // em vez de virar uma tela de erro inteira.
      return NextResponse.json({
        loja: { nome: loja.nome },
        planos: PLANOS,
        assinatura: null,
        motivo: "não foi possível consultar a rede agora",
      });
    }
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao ler a assinatura" }, { status: 500 });
  }
}
