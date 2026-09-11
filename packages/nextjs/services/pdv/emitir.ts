import "server-only";
import { supabaseAdmin } from "~~/services/database/admin";
import { assinaturaConfere, passeConfigurado } from "~~/services/passe/servidor";
import {
  type CarimbosEmitidos,
  type VendaOnchain,
  emitirCarimbos,
  erroDoContrato,
  lerCartela,
  refDaVenda,
  relayerConfigurado,
} from "~~/services/relayer/servidor";
import { formatarCentavos } from "~~/utils/dinheiro";
import { codigoCurtoValido, decodificarPasse } from "~~/utils/pass";

/**
 * O caminho de uma venda, do balcão até a rede.
 *
 * As duas rotas do PDV — a venda online (`/api/pos/stamp`) e o esvaziamento da
 * fila offline (`/api/pos/sync`) — passam por aqui. São o mesmo processo com
 * tamanhos de lote diferentes; duplicar essa lógica seria garantir que as duas
 * divergissem no primeiro ajuste de regra.
 */

/**
 * Quanto tempo uma venda pode ficar parada na fila e ainda ser aceita.
 *
 * O passe vale dois minutos na tela porque uma foto dele não pode valer nada.
 * Na fila offline o raciocínio é outro: o nonce é de uso único e a assinatura
 * é do servidor, então o que protege contra reenvio já não é o relógio. Um
 * tablet que passou o fim de semana sem internet precisa conseguir sincronizar
 * na segunda-feira.
 */
export const JANELA_DA_FILA_SEGUNDOS = 48 * 60 * 60;

/** Teto por requisicao. Lote maior que isso estoura o limite de gas do bloco. */
export const MAX_POR_LOTE = 25;

const BPS_SEM_BONUS = 10_000;
const BPS_TETO = 30_000;

export type VendaEntrada = {
  /** Gerado no aparelho. É a chave de idempotência de ponta a ponta. */
  saleRef: string;
  qr?: string;
  codigo?: string;
  valorCentavos: number;
  boostBps?: number;
};

export type ResultadoVenda = {
  saleRef: string;
  ok: boolean;
  erro?: string;
  /** Já tinha sido processada antes: não é falha, é o reenvio funcionando. */
  duplicada?: boolean;
  carimbos?: number;
  pontos?: number;
  saldo?: number;
  sequencia?: number;
  cliente?: string;
  txHash?: string;
};

export type Balcao = { id: string; onchainId: number; nome: string };

export class ErroDePdv extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/**
 * Qual loja este operador atende.
 *
 * Vem da sessão, nunca do corpo da requisição: senão um operador do café
 * carimbaria em nome da padaria do lado só trocando um número no JSON.
 */
export const balcaoDoOperador = async (userId: string): Promise<Balcao> => {
  const admin = supabaseAdmin();
  const { data: vinculo } = await admin
    .from("establishment_members")
    .select("establishment_id")
    .eq("profile_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!vinculo) throw new ErroDePdv(403, "esta conta não opera nenhum balcão");

  const { data: loja } = await admin
    .from("establishments")
    .select("id, name, onchain_id, status")
    .eq("id", vinculo.establishment_id)
    .maybeSingle();

  if (!loja) throw new ErroDePdv(403, "estabelecimento não encontrado");
  if (loja.status !== "ativo") throw new ErroDePdv(403, "este estabelecimento não está ativo");
  if (loja.onchain_id === null) {
    throw new ErroDePdv(409, "o estabelecimento ainda não foi registrado na rede");
  }

  return { id: loja.id, onchainId: loja.onchain_id, nome: loja.name };
};

type Cliente = { carteira: string; profileId: string; nome: string | null };

/** Troca o passe lido no balcão pela carteira do cliente, queimando o nonce. */
const resolverCliente = async (entrada: VendaEntrada, janelaSegundos: number): Promise<Cliente> => {
  const admin = supabaseAdmin();
  const agora = new Date();

  let nonce: string | undefined;
  let profileId: string | undefined;

  if (entrada.qr) {
    const passe = decodificarPasse(entrada.qr);
    if (!passe) throw new ErroDePdv(400, "passe inválido");
    // Assinatura antes de qualquer consulta: passe forjado não encosta no banco.
    if (!assinaturaConfere(passe)) throw new ErroDePdv(400, "passe inválido");

    const limite = Math.floor(agora.getTime() / 1000) - janelaSegundos;
    if (passe.e < limite) throw new ErroDePdv(410, "passe vencido demais para ser aceito");

    const { data: linha } = await admin
      .from("pass_nonces")
      .select("nonce, profile_id, used_at")
      .eq("nonce", passe.n)
      .maybeSingle();

    if (!linha) throw new ErroDePdv(400, "passe inválido");
    if (linha.used_at) throw new ErroDePdv(409, "este passe já foi usado");
    nonce = linha.nonce;
    profileId = linha.profile_id;
  } else if (entrada.codigo) {
    if (!codigoCurtoValido(entrada.codigo)) throw new ErroDePdv(400, "código inválido");

    const { data: linha } = await admin
      .from("pass_nonces")
      .select("nonce, profile_id")
      .eq("short_code", entrada.codigo.trim())
      .is("used_at", null)
      .gt("expires_at", agora.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!linha) throw new ErroDePdv(404, "código inválido ou expirado");
    nonce = linha.nonce;
    profileId = linha.profile_id;
  } else {
    throw new ErroDePdv(400, "informe o QR ou o código do cliente");
  }

  // Queima condicionada a `used_at is null`: se duas leituras chegarem juntas,
  // só uma grava — o mesmo raciocínio do `usedSaleRef` no contrato, um nível
  // acima.
  const { data: queimado } = await admin
    .from("pass_nonces")
    .update({ used_at: agora.toISOString() })
    .eq("nonce", nonce)
    .is("used_at", null)
    .select("nonce")
    .maybeSingle();

  if (!queimado) throw new ErroDePdv(409, "este passe já foi usado");

  const { data: perfil } = await admin
    .from("profiles")
    .select("wallet_address, display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (!perfil?.wallet_address) throw new ErroDePdv(409, "cliente sem carteira");

  return { carteira: perfil.wallet_address.toLowerCase(), profileId: profileId!, nome: perfil.display_name };
};

const valorValido = (centavos: unknown): centavos is number =>
  typeof centavos === "number" && Number.isInteger(centavos) && centavos > 0 && centavos <= 100_000_000;

/**
 * Processa um lote de vendas: resolve cada passe, grava, envia para a rede e
 * devolve o veredito individual.
 *
 * Uma venda com problema não derruba as outras — num esvaziamento de fila com
 * dez vendas, uma com passe já usado não pode impedir as nove boas de entrarem.
 */
export const processarVendas = async (
  userId: string,
  entradas: VendaEntrada[],
  { janelaSegundos = JANELA_DA_FILA_SEGUNDOS } = {},
): Promise<{ balcao: Balcao; resultados: ResultadoVenda[] }> => {
  if (!passeConfigurado()) throw new ErroDePdv(503, "PASS_HMAC_SECRET não configurado");
  if (!relayerConfigurado()) throw new ErroDePdv(503, "RELAYER_PRIVATE_KEY não configurada");
  if (entradas.length === 0) throw new ErroDePdv(400, "nenhuma venda enviada");
  if (entradas.length > MAX_POR_LOTE) throw new ErroDePdv(400, `no máximo ${MAX_POR_LOTE} vendas por lote`);

  const balcao = await balcaoDoOperador(userId);
  const admin = supabaseAdmin();

  const resultados = new Map<string, ResultadoVenda>();
  const pendentes: { saleRef: string; cliente: Cliente; venda: VendaOnchain }[] = [];

  for (const entrada of entradas) {
    const saleRef = String(entrada.saleRef ?? "").trim();
    if (saleRef.length < 8 || saleRef.length > 64) {
      resultados.set(saleRef, { saleRef, ok: false, erro: "referência de venda inválida" });
      continue;
    }
    if (resultados.has(saleRef) || pendentes.some(p => p.saleRef === saleRef)) continue;

    if (!valorValido(entrada.valorCentavos)) {
      resultados.set(saleRef, { saleRef, ok: false, erro: "valor da venda inválido" });
      continue;
    }

    const boostBps = entrada.boostBps ?? BPS_SEM_BONUS;
    if (!Number.isInteger(boostBps) || boostBps < BPS_SEM_BONUS || boostBps > BPS_TETO) {
      resultados.set(saleRef, { saleRef, ok: false, erro: "bônus de produto fora do limite" });
      continue;
    }

    const { data: existente } = await admin
      .from("sales")
      .select("status, stamps_issued, points_issued, tx_hash, customer_wallet, customer_profile_id, amount_cents")
      .eq("sale_ref", saleRef)
      .maybeSingle();

    // Já confirmada: o reenvio é o PDV offline conferindo, não um erro.
    if (existente?.status === "confirmada") {
      resultados.set(saleRef, {
        saleRef,
        ok: true,
        duplicada: true,
        carimbos: existente.stamps_issued ?? undefined,
        pontos: existente.points_issued ?? undefined,
        txHash: existente.tx_hash ?? undefined,
      });
      continue;
    }

    let cliente: Cliente;

    if (existente) {
      // Tentativa anterior parou no meio. O nonce do passe já foi queimado lá,
      // então reaproveitamos o cliente gravado em vez de tentar ler o passe de
      // novo — o que falharia sempre. Contra crédito em dobro quem protege é o
      // `usedSaleRef` do contrato.
      cliente = {
        carteira: existente.customer_wallet,
        profileId: existente.customer_profile_id ?? "",
        nome: null,
      };
    } else {
      try {
        cliente = await resolverCliente(entrada, janelaSegundos);
      } catch (e) {
        resultados.set(saleRef, { saleRef, ok: false, erro: e instanceof Error ? e.message : "passe inválido" });
        continue;
      }

      const { error } = await admin.from("sales").insert({
        sale_ref: saleRef,
        establishment_id: balcao.id,
        operator_profile_id: userId,
        customer_profile_id: cliente.profileId,
        customer_wallet: cliente.carteira,
        amount_cents: entrada.valorCentavos,
        status: "enviada",
      });

      if (error) {
        resultados.set(saleRef, { saleRef, ok: false, erro: "não foi possível registrar a venda" });
        continue;
      }
    }

    pendentes.push({
      saleRef,
      cliente,
      venda: {
        establishmentId: BigInt(balcao.onchainId),
        customer: cliente.carteira as `0x${string}`,
        amountCents: BigInt(existente?.amount_cents ?? entrada.valorCentavos),
        productBoostBps: boostBps,
        saleRef: refDaVenda(saleRef),
      },
    });
  }

  if (pendentes.length > 0) {
    const enviados = await enviarComRetentativaIndividual(pendentes);
    for (const [saleRef, resultado] of enviados) resultados.set(saleRef, resultado);
    await gravarDesfecho(balcao, pendentes, enviados);
  }

  return {
    balcao,
    resultados: entradas
      .map(e => resultados.get(String(e.saleRef ?? "").trim()))
      .filter((r): r is ResultadoVenda => Boolean(r)),
  };
};

type Pendente = { saleRef: string; cliente: Cliente; venda: VendaOnchain };

/**
 * Manda o lote e, se ele reverter, refaz uma a uma.
 *
 * O lote é o que torna o gás irrisório por venda, mas ele é tudo-ou-nada: uma
 * venda abaixo do piso de ticket derrubaria as outras nove junto. A segunda
 * passada custa mais gás e só acontece quando algo deu errado — é o preço de
 * não perder vendas boas por causa de uma ruim.
 */
const enviarComRetentativaIndividual = async (pendentes: Pendente[]) => {
  const saida = new Map<string, ResultadoVenda>();

  const aplicar = (lote: Pendente[], hash: string, porVenda: Map<string, CarimbosEmitidos>) => {
    for (const p of lote) {
      const creditado = porVenda.get(p.venda.saleRef.toLowerCase());
      saida.set(p.saleRef, {
        saleRef: p.saleRef,
        ok: true,
        txHash: hash,
        carimbos: creditado?.carimbos ?? 0,
        pontos: creditado?.pontos ?? 0,
        saldo: creditado?.saldo,
        sequencia: creditado?.sequencia,
        cliente: p.cliente.nome ?? undefined,
      });
    }
  };

  try {
    const { hash, porVenda } = await emitirCarimbos(pendentes.map(p => p.venda));
    aplicar(pendentes, hash, porVenda);
    return saida;
  } catch (e) {
    if (pendentes.length === 1) {
      saida.set(pendentes[0].saleRef, { saleRef: pendentes[0].saleRef, ok: false, erro: mensagemDeRede(e) });
      return saida;
    }
  }

  for (const p of pendentes) {
    try {
      const { hash, porVenda } = await emitirCarimbos([p.venda]);
      aplicar([p], hash, porVenda);
    } catch (e) {
      saida.set(p.saleRef, { saleRef: p.saleRef, ok: false, erro: mensagemDeRede(e) });
    }
  }

  return saida;
};

/** Grava o desfecho de cada venda e espelha os saldos afetados. */
const gravarDesfecho = async (balcao: Balcao, pendentes: Pendente[], enviados: Map<string, ResultadoVenda>) => {
  const admin = supabaseAdmin();
  const confirmadas: string[] = [];

  for (const p of pendentes) {
    const r = enviados.get(p.saleRef);
    if (r?.ok) {
      confirmadas.push(p.cliente.carteira);
      await admin
        .from("sales")
        .update({
          status: "confirmada",
          tx_hash: r.txHash,
          stamps_issued: r.carimbos ?? 0,
          points_issued: r.pontos ?? 0,
          confirmed_at: new Date().toISOString(),
        })
        .eq("sale_ref", p.saleRef);
    } else {
      await admin
        .from("sales")
        .update({ status: "falhou", erro: r?.erro ?? "falha desconhecida" })
        .eq("sale_ref", p.saleRef);
    }
  }

  if (confirmadas.length > 0) await atualizarCache(balcao, [...new Set(confirmadas)]);
};

/**
 * Espelha o saldo da rede no Supabase.
 *
 * O contrato continua sendo a fonte da verdade; isto existe para a carteira do
 * cliente abrir instantânea, sem esperar uma chamada RPC por loja.
 */
const atualizarCache = async (balcao: Balcao, carteiras: string[]) => {
  const admin = supabaseAdmin();

  await Promise.all(
    carteiras.map(async carteira => {
      try {
        const cartela = await lerCartela(BigInt(balcao.onchainId), carteira as `0x${string}`);

        await admin.from("stamp_balances_cache").upsert({
          establishment_id: balcao.id,
          wallet: carteira,
          balance: cartela.saldo,
          lifetime: cartela.total,
          streak_current: cartela.sequencia,
          streak_best: cartela.melhorSequencia,
          last_visit_at: new Date(cartela.ultimaVisita * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch {
        // O cache é conveniência: a carteira do cliente lê da rede quando ele
        // abre a tela. Falhar aqui não pode desfazer um carimbo já creditado.
      }
    }),
  );
};

/** Traduz o erro da rede para algo que o atendente consiga agir. */
const mensagemDeRede = (e: unknown) => {
  const cru = e instanceof Error ? e.message : String(e);
  // O atendente recebe a versao curta; o log guarda a inteira. Sem isto, uma
  // configuracao errada de relayer vira "nao foi possivel enviar" e ninguem
  // descobre por que.
  console.error("[pdv] falha ao emitir carimbos:", cru);

  const contrato = erroDoContrato(e);
  switch (contrato?.nome) {
    case "TicketBelowFloor": {
      const minimo = Number(contrato.args?.[1] ?? 0);
      return minimo > 0
        ? `esta loja so carimba a partir de ${formatarCentavos(minimo)}`
        : "valor abaixo do minimo desta loja para gerar carimbo";
    }
    case "CooldownActive": {
      const faltam = Number(contrato.args?.[0] ?? 0);
      return faltam > 60
        ? `este cliente ja recebeu carimbo ha pouco — volte em ${Math.ceil(faltam / 60)} min`
        : "este cliente ja recebeu carimbo ha pouco";
    }
    case "SubscriptionInactive":
      return "a assinatura da loja esta vencida — o resgate continua valendo, a emissao nao";
    case "EstablishmentInactive":
      return "esta loja esta inativa na rede";
    case "RuleInactive":
      return "a loja ainda nao configurou a regra de carimbos";
    case "SaleAlreadyProcessed":
      return "esta venda ja tinha sido creditada";
    case "NotOperator":
      return "o relayer nao tem permissao nesta loja";
    case "BoostTooHigh":
      return "bonus de produto acima do teto";
    default:
      return "nao foi possivel enviar para a rede agora";
  }
};
