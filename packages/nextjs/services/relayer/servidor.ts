import { ABI_LEDGER } from "./abi";
import "server-only";
import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  parseEventLogs,
  stringToHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, foundry } from "viem/chains";
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

const REDES = { [foundry.id]: foundry, [baseSepolia.id]: baseSepolia, [base.id]: base } as const;

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

export const clienteRelayer = () =>
  createWalletClient({
    account: privateKeyToAccount(chaveDoRelayer()),
    chain: REDES[idDaRede()],
    transport: transporte(),
  });

export const enderecoDoRelayer = () => privateKeyToAccount(chaveDoRelayer()).address;

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
    hash = await carteira.writeContract(request);
  } else {
    const { request } = await publico.simulateContract({
      account: carteira.account,
      address: endereco,
      abi: ABI_LEDGER,
      functionName: "issueStamps",
      args: [vendas[0]],
    });
    hash = await carteira.writeContract(request);
  }
  const recibo = await publico.waitForTransactionReceipt({ hash, confirmations: 1 });
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
