import { ABI_ASSINATURA, ABI_CATALOGO, ABI_LEDGER, ABI_PONTOS, ABI_REGRA } from "./abi";
import "server-only";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  nonceManager,
  parseEventLogs,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, foundry, sepolia } from "viem/chains";
import deployedContracts from "~~/contracts/deployedContracts";

/**
 * O relayer: a conta que paga o gás por todo mundo.
 *
 * O cliente nunca assina nada no balcão — seria insuportável pedir assinatura
 * de carteira a alguém de pé na fila do café. Quem envia a transação é esta
 * conta, e o contrato é que decide se o carimbo vale: teto de carimbos por
 * venda, piso de ticket, cooldown e assinatura ativa. Perder esta chave custa
 * gás, não custa a integridade do programa.
 *
 * `server-only` no topo: a chave privada jamais pode encostar num bundle de
 * navegador.
 */

const REDES = {
  [foundry.id]: foundry,
  [sepolia.id]: sepolia,
  [baseSepolia.id]: baseSepolia,
  [base.id]: base,
} as const;

/**
 * Quanto esperamos o recibo antes de desistir.
 *
 * O padrão do viem é 180 segundos — três vezes o teto de uma função da Vercel.
 * Estourado o teto, o processo morre no meio da espera e a venda fica pendurada
 * em `enviada` mesmo tendo entrado na rede. Melhor desistir antes, com a
 * transação já no ar e o hash em mãos, e deixar a fila reenviar.
 *
 * Na Sepolia o bloco fecha a cada ~12s, então 45s são três ou quatro blocos.
 */
const ESPERA_DO_RECIBO_MS = 45_000;

type IdDeRede = keyof typeof REDES;
type NomeDeContrato = keyof (typeof deployedContracts)[31337];

const idDaRede = (): IdDeRede => {
  const bruto = Number(process.env.CHORINHO_CHAIN_ID ?? foundry.id);
  if (!(bruto in REDES)) {
    throw new Error(`CHORINHO_CHAIN_ID=${bruto} não é uma rede conhecida (${Object.keys(REDES).join(", ")}).`);
  }
  return bruto as IdDeRede;
};

export const relayerConfigurado = () => Boolean(process.env.RELAYER_PRIVATE_KEY);

const chaveDoRelayer = () => {
  const chave = process.env.RELAYER_PRIVATE_KEY;
  if (!chave) throw new Error("RELAYER_PRIVATE_KEY ausente: o PDV não consegue enviar carimbos para a rede.");
  return (chave.startsWith("0x") ? chave : `0x${chave}`) as `0x${string}`;
};

const transporte = () => {
  const url = process.env.CHORINHO_RPC_URL;
  return url ? http(url) : http();
};

/** Onde o contrato mora na rede configurada. */
export const enderecoDoContrato = (nome: NomeDeContrato) => {
  const id = idDaRede();
  const rede = (deployedContracts as Record<number, Record<string, { address: string }>>)[id];
  const achado = rede?.[nome];
  if (!achado) {
    throw new Error(`${nome} não está implantado na rede ${id}. Rode \`bun deploy\` antes de usar o PDV.`);
  }
  return achado.address as `0x${string}`;
};

export const clientePublico = () => createPublicClient({ chain: REDES[idDaRede()], transport: transporte() });

/**
 * Duas vendas confirmadas ao mesmo tempo pegavam o mesmo nonce.
 *
 * Sem gerente de nonce cada envio pergunta à rede qual é o próximo, e dois
 * terminais confirmando no mesmo segundo recebem a mesma resposta: a segunda
 * transação volta como *replacement transaction underpriced*. No anvil isso
 * nunca apareceu porque o bloco fecha instantâneo e a primeira já estava
 * minerada antes de a segunda perguntar.
 *
 * O gerente é o padrão do viem, guardado num módulo: o estado é por endereço e
 * por rede, então sobrevive a estas funções criarem uma conta nova a cada
 * chamada. Serializa dentro de um processo — duas instâncias na Vercel ainda
 * podem colidir, e para isso existe a fila offline.
 */
export const clienteRelayer = () =>
  createWalletClient({
    account: privateKeyToAccount(chaveDoRelayer(), { nonceManager }),
    chain: REDES[idDaRede()],
    transport: transporte(),
  });

export const enderecoDoRelayer = () => privateKeyToAccount(chaveDoRelayer()).address;

/**
 * Envia, e devolve o nonce ao gerente se o envio falhar.
 *
 * O gerente incrementa ANTES de saber se a transação foi aceita. Se o envio
 * quebra — RPC fora do ar, saldo insuficiente — o contador local fica um à
 * frente da rede, e daí em diante todo envio nasce com um buraco no nonce e
 * fica preso na mempool sem nunca ser minerado. O `reset` faz o gerente
 * esquecer o que achava e voltar a perguntar à rede.
 */
const enviar = async (
  carteira: ReturnType<typeof clienteRelayer> | ReturnType<typeof clienteAdmin>,
  request: Parameters<typeof carteira.writeContract>[0],
) => {
  try {
    return await carteira.writeContract(request as never);
  } catch (e) {
    nonceManager.reset({ address: carteira.account.address, chainId: idDaRede() });
    throw e;
  }
};

/**
 * A conta administradora da plataforma.
 *
 * Regra de acúmulo, registro de loja e tipo de ponto são escritas que o
 * contrato só aceita do dono do estabelecimento ou do admin. O lojista não
 * assina nada — ele nem sabe que existe uma carteira. Então quem escreve é a
 * plataforma, depois de conferir no Supabase que aquela conta de fato
 * administra aquela loja.
 *
 * Em rede local a chave é a mesma do relayer (a conta que fez o deploy). Em
 * produção `CHORINHO_ADMIN_PRIVATE_KEY` aponta para uma chave separada, com
 * custódia diferente: quem paga gás e quem muda regra não precisam ser a mesma
 * pessoa, e não devem.
 */
const chaveDeAdmin = () => {
  const chave = process.env.CHORINHO_ADMIN_PRIVATE_KEY ?? process.env.RELAYER_PRIVATE_KEY;
  if (!chave) throw new Error("CHORINHO_ADMIN_PRIVATE_KEY ausente: a plataforma não consegue escrever na rede.");
  return (chave.startsWith("0x") ? chave : `0x${chave}`) as `0x${string}`;
};

export const clienteAdmin = () =>
  createWalletClient({
    account: privateKeyToAccount(chaveDeAdmin(), { nonceManager }),
    chain: REDES[idDaRede()],
    transport: transporte(),
  });

/**
 * Escreve na rede como a plataforma, simulando antes.
 *
 * Genérico de propósito: cada tela de configuração do painel precisa de uma
 * função diferente do contrato, e repetir simulate/write/waitForReceipt em
 * cada uma seria repetir também o esquecimento de esperar o recibo.
 */
export const escreverComoAdmin = async (
  contrato: NomeDeContrato,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[],
) => {
  const publico = clientePublico();
  const carteira = clienteAdmin();

  const { request } = await publico.simulateContract({
    account: carteira.account,
    address: enderecoDoContrato(contrato),
    abi,
    functionName,
    args,
  } as never);

  const hash = await enviar(carteira, request as never);
  const recibo = await publico.waitForTransactionReceipt({ hash, confirmations: 1, timeout: ESPERA_DO_RECIBO_MS });
  if (recibo.status !== "success") throw new Error("a transação reverteu na rede");
  return hash;
};

/**
 * A referência da venda dentro do contrato.
 *
 * É o `sale_ref` do banco passado por keccak256 — determinístico de propósito:
 * o PDV offline reenvia a mesma venda e chega exatamente no mesmo `bytes32`,
 * que é o que faz o `usedSaleRef` do contrato barrar a duplicata.
 */
export const refDaVenda = (saleRef: string) => keccak256(stringToHex(saleRef));

export type VendaOnchain = {
  establishmentId: bigint;
  customer: `0x${string}`;
  amountCents: bigint;
  productBoostBps: number;
  saleRef: `0x${string}`;
};

export type CarimbosEmitidos = {
  carteira: string;
  carimbos: number;
  pontos: number;
  saldo: number;
  sequencia: number;
};

/**
 * Envia as vendas para a rede e devolve o que o contrato de fato creditou.
 *
 * Simula antes de enviar: assim uma regra violada — ticket abaixo do piso,
 * assinatura vencida — volta como erro legível em vez de virar transação
 * revertida com gás gasto e nenhuma explicação.
 */
export const emitirCarimbos = async (vendas: VendaOnchain[]) => {
  if (vendas.length === 0) throw new Error("nenhuma venda para emitir");

  const endereco = enderecoDoContrato("StampLedger");
  const publico = clientePublico();
  const carteira = clienteRelayer();

  // O lote e a venda avulsa entram em ramos separados porque a assinatura da
  // requisicao muda com a funcao: unir os dois num ternario faz o tipo do
  // `request` virar uma uniao que o `writeContract` recusa.
  let hash: `0x${string}`;
  if (vendas.length > 1) {
    const { request } = await publico.simulateContract({
      account: carteira.account,
      address: endereco,
      abi: ABI_LEDGER,
      functionName: "issueStampsBatch",
      args: [vendas],
    });
    hash = await enviar(carteira, request);
  } else {
    const { request } = await publico.simulateContract({
      account: carteira.account,
      address: endereco,
      abi: ABI_LEDGER,
      functionName: "issueStamps",
      args: [vendas[0]],
    });
    hash = await enviar(carteira, request);
  }
  const recibo = await publico.waitForTransactionReceipt({ hash, confirmations: 1, timeout: ESPERA_DO_RECIBO_MS });
  if (recibo.status !== "success") throw new Error("a transação reverteu na rede");

  // O que valeu foi o que o contrato gravou, não o que o PDV calculou: lemos o
  // evento em vez de confiar na previsão feita antes do envio.
  const eventos = parseEventLogs({ abi: ABI_LEDGER, eventName: "StampsIssued", logs: recibo.logs });

  // Indexado por `saleRef`, nao por carteira: no lote da fila offline o mesmo
  // cliente costuma aparecer em duas ou tres vendas, e chavear por carteira
  // faria a ultima sobrescrever as anteriores -- todas as vendas do cliente
  // acabariam gravadas com o numero de carimbos da ultima.
  const porVenda = new Map<string, CarimbosEmitidos>();
  for (const evento of eventos) {
    porVenda.set(evento.args.saleRef.toLowerCase(), {
      carteira: evento.args.customer.toLowerCase(),
      carimbos: Number(evento.args.stamps),
      pontos: Number(evento.args.points),
      saldo: Number(evento.args.newBalance),
      sequencia: Number(evento.args.streakCurrent),
    });
  }

  return { hash, porVenda };
};

/** Quantos carimbos a venda geraria — o número que o atendente vê antes de confirmar. */
export const preverCarimbos = async (establishmentId: bigint, amountCents: bigint, boostBps: number) => {
  const previsto = await clientePublico().readContract({
    address: enderecoDoContrato("StampLedger"),
    abi: ABI_LEDGER,
    functionName: "previewStamps",
    args: [establishmentId, amountCents, boostBps],
  });
  return Number(previsto);
};

/** O estado da cartela do cliente naquela loja, direto da rede. */
export const lerCartela = async (establishmentId: bigint, carteira: `0x${string}`) => {
  const [saldo, total, , sequencia, melhorSequencia, visitas, ultimaVisita] = await clientePublico().readContract({
    address: enderecoDoContrato("StampLedger"),
    abi: ABI_LEDGER,
    functionName: "walletOf",
    args: [establishmentId, carteira],
  });

  return {
    saldo: Number(saldo),
    total: Number(total),
    sequencia,
    melhorSequencia,
    visitas,
    ultimaVisita: Number(ultimaVisita),
  };
};

/**
 * O nome do erro que o contrato lancou, quando houve um.
 *
 * Comparar pedaco de texto da mensagem funcionava ate alguem renomear um erro
 * no contrato — e aí o balcao passaria a mostrar a mensagem generica sem que
 * nenhum teste reclamasse. Aqui a leitura e estruturada.
 */
export const erroDoContrato = (e: unknown) => {
  if (!(e instanceof BaseError)) return undefined;
  const revert = e.walk(err => err instanceof ContractFunctionRevertedError);
  if (!(revert instanceof ContractFunctionRevertedError)) return undefined;
  return { nome: revert.data?.errorName, args: revert.data?.args as readonly unknown[] | undefined };
};

/** Saldo de uma classe de ponto da rede — o "ponto da cidade" é o id 1. */
export const lerPontos = async (carteira: `0x${string}`, tipo = 1n) => {
  const saldo = await clientePublico().readContract({
    address: enderecoDoContrato("PointsVault"),
    abi: ABI_PONTOS,
    functionName: "balanceOf",
    args: [carteira, tipo],
  });
  return Number(saldo);
};

/**
 * Entrega a recompensa: queima o que ela custa e registra na rede.
 *
 * Quem envia é o relayer, que tem RELAYER_ROLE — o contrato aceita relayer ou
 * operador da loja. O cliente não assina nada: ele está no balcão recebendo o
 * produto na mão.
 */
export const resgatarRecompensa = async (rewardId: bigint, cliente: `0x${string}`, claimRef: `0x${string}`) => {
  const endereco = enderecoDoContrato("RewardCatalog");
  const publico = clientePublico();
  const carteira = clienteRelayer();

  const { request } = await publico.simulateContract({
    account: carteira.account,
    address: endereco,
    abi: ABI_CATALOGO,
    functionName: "claim",
    args: [rewardId, cliente, claimRef],
  });

  const hash = await enviar(carteira, request);
  const recibo = await publico.waitForTransactionReceipt({ hash, confirmations: 1, timeout: ESPERA_DO_RECIBO_MS });
  if (recibo.status !== "success") throw new Error("a transação reverteu na rede");

  const [evento] = parseEventLogs({ abi: ABI_CATALOGO, eventName: "RewardClaimed", logs: recibo.logs });

  return {
    hash,
    selos: Number(evento?.args.stampCost ?? 0n),
    pontos: Number(evento?.args.pointCost ?? 0n),
  };
};

/** Se o cliente consegue resgatar agora — o que o balcão consulta antes de oferecer o botão. */
export const podeResgatar = async (rewardId: bigint, cliente: `0x${string}`) =>
  clientePublico().readContract({
    address: enderecoDoContrato("RewardCatalog"),
    abi: ABI_CATALOGO,
    functionName: "canClaim",
    args: [rewardId, cliente],
  });

/** A assinatura da loja, direto da cadeia — a fonte da verdade da cobrança. */
export const lerAssinatura = async (establishmentId: bigint) => {
  const publico = clientePublico();
  const endereco = enderecoDoContrato("SubscriptionManager");

  const [ativa, plano, vence] = await Promise.all([
    publico.readContract({ address: endereco, abi: ABI_ASSINATURA, functionName: "isActive", args: [establishmentId] }),
    publico.readContract({ address: endereco, abi: ABI_ASSINATURA, functionName: "tierOf", args: [establishmentId] }),
    publico.readContract({
      address: endereco,
      abi: ABI_ASSINATURA,
      functionName: "expiresAt",
      args: [establishmentId],
    }),
  ]);

  return { ativa, plano, venceEm: Number(vence) };
};

/** A regra de acúmulo que o balcão aplica. */
export const lerRegra = async (establishmentId: bigint) => {
  const [minTicketCents, centsPerStamp, maxStampsPerTx, cooldownSeconds, streakWindowSeconds, pointsPerStamp, , ativa] =
    await clientePublico().readContract({
      address: enderecoDoContrato("StampLedger"),
      abi: ABI_REGRA,
      functionName: "rules",
      args: [establishmentId],
    });

  return {
    ativa,
    pisoDeTicketCentavos: Number(minTicketCents),
    centavosPorCarimbo: Number(centsPerStamp),
    tetoPorVenda: maxStampsPerTx,
    intervaloSegundos: cooldownSeconds,
    janelaDaSequenciaSegundos: streakWindowSeconds,
    pontosPorCarimbo: pointsPerStamp,
  };
};
