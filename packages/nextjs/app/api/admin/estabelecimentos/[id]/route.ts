import { type NextRequest, NextResponse } from "next/server";
import { parseEventLogs } from "viem";
import { keccak256, toHex } from "viem";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import type { TablesUpdate } from "~~/services/database/types";
import { ABI_ASSINATURA_ESCRITA, ABI_REGISTRO } from "~~/services/relayer/abi";
import { clientePublico, escreverComoAdmin, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/** Endereço usado quando a loja ainda não tem dono com carteira. */
const SEM_DONO = "0x0000000000000000000000000000000000000000";

/**
 * As decisões da equipe sobre uma loja: aprovar, registrar na cadeia, ajustar
 * o limite de terminais e renovar a assinatura à mão.
 *
 * A renovação manual existe desde o primeiro dia e continua existindo depois
 * que o gateway de cobrança entrar: piloto, loja em teste e caso de suporte
 * precisam de uma saída que não passe por cartão de crédito.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: loja } = await admin
    .from("establishments")
    .select("id, name, slug, status, onchain_id, pos_limit, owner_profile_id")
    .eq("id", id)
    .maybeSingle();

  if (!loja) return NextResponse.json({ erro: "loja não encontrada" }, { status: 404 });

  const mudancas: TablesUpdate<"establishments"> = {};

  if (typeof corpo.status === "string") {
    if (!["rascunho", "pendente", "ativo", "suspenso"].includes(corpo.status)) {
      return NextResponse.json({ erro: "status inválido" }, { status: 400 });
    }
    mudancas.status = corpo.status as TablesUpdate<"establishments">["status"];
  }

  if (corpo.limiteDePdv !== undefined) {
    const limite = Number(corpo.limiteDePdv);
    if (!Number.isInteger(limite) || limite < 1 || limite > 200) {
      return NextResponse.json({ erro: "o limite de terminais precisa estar entre 1 e 200" }, { status: 400 });
    }
    mudancas.pos_limit = limite;
  }

  let onchainId = loja.onchain_id;
  let tx: string | undefined;

  // Registrar na cadeia é irreversível e custa gás: só acontece quando pedido
  // explicitamente, e nunca duas vezes para a mesma loja.
  if (corpo.registrarNaRede === true && onchainId === null) {
    if (!relayerConfigurado()) {
      return NextResponse.json({ erro: "a plataforma não consegue escrever na rede agora" }, { status: 503 });
    }

    const { data: dono } = loja.owner_profile_id
      ? await admin.from("profiles").select("wallet_address").eq("id", loja.owner_profile_id).maybeSingle()
      : { data: null };

    const hash = await escreverComoAdmin("EstablishmentRegistry", ABI_REGISTRO, "registerEstablishment", [
      (dono?.wallet_address ?? SEM_DONO) as `0x${string}`,
      keccak256(toHex(loja.slug)),
    ]);

    const recibo = await clientePublico().waitForTransactionReceipt({ hash: hash as `0x${string}` });
    const [evento] = parseEventLogs({ abi: ABI_REGISTRO, eventName: "EstablishmentRegistered", logs: recibo.logs });

    if (!evento) return NextResponse.json({ erro: "a rede não confirmou o registro" }, { status: 502 });

    onchainId = Number(evento.args.id);
    mudancas.onchain_id = onchainId;
    mudancas.onchain_tx_hash = hash;
    tx = hash;
  }

  if (corpo.assinaturaAteEm !== undefined && onchainId !== null) {
    const ate = Number(corpo.assinaturaAteEm);
    const plano = Number(corpo.plano ?? 1);
    if (!Number.isInteger(ate) || ate < 0 || !Number.isInteger(plano) || plano < 0 || plano > 255) {
      return NextResponse.json({ erro: "assinatura inválida" }, { status: 400 });
    }
    tx = await escreverComoAdmin("SubscriptionManager", ABI_ASSINATURA_ESCRITA, "setSubscription", [
      BigInt(onchainId),
      plano,
      BigInt(ate),
      keccak256(toHex(`manual:${loja.slug}:${ate}`)),
    ]);
  }

  if (Object.keys(mudancas).length > 0) {
    mudancas.updated_at = new Date().toISOString();
    const { error } = await admin.from("establishments").update(mudancas).eq("id", id);
    if (error) return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, onchainId, tx });
}
