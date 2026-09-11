import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { erroDoContrato, escreverComoAdmin, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * O pedaço do RewardCatalog que só esta rota usa: ligar, desligar e ajustar o
 * teto de resgates de um prêmio que já existe na rede.
 */
const ABI_CATALOGO_STATUS = [
  {
    type: "function",
    name: "setRewardActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rewardId", type: "uint256" },
      { name: "active", type: "bool" },
      { name: "maxRedemptions", type: "uint32" },
    ],
    outputs: [],
  },
  { type: "error", name: "UnknownReward", inputs: [] },
  { type: "error", name: "NotEstablishmentOwner", inputs: [] },
] as const;

const COLUNAS = "id, onchain_id, title, description, stamp_cost, point_cost, active, max_redemptions, redeemed";

type LinhaDeRecompensa = {
  id: string;
  onchain_id: number | null;
  title: string;
  description: string | null;
  stamp_cost: number;
  point_cost: number;
  active: boolean;
  max_redemptions: number;
  redeemed: number;
};

/** Do formato da tabela para o que a tela do lojista consome. */
const mapearRecompensa = (r: LinhaDeRecompensa) => ({
  id: r.id,
  onchainId: r.onchain_id,
  titulo: r.title,
  descricao: r.description,
  selos: r.stamp_cost,
  pontos: r.point_cost,
  ativa: r.active,
  maxResgates: r.max_redemptions,
  resgatados: r.redeemed,
  rascunho: r.onchain_id === null,
});

/**
 * Liga, desliga ou ajusta o teto de resgates de um prêmio.
 *
 * O Supabase é a fonte de verdade da tela mesmo quando a rede falha: o
 * lojista precisa conseguir desligar um prêmio problemático na hora, mesmo
 * que o RPC esteja fora do ar naquele instante — a rede é atualizada depois.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { ativa?: unknown; maxResgates?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const temAtiva = typeof corpo.ativa === "boolean";
  const temMax = corpo.maxResgates !== undefined;
  if (!temAtiva && !temMax) {
    return NextResponse.json({ erro: "nada para atualizar" }, { status: 400 });
  }

  const maxResgates = Number(corpo.maxResgates);
  if (temMax && (!Number.isInteger(maxResgates) || maxResgates < 0)) {
    return NextResponse.json(
      { erro: "o limite de resgates precisa ser um número inteiro, zero ou mais" },
      { status: 400 },
    );
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    // O `eq` na loja é a autorização de verdade: sem ele, o id de um prêmio
    // de outro comércio serviria para mexer no prêmio do vizinho.
    const { data: atual } = await admin
      .from("rewards")
      .select("id, onchain_id, active, max_redemptions")
      .eq("id", id)
      .eq("establishment_id", loja.id)
      .maybeSingle();

    if (!atual) return NextResponse.json({ erro: "prêmio não encontrado" }, { status: 404 });

    const novaAtiva = temAtiva ? Boolean(corpo.ativa) : atual.active;
    const novoMax = temMax ? maxResgates : atual.max_redemptions;

    const { data: atualizado, error } = await admin
      .from("rewards")
      .update({ active: novaAtiva, max_redemptions: novoMax, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("establishment_id", loja.id)
      .select(COLUNAS)
      .single();

    if (error || !atualizado) {
      return NextResponse.json({ erro: "não foi possível atualizar o prêmio" }, { status: 500 });
    }

    const aviso = atual.onchain_id !== null ? await refletirNaRede(atual.onchain_id, novaAtiva, novoMax) : undefined;

    return NextResponse.json({ ok: true, recompensa: mapearRecompensa(atualizado), aviso });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao atualizar o prêmio" }, { status: 500 });
  }
}

/**
 * Reflete ativa/desligada e o teto de resgates no contrato.
 *
 * Uma falha aqui não desfaz a gravação no Supabase — o lojista já conseguiu
 * desligar o prêmio problemático na tela dele, mesmo que a rede ainda não
 * tenha confirmado.
 */
const refletirNaRede = async (onchainId: number, ativa: boolean, maxResgates: number): Promise<string | undefined> => {
  if (!relayerConfigurado()) {
    return "o Supabase foi atualizado, mas a rede não está configurada neste ambiente.";
  }

  try {
    await escreverComoAdmin("RewardCatalog", ABI_CATALOGO_STATUS, "setRewardActive", [
      BigInt(onchainId),
      ativa,
      maxResgates,
    ]);
    return undefined;
  } catch (e) {
    console.error("[recompensas] falha ao atualizar o prêmio na rede:", e instanceof Error ? e.message : e);
    switch (erroDoContrato(e)?.nome) {
      case "UnknownReward":
        return "a rede não reconhece este prêmio — fale com o suporte.";
      case "NotEstablishmentOwner":
        return "a plataforma não tem permissão para gerenciar este prêmio na rede.";
      default:
        return "o Supabase foi atualizado, mas a rede não confirmou a mudança ainda.";
    }
  }
};
