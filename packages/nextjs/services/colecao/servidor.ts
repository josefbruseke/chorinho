import "server-only";
import { keccak256, parseEventLogs, stringToHex } from "viem";
import { ABI_CONQUISTA, ABI_PECA, ABI_PROGRAMA } from "~~/services/relayer/abi";
import {
  clientePublico,
  clienteRelayer,
  enderecoDoContrato,
  escreverComoAdmin,
  relayerConfigurado,
} from "~~/services/relayer/servidor";

/**
 * A camada de peças vista pelo servidor.
 *
 * Quem assina é sempre a plataforma, nunca o lojista: ele não tem carteira e
 * não deve ter. O contrato aceita o dono do estabelecimento OU o admin, e o
 * admin somos nós — então quem confere se aquela conta manda naquela loja é o
 * Route Handler, antes de chegar aqui. É o mesmo arranjo da regra de carimbo e
 * do catálogo de prêmios.
 */

/** `bytes32` a partir de texto curto, truncando o que não couber. */
const paraBytes32 = (texto: string) => {
  const bytes = new TextEncoder().encode(texto);
  const cortado = bytes.length <= 32 ? bytes : bytes.slice(0, 32);
  const hex = [...cortado].map(b => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex.padEnd(64, "0")}` as `0x${string}`;
};

const emSegundos = (data?: string | null) => (data ? BigInt(Math.floor(new Date(data).getTime() / 1000)) : 0n);

export const redeConfigurada = relayerConfigurado;

// ---------------------------------------------------------------- programas

export type ProgramaParaRede = {
  lojaOnchainId: number;
  nome: string;
  kind: number;
  baseBenefit: number;
  capCents: number;
  product: string | null;
  startsAt: string | null;
  endsAt: string | null;
  joint: boolean;
  supabaseId: string;
};

/** Cria o programa na rede e devolve o `programId` que o evento carrega. */
export const criarProgramaNaRede = async (p: ProgramaParaRede) => {
  const hash = await escreverComoAdmin("DiscountProgram", ABI_PROGRAMA, "createProgram", [
    BigInt(p.lojaOnchainId),
    paraBytes32(p.nome),
    p.kind,
    BigInt(p.baseBenefit),
    BigInt(p.capCents),
    // O produto vira hash: o contrato não precisa saber o que é "cappuccino",
    // só precisa conseguir dizer que duas peças falam do mesmo produto.
    p.product ? keccak256(stringToHex(p.product.toLowerCase())) : `0x${"0".repeat(64)}`,
    emSegundos(p.startsAt),
    emSegundos(p.endsAt),
    p.joint,
    keccak256(stringToHex(`${p.supabaseId}:${p.nome}`)),
  ]);

  const recibo = await clientePublico().getTransactionReceipt({ hash });
  const [evento] = parseEventLogs({ abi: ABI_PROGRAMA, eventName: "ProgramCreated", logs: recibo.logs });
  if (!evento) return undefined;
  return { onchainId: Number(evento.args.programId), hash };
};

export const definirProgramaAtivo = (programaOnchainId: number, ativo: boolean) =>
  escreverComoAdmin("DiscountProgram", ABI_PROGRAMA, "setProgramActive", [BigInt(programaOnchainId), ativo]);

export const convidarLoja = (programaOnchainId: number, lojaOnchainId: number) =>
  escreverComoAdmin("DiscountProgram", ABI_PROGRAMA, "invite", [BigInt(programaOnchainId), BigInt(lojaOnchainId)]);

/**
 * A loja convidada entra na pool.
 *
 * Na cadeia esta chamada precisa vir do dono da loja CONVIDADA — é o ponto em
 * que o desconto deixa de ser imposição e vira acordo. Como a plataforma
 * assina por todo mundo, a garantia equivalente é feita aqui em cima: a rota
 * só chega nesta função depois de confirmar, no Supabase, que quem pediu
 * administra a loja que está aceitando.
 */
export const aceitarConvite = (programaOnchainId: number, lojaOnchainId: number) =>
  escreverComoAdmin("DiscountProgram", ABI_PROGRAMA, "acceptInvite", [
    BigInt(programaOnchainId),
    BigInt(lojaOnchainId),
  ]);

export const sairDoPrograma = (programaOnchainId: number, lojaOnchainId: number) =>
  escreverComoAdmin("DiscountProgram", ABI_PROGRAMA, "leaveProgram", [
    BigInt(programaOnchainId),
    BigInt(lojaOnchainId),
  ]);

// -------------------------------------------------------------------- peças

export type PecaParaRede = {
  tokenId: number;
  programaOnchainId: number;
  level: number;
  maxSupply: number;
  maxPerWallet: number;
  startsAt: string | null;
  endsAt: string | null;
  uri: string;
};

export const criarPecaNaRede = (p: PecaParaRede) =>
  escreverComoAdmin("DiscountNFT", ABI_PECA, "createPiece", [
    BigInt(p.tokenId),
    {
      programId: BigInt(p.programaOnchainId),
      level: BigInt(p.level),
      maxSupply: BigInt(p.maxSupply),
      startTime: emSegundos(p.startsAt),
      endTime: emSegundos(p.endsAt),
      maxPerWallet: BigInt(p.maxPerWallet),
      uri: p.uri,
    },
  ]);

export const definirPecaAtiva = (tokenId: number, ativa: boolean) =>
  escreverComoAdmin("DiscountNFT", ABI_PECA, "setPieceActive", [BigInt(tokenId), ativa]);

/** Quantas unidades de cada peça esta carteira tem. Uma chamada só para todas. */
export const saldoDasPecas = async (carteira: `0x${string}`, tokenIds: number[]) => {
  if (tokenIds.length === 0) return new Map<number, number>();

  const saldos = await clientePublico().readContract({
    address: enderecoDoContrato("DiscountNFT"),
    abi: ABI_PECA,
    functionName: "balanceOfBatch",
    args: [tokenIds.map(() => carteira), tokenIds.map(id => BigInt(id))],
  });

  return new Map(tokenIds.map((id, i) => [id, Number(saldos[i] ?? 0n)]));
};

/** Quantas unidades já saíram de cada tiragem — o "restam 12 de 50" da vitrine. */
export const emCirculacao = async (tokenIds: number[]) => {
  const publico = clientePublico();
  const endereco = enderecoDoContrato("DiscountNFT");

  const totais = await Promise.all(
    tokenIds.map(id =>
      publico
        .readContract({ address: endereco, abi: ABI_PECA, functionName: "totalSupply", args: [BigInt(id)] })
        .catch(() => 0n),
    ),
  );

  return new Map(tokenIds.map((id, i) => [id, Number(totais[i] ?? 0n)]));
};

export const programaValeNaLoja = (programaOnchainId: number, lojaOnchainId: number) =>
  clientePublico().readContract({
    address: enderecoDoContrato("DiscountProgram"),
    abi: ABI_PROGRAMA,
    functionName: "validAt",
    args: [BigInt(programaOnchainId), BigInt(lojaOnchainId)],
  });

export const descontoDaPeca = (tokenId: number, contaCentavos: number) =>
  clientePublico().readContract({
    address: enderecoDoContrato("DiscountNFT"),
    abi: ABI_PECA,
    functionName: "discountFor",
    args: [BigInt(tokenId), BigInt(contaCentavos)],
  });

/**
 * Queima a peça no balcão.
 *
 * Quem envia é o relayer, e não a conta de admin: isto acontece com o cliente
 * de pé na frente do atendente, na mesma fila de nonce dos carimbos.
 */
export const usarPeca = async (
  cliente: `0x${string}`,
  tokenId: number,
  lojaOnchainId: number,
  redemptionRef: string,
) => {
  const publico = clientePublico();
  const carteira = clienteRelayer();

  const { request } = await publico.simulateContract({
    account: carteira.account,
    address: enderecoDoContrato("DiscountNFT"),
    abi: ABI_PECA,
    functionName: "usePiece",
    args: [cliente, BigInt(tokenId), BigInt(lojaOnchainId), 1n, keccak256(stringToHex(redemptionRef))],
  });

  const hash = await carteira.writeContract(request);
  const recibo = await publico.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 45_000 });
  if (recibo.status !== "success") throw new Error("a transação reverteu na rede");
  return hash;
};

// --------------------------------------------------------------- conquistas

export type ConquistaParaRede = {
  lojaOnchainId: number;
  criterion: number;
  target: number;
  startsAt: string | null;
  endsAt: string | null;
  maxWinners: number;
  pecaTokenId: number;
  grantsBadge: boolean;
  routeId: number;
  uri: string;
  supabaseId: string;
  titulo: string;
};

export const criarConquistaNaRede = async (c: ConquistaParaRede) => {
  const hash = await escreverComoAdmin("Achievements", ABI_CONQUISTA, "createAchievement", [
    BigInt(c.lojaOnchainId),
    c.criterion,
    BigInt(c.target),
    emSegundos(c.startsAt),
    emSegundos(c.endsAt),
    c.maxWinners,
    BigInt(c.pecaTokenId),
    c.grantsBadge,
    BigInt(c.routeId),
    c.uri,
    keccak256(stringToHex(`${c.supabaseId}:${c.titulo}`)),
  ]);

  const recibo = await clientePublico().getTransactionReceipt({ hash });
  const [evento] = parseEventLogs({ abi: ABI_CONQUISTA, eventName: "AchievementCreated", logs: recibo.logs });
  if (!evento) return undefined;
  return { onchainId: Number(evento.args.achievementId), hash };
};

export const definirConquistaAtiva = (conquistaOnchainId: number, ativa: boolean) =>
  escreverComoAdmin("Achievements", ABI_CONQUISTA, "setAchievementActive", [BigInt(conquistaOnchainId), ativa]);

/** Quanto a pessoa já tem do que a conquista pede — o "faltam 3 visitas". */
export const progressoDaConquista = async (conquistaOnchainId: number, cliente: `0x${string}`) => {
  const [alcancado, alvo, bateu, jaPegou] = await clientePublico().readContract({
    address: enderecoDoContrato("Achievements"),
    abi: ABI_CONQUISTA,
    functionName: "progressOf",
    args: [BigInt(conquistaOnchainId), cliente],
  });

  return { alcancado: Number(alcancado), alvo: Number(alvo), bateu, jaPegou };
};

/**
 * Entrega a conquista.
 *
 * O relayer dispara, mas quem decide se foi merecida é o contrato, lendo o
 * StampLedger na hora. Um relayer comprometido não forja conquista — e por isso
 * esta rota pode ser aberta ao cliente sem medo.
 */
export const reivindicarConquista = async (conquistaOnchainId: number, cliente: `0x${string}`, claimRef: string) => {
  const publico = clientePublico();
  const carteira = clienteRelayer();

  const { request } = await publico.simulateContract({
    account: carteira.account,
    address: enderecoDoContrato("Achievements"),
    abi: ABI_CONQUISTA,
    functionName: "claim",
    args: [BigInt(conquistaOnchainId), cliente, keccak256(stringToHex(claimRef))],
  });

  const hash = await carteira.writeContract(request);
  const recibo = await publico.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 45_000 });
  if (recibo.status !== "success") throw new Error("a transação reverteu na rede");

  const [evento] = parseEventLogs({ abi: ABI_CONQUISTA, eventName: "AchievementClaimed", logs: recibo.logs });

  return {
    hash,
    seloTokenId: evento ? Number(evento.args.badgeTokenId) : 0,
    pecaTokenId: evento ? Number(evento.args.pieceId) : 0,
  };
};
