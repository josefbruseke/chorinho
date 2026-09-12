/**
 * Põe na rede as lojas que existem no banco mas não na cadeia.
 *
 * Uma loja `ativo` no Supabase sem `onchain_id` aparece no mapa como se
 * funcionasse e é recusada no caixa — `emitir.ts` exige o id da cadeia. Este
 * script fecha essa distância para várias lojas de uma vez.
 *
 * São três escritas por loja, na ordem em que a cadeia exige:
 *
 *   1. registerEstablishment  — ganha o `onchain_id`
 *   2. setSubscription        — sem assinatura válida o contrato recusa carimbo
 *   3. setAccrualRule         — sem regra, toda venda vale zero carimbo
 *
 * As duas primeiras são o mesmo que o painel de admin faz em
 * `app/api/admin/estabelecimentos/[id]/route.ts`; a terceira é o que o lojista
 * faria em `/painel/regras`. Existe aqui porque `lojaDoGestor` devolve UMA loja
 * por pessoa: configurar nove regras pela interface exigiria nove contas.
 *
 *   bun scripts/habilitar-lojas.mjs           # mostra o que faria
 *   bun scripts/habilitar-lojas.mjs --aplica  # escreve na cadeia
 */
import deployedContracts from "../contracts/deployedContracts.js";
import { ABI_ASSINATURA_ESCRITA, ABI_REGISTRO, ABI_REGRA_ESCRITA } from "../services/relayer/abi.js";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { createPublicClient, createWalletClient, http, keccak256, nonceManager, parseEventLogs, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, foundry, sepolia } from "viem/chains";

const carregarEnv = caminho => {
  try {
    for (const linha of readFileSync(caminho, "utf8").split("\n")) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // arquivo ausente é normal
  }
};

const raiz = new URL("../../..", import.meta.url).pathname;
carregarEnv(`${raiz}/packages/nextjs/.env.local`);
carregarEnv(`${raiz}/.env`);

const aplica = process.argv.includes("--aplica");

/**
 * Reaplica só a regra nas lojas que já estão na cadeia.
 *
 * O modo normal procura quem está de fora; este serve para quando a REGRA
 * muda para todo mundo — como na virada do carimbo por valor para o carimbo
 * por visita. `setAccrualRule` é atribuição, então repetir é seguro.
 */
const soRegras = process.argv.includes("--so-regras");

const REDES = { [foundry.id]: foundry, [sepolia.id]: sepolia, [baseSepolia.id]: baseSepolia, [base.id]: base };
const idDaRede = Number(process.env.CHORINHO_CHAIN_ID ?? foundry.id);
const rede = REDES[idDaRede];
if (!rede) {
  console.error(`❌ CHORINHO_CHAIN_ID=${idDaRede} não é uma rede conhecida.`);
  process.exit(1);
}

const chave = process.env.CHORINHO_ADMIN_PRIVATE_KEY ?? process.env.RELAYER_PRIVATE_KEY;
if (!chave) {
  console.error("❌ RELAYER_PRIVATE_KEY ausente: sem ela não há como escrever na rede.");
  process.exit(1);
}

const endereco = nome => {
  const achado = deployedContracts[idDaRede]?.[nome];
  if (!achado) {
    console.error(`❌ ${nome} não está implantado na rede ${idDaRede}.`);
    process.exit(1);
  }
  return achado.address;
};

const transporte = () => {
  const urls = (process.env.CHORINHO_RPC_URL ?? "")
    .split(",")
    .map(u => u.trim())
    .filter(Boolean);
  return urls.length ? http(urls[0]) : http();
};

const publico = createPublicClient({ chain: rede, transport: transporte() });
const conta = privateKeyToAccount(chave.startsWith("0x") ? chave : `0x${chave}`, { nonceManager });
const carteira = createWalletClient({ account: conta, chain: rede, transport: transporte() });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

/** Escreve e espera o recibo. Sem a espera, a próxima loja disputa o nonce. */
const escrever = async (contrato, abi, functionName, args) => {
  const { request } = await publico.simulateContract({
    account: conta,
    address: endereco(contrato),
    abi,
    functionName,
    args,
  });
  const hash = await carteira.writeContract(request);
  const recibo = await publico.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 });
  if (recibo.status !== "success") throw new Error(`${functionName} reverteu na rede`);
  return recibo;
};

/**
 * A regra: passou no balcão, ganhou um carimbo.
 *
 * Os três primeiros campos existem porque a struct do contrato pede, não
 * porque alguém escolheu os números. A conta lá é
 * `amountCents / centsPerStamp`, limitada por `maxStampsPerTx` — com divisor 1
 * e teto 1, qualquer valor maior que zero rende exatamente um carimbo. Piso
 * zero completa: nenhuma venda é pequena demais.
 *
 * A carência é o que passou a segurar o abuso. Antes era o piso de ticket que
 * impedia o caixa de carimbar dez vezes seguidas; sem valor, sobra o relógio.
 * Quatro horas deixam passar café de manhã e padaria à tarde — duas visitas no
 * mesmo dia são reais — e barram a repetição no mesmo atendimento.
 */
const REGRA = {
  minTicketCents: 0n,
  centsPerStamp: 1n,
  maxStampsPerTx: 1,
  cooldownSeconds: 4 * 60 * 60,
  streakWindowSeconds: 7 * 24 * 60 * 60,
  pointsPerStamp: 1,
  pointTypeId: 1n,
  active: true,
};

const UM_ANO = 365 * 24 * 60 * 60;

const { data: lojas, error } = await supabase
  .from("establishments")
  .select("id, name, slug, status, onchain_id, owner_profile_id")
  .filter("onchain_id", soRegras ? "not.is" : "is", null)
  .order("name");

if (error) {
  console.error("❌ não consegui ler as lojas:", error.message);
  process.exit(1);
}

if (!lojas.length) {
  console.log(soRegras ? "Nenhuma loja na cadeia. Nada a fazer." : "Nenhuma loja fora da cadeia. Nada a fazer.");
  process.exit(0);
}

console.log(`\nRede ${idDaRede} · admin ${conta.address}`);
console.log(`${lojas.length} loja(s) ${soRegras ? "na cadeia — só a regra será reescrita" : "fora da cadeia"}:\n`);
for (const l of lojas) console.log(`  ${l.name}  (${l.slug}, status ${l.status})`);

if (!aplica) {
  console.log("\nSimulação. Rode com --aplica para escrever na rede.\n");
  process.exit(0);
}

/**
 * Quem já está na cadeia, por hash do slug.
 *
 * Sem isto, uma execução que morreu no meio registra tudo de novo: a loja
 * ganha um segundo id, o gás sai duas vezes e o primeiro registro vira um
 * órfão que ninguém mais encontra. O registro é a única das três escritas que
 * não é idempotente — `setSubscription` e `setAccrualRule` são atribuições.
 */
const jaNaCadeia = async () => {
  const mapa = new Map();
  const atual = await publico.getBlockNumber();
  const JANELA = 5000n;
  // Os contratos são de hoje; varrer a cadeia inteira faria o RPC público
  // recusar. Vinte mil blocos são uns três dias na Sepolia.
  let de = atual > 20000n ? atual - 20000n : 0n;

  while (de <= atual) {
    const ate = de + JANELA > atual ? atual : de + JANELA;
    const logs = await publico.getLogs({
      address: endereco("EstablishmentRegistry"),
      event: ABI_REGISTRO.find(x => x.type === "event" && x.name === "EstablishmentRegistered"),
      fromBlock: de,
      toBlock: ate,
    });
    for (const l of logs) mapa.set(l.args.metadataHash, Number(l.args.id));
    de = ate + 1n;
  }
  return mapa;
};

const ate = Math.floor(Date.now() / 1000) + UM_ANO;
let feitas = 0;

let registradas = new Map();
if (!soRegras) {
  process.stdout.write("\nprocurando quem já está na cadeia… ");
  registradas = await jaNaCadeia();
  process.stdout.write(`${registradas.size} encontrada(s)\n`);
}

for (const loja of lojas) {
  process.stdout.write(`\n${loja.name}\n`);
  try {
    const hash = keccak256(toHex(loja.slug));
    let onchainId = soRegras ? loja.onchain_id : registradas.get(hash);
    let txDoRegistro = null;

    if (onchainId) {
      process.stdout.write(`  registrando… já estava, id ${onchainId}\n`);
    } else {
      const { data: dono } = loja.owner_profile_id
        ? await supabase.from("profiles").select("wallet_address").eq("id", loja.owner_profile_id).maybeSingle()
        : { data: null };

      process.stdout.write("  registrando… ");
      const recibo = await escrever("EstablishmentRegistry", ABI_REGISTRO, "registerEstablishment", [
        dono?.wallet_address ?? "0x0000000000000000000000000000000000000000",
        hash,
      ]);
      const [evento] = parseEventLogs({ abi: ABI_REGISTRO, eventName: "EstablishmentRegistered", logs: recibo.logs });
      if (!evento) throw new Error("a rede não confirmou o registro");
      onchainId = Number(evento.args.id);
      txDoRegistro = recibo.transactionHash;
      process.stdout.write(`id ${onchainId}\n`);
    }

    // Grava AGORA, não no fim. A versão anterior esperava as três escritas, e
    // quando a regra falhava a loja ficava na cadeia sem o banco saber — a
    // execução seguinte a registrava outra vez.
    const { error: eId } = await supabase
      .from("establishments")
      .update({ onchain_id: onchainId, ...(txDoRegistro ? { onchain_tx_hash: txDoRegistro } : {}) })
      .eq("id", loja.id);
    if (eId) throw new Error(`na cadeia (id ${onchainId}) mas falhou ao gravar no banco: ${eId.message}`);

    if (!soRegras) {
      process.stdout.write("  assinatura…  ");
      await escrever("SubscriptionManager", ABI_ASSINATURA_ESCRITA, "setSubscription", [
        BigInt(onchainId),
        2,
        BigInt(ate),
        keccak256(toHex(`habilitar:${loja.slug}:${ate}`)),
      ]);
      process.stdout.write("ok\n");
    }

    process.stdout.write("  regra…       ");
    await escrever("StampLedger", ABI_REGRA_ESCRITA, "setAccrualRule", [BigInt(onchainId), REGRA]);
    process.stdout.write("ok\n");

    feitas++;
  } catch (e) {
    console.error(`  ❌ ${e instanceof Error ? e.message : e}`);
  }
}

console.log(`\n${feitas} de ${lojas.length} loja(s) habilitada(s).\n`);
