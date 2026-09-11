import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { lerAtendimento } from "~~/services/passe/atendimento";
import { ErroDePdv, balcaoDoOperador } from "~~/services/pdv/emitir";
import { erroDoContrato, refDaVenda, relayerConfigurado, resgatarRecompensa } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/**
 * Entrega o prêmio: queima o que ele custa e registra na rede.
 *
 * O `claimRef` vem do aparelho e é único por entrega — é ele que impede que um
 * toque duplo no botão, ou um reenvio depois de queda de rede, cobre duas
 * vezes do cliente. A defesa final é o `usedClaimRef` do contrato.
 */
export async function POST(request: NextRequest) {
  if (!relayerConfigurado()) {
    return NextResponse.json({ erro: "RELAYER_PRIVATE_KEY não configurada" }, { status: 503 });
  }

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  let corpo: { atendimento?: unknown; recompensa?: unknown; claimRef?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const claimRef = String(corpo.claimRef ?? "").trim();
  if (claimRef.length < 8 || claimRef.length > 64) {
    return NextResponse.json({ erro: "referência de entrega inválida" }, { status: 400 });
  }

  const atendimento = typeof corpo.atendimento === "string" ? lerAtendimento(corpo.atendimento) : undefined;
  if (!atendimento) {
    return NextResponse.json({ erro: "o atendimento expirou — leia o passe do cliente de novo" }, { status: 410 });
  }

  try {
    const balcao = await balcaoDoOperador(userId);

    // O atendimento foi aberto por ESTE balcão. Sem esta conferência, o token
    // de um comércio serviria para queimar carimbos no outro.
    if (atendimento.balcaoId !== balcao.id) {
      return NextResponse.json({ erro: "este atendimento não é deste balcão" }, { status: 403 });
    }

    const admin = supabaseAdmin();

    const { data: recompensa } = await admin
      .from("rewards")
      .select("id, onchain_id, title, stamp_cost, point_cost, active, max_redemptions, redeemed")
      .eq("establishment_id", balcao.id)
      .eq("onchain_id", Number(corpo.recompensa))
      .maybeSingle();

    if (!recompensa || !recompensa.active || recompensa.onchain_id === null) {
      return NextResponse.json({ erro: "prêmio não encontrado nesta loja" }, { status: 404 });
    }

    const { data: jaFeito } = await admin
      .from("redemptions")
      .select("status, tx_hash")
      .eq("claim_ref", claimRef)
      .maybeSingle();

    if (jaFeito?.status === "confirmada") {
      return NextResponse.json({ ok: true, duplicada: true, titulo: recompensa.title, tx: jaFeito.tx_hash });
    }

    if (!jaFeito) {
      const { error } = await admin.from("redemptions").insert({
        claim_ref: claimRef,
        reward_id: recompensa.id,
        establishment_id: balcao.id,
        customer_wallet: atendimento.carteira,
        operator_profile_id: userId ?? null,
        pos_terminal_id: balcao.terminal?.id ?? null,
        status: "enviada",
      });
      if (error) return NextResponse.json({ erro: "não foi possível registrar a entrega" }, { status: 500 });
    }

    try {
      const { hash, selos, pontos } = await resgatarRecompensa(
        BigInt(recompensa.onchain_id),
        atendimento.carteira as `0x${string}`,
        refDaVenda(claimRef),
      );

      await Promise.all([
        admin
          .from("redemptions")
          .update({
            status: "confirmada",
            tx_hash: hash,
            stamps_burned: selos,
            points_burned: pontos,
            confirmed_at: new Date().toISOString(),
          })
          .eq("claim_ref", claimRef),
        admin
          .from("rewards")
          .update({ redeemed: recompensa.redeemed + 1, updated_at: new Date().toISOString() })
          .eq("id", recompensa.id),
      ]);

      return NextResponse.json({ ok: true, titulo: recompensa.title, selos, pontos, tx: hash });
    } catch (e) {
      const mensagem = mensagemDoResgate(e);
      await admin.from("redemptions").update({ status: "falhou", erro: mensagem }).eq("claim_ref", claimRef);
      return NextResponse.json({ erro: mensagem }, { status: 422 });
    }
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha inesperada na entrega" }, { status: 500 });
  }
}

/** Traduz o revert do contrato para algo que o atendente consiga agir. */
const mensagemDoResgate = (e: unknown) => {
  console.error("[pdv] falha ao entregar prêmio:", e instanceof Error ? e.message : e);

  switch (erroDoContrato(e)?.nome) {
    case "InsufficientStamps":
      return "o cliente não tem carimbos suficientes";
    case "RewardSoldOut":
      return "este prêmio esgotou";
    case "RewardInactive":
      return "este prêmio não está mais no ar";
    case "RewardEnded":
      return "a validade deste prêmio terminou";
    case "RewardNotStarted":
      return "este prêmio ainda não começou";
    case "ClaimAlreadyProcessed":
      return "esta entrega já tinha sido registrada";
    case "NotOperator":
      return "o relayer não tem permissão nesta loja";
    default:
      return "não foi possível entregar agora";
  }
};
