import { type NextRequest, NextResponse } from "next/server";
import { redeConfigurada, reivindicarConquista } from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { erroDoContrato } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * O cliente recebe a conquista que mereceu.
 *
 * Esta rota pode ser aberta a qualquer pessoa logada sem medo, e isso é
 * deliberado: quem decide se a conquista foi merecida é o contrato, lendo o
 * StampLedger no momento da entrega. Não existe argumento que este endpoint
 * possa mandar que faça alguém ganhar o que não cumpriu.
 *
 * A espera acontece aqui, não no balcão. É o ponto do modelo: o brinde indireto
 * e a conquista não entram na mesma transação da venda porque seriam mais
 * quinze segundos com o caixa parado e a fila esperando. Aqui o cliente está no
 * sofá.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  if (!redeConfigurada()) return NextResponse.json({ erro: "a rede não está configurada aqui" }, { status: 503 });

  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: perfil } = await admin.from("profiles").select("wallet_address").eq("id", userId).maybeSingle();
  const carteira = perfil?.wallet_address?.toLowerCase() as `0x${string}` | undefined;
  if (!carteira) return NextResponse.json({ erro: "sua conta ainda não tem carteira" }, { status: 409 });

  const { data: conquista } = await admin
    .from("achievements")
    .select("id, onchain_id, title, active")
    .eq("id", id)
    .maybeSingle();

  if (!conquista || conquista.onchain_id === null) {
    return NextResponse.json({ erro: "conquista não encontrada" }, { status: 404 });
  }
  if (!conquista.active) return NextResponse.json({ erro: "esta conquista não está mais valendo" }, { status: 409 });

  // A referência é determinística: o mesmo cliente na mesma conquista chega
  // sempre no mesmo `bytes32`, e é isso que faz o `usedClaimRef` do contrato
  // barrar o toque duplo e o reenvio depois de uma queda de rede.
  const claimRef = `conquista:${conquista.id}:${carteira}`;

  // Grava a intenção ANTES de enviar: se a função morrer no meio da espera, a
  // linha fica aqui contando que houve tentativa, com a mesma referência.
  await admin.from("achievement_claims").upsert(
    {
      achievement_id: conquista.id,
      claim_ref: claimRef,
      customer_profile_id: userId,
      customer_wallet: carteira,
      status: "enviada" as const,
    },
    { onConflict: "claim_ref" },
  );

  try {
    const { hash, seloTokenId, pecaTokenId } = await reivindicarConquista(conquista.onchain_id, carteira, claimRef);

    await admin
      .from("achievement_claims")
      .update({
        status: "confirmada",
        tx_hash: hash,
        badge_token_id: seloTokenId || null,
        piece_onchain_id: pecaTokenId || null,
        confirmed_at: new Date().toISOString(),
        erro: null,
      })
      .eq("claim_ref", claimRef);

    // O contador do painel do lojista sai das reivindicações confirmadas aqui;
    // o número que manda continua sendo o `winners` do contrato.
    await admin
      .from("achievements")
      .update({ winners: await contarConquistadores(conquista.id) })
      .eq("id", conquista.id);

    return NextResponse.json({ ok: true, hash, selo: seloTokenId || null, peca: pecaTokenId || null });
  } catch (e) {
    const mensagem = mensagemDaConquista(e);
    await admin.from("achievement_claims").update({ status: "falhou", erro: mensagem }).eq("claim_ref", claimRef);
    console.error("[conquista] falha ao entregar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: mensagem }, { status: 409 });
  }
}

const contarConquistadores = async (achievementId: string) => {
  const { count } = await supabaseAdmin()
    .from("achievement_claims")
    .select("id", { count: "exact", head: true })
    .eq("achievement_id", achievementId)
    .eq("status", "confirmada");
  return count ?? 0;
};

const mensagemDaConquista = (e: unknown) => {
  const contrato = erroDoContrato(e);
  switch (contrato?.nome) {
    case "CriterionNotMet": {
      const alcancado = Number(contrato.args?.[0] ?? 0);
      const alvo = Number(contrato.args?.[1] ?? 0);
      return `ainda falta um pouco: você tem ${alcancado} de ${alvo}`;
    }
    case "AlreadyClaimed":
      return "você já recebeu esta conquista";
    case "ClaimAlreadyProcessed":
      return "esta conquista já foi entregue";
    case "NoWinnersLeft":
      return "as vagas desta conquista acabaram";
    case "AchievementEnded":
      return "o prazo desta conquista terminou";
    case "AchievementNotStarted":
      return "esta conquista ainda não começou";
    case "AchievementInactive":
      return "esta conquista não está mais valendo";
    default:
      return "não foi possível entregar a conquista agora — tente de novo em instantes";
  }
};
