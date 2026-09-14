import "server-only";
import { supabaseAdmin } from "~~/services/database/admin";
import { assinaturaConfere, passeConfigurado } from "~~/services/passe/servidor";
import { type Terminal, terminalDoAparelho } from "~~/services/pdv/acesso";
import { codigoCurtoValido, decodificarPasse } from "~~/utils/pass";
import { MAX_POR_LOTE } from "~~/utils/pdv";

/**
 * O caminho de uma venda, do balcão até a cartela.
 *
 * As duas rotas do PDV — a venda online (`/api/pos/stamp`) e o esvaziamento da
 * fila offline (`/api/pos/sync`) — passam por aqui. São o mesmo processo com
 * tamanhos de lote diferentes; duplicar essa lógica seria garantir que as duas
 * divergissem no primeiro ajuste de regra.
 *
 * O carimbo nasce e termina na mesma requisição. Enquanto ele esperava um bloco
 * para existir, a venda vivia um tempo em `enviada` e só depois virava
 * `confirmada`; hoje o único juiz é o Postgres, e ele responde em milissegundos.
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

export { MAX_POR_LOTE };

const BPS_SEM_BONUS = 10_000;
const BPS_TETO = 30_000;

/** Violação de chave única no Postgres. É a trava de idempotência falando. */
const CHAVE_DUPLICADA = "23505";

/**
 * A regra de acúmulo, enquanto ela não tem onde morar.
 *
 * Era uma struct configurável por loja. Aqui é constante, e isso não é pressa:
 * o produto mudou junto — "passou no balcão, ganhou um carimbo", sem valor
 * digitado. Piso de ticket, centavos por carimbo e teto por venda deixaram de
 * fazer sentido no minuto em que o valor saiu da conta.
 *
 * A carência em zero é escolha, não esquecimento: a mesma pessoa pode ser
 * carimbada em sequência. Era o último freio contra repetição no balcão, e vale
 * enquanto o que importa é o fluxo rodar; num comércio de verdade, subir isto
 * para algumas horas é o que impede um caixa distraído de encher a cartela de
 * alguém numa tarde.
 */
// M9: cada campo destes vira uma coluna de `accrual_rules`, uma linha por
// estabelecimento, e o painel do lojista volta a mexer neles.
const REGRA = {
  carimbosPorVisita: 1,
  esperaEntreCarimbosSegundos: 0,
  janelaDaSequenciaSegundos: 7 * 24 * 60 * 60,
};

/** Quantas vezes insistir quando dois caixas mexem na mesma cartela. */
const TENTATIVAS_DA_CARTELA = 3;

export type VendaEntrada = {
  /** Gerado no aparelho. É a chave de idempotência de ponta a ponta. */
  saleRef: string;
  qr?: string;
  codigo?: string;
  boostBps?: number;
};

export type ResultadoVenda = {
  saleRef: string;
  ok: boolean;
  erro?: string;
  /**
   * Se esta venda deve continuar na fila do aparelho.
   *
   * Existe porque a alternativa era o aparelho adivinhar pela mensagem: até
   * agora ele procurava a palavra "rede" no texto do erro, e qualquer erro novo
   * com outra redação fazia uma venda **nunca enviada** sumir da fila sem que
   * ninguém percebesse. Vem sempre preenchida quando `ok` é falso — um aparelho
   * que receber a resposta sem esta marca deve segurar a venda, não descartá-la.
   */
  reter?: boolean;
  /** Já tinha sido processada antes: não é falha, é o reenvio funcionando. */
  duplicada?: boolean;
  carimbos?: number;
  pontos?: number;
  saldo?: number;
  sequencia?: number;
  cliente?: string;
};

export type Balcao = { id: string; nome: string; terminal?: Terminal };

export class ErroDePdv extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/**
 * O que o atendente lê quando não deu.
 *
 * As frases vêm inteiras de quando quem recusava era o contrato. O atendente já
 * conhece essas palavras, e reescrevê-las agora criaria dois vocabulários para
 * o mesmo problema no balcão. O que mudou é só a origem: cada uma tem hoje uma
 * conferência nossa por trás.
 */
const MENSAGENS = {
  assinaturaVencida: "a assinatura da loja está vencida — o resgate continua valendo, a emissão não",
  vendaJaCreditada: "esta venda já tinha sido creditada",
  bonusForaDoTeto: "bônus de produto fora do limite",
  semRegistro: "não foi possível registrar a venda",
  cartelaOcupada: "outro caixa mexeu nesta cartela agora — tente de novo",
};

/**
 * Se a loja está em dia com a plataforma.
 *
 * A cobrança recusava carimbo NOVO de loja inadimplente — e só o carimbo: o
 * resgate continuava valendo, porque o cliente não pode ser punido por problema
 * de pagamento do lojista. Não existe tabela de assinatura ainda, então isto
 * responde sempre que sim; apagar a chamada é que seria perder a regra.
 */
// M9: o único lugar onde o Stripe entra — passa a receber o id da loja, ler a
// assinatura dela e devolver o veredito de verdade. Nada mais no PDV precisa
// saber que ela existe.
const assinaturaDaLojaAtiva = async (): Promise<boolean> => true;

/**
 * Qual loja este operador atende.
 *
 * Vem da sessão, nunca do corpo da requisição: senão um operador do café
 * carimbaria em nome da padaria do lado só trocando um número no JSON.
 */
export const balcaoDoOperador = async (userId?: string): Promise<Balcao> => {
  const admin = supabaseAdmin();

  // O aparelho pareado vem primeiro: no balcão real é o caminho normal, e
  // resolvê-lo antes evita uma consulta de vínculo que quase sempre falharia.
  const terminal = await terminalDoAparelho();

  let establishmentId = terminal?.establishmentId;

  if (!establishmentId) {
    if (!userId) throw new ErroDePdv(401, "este aparelho ainda não foi pareado com nenhum balcão");

    const { data: vinculo } = await admin
      .from("establishment_members")
      .select("establishment_id")
      .eq("profile_id", userId)
      .eq("active", true)
      .limit(1)
      .maybeSingle();

    // 401 e não 403: do ponto de vista do aparelho, "não tenho terminal" e
    // "esta conta não trabalha em loja nenhuma" são a mesma situação — este
    // aparelho ainda não é um balcão. E as duas se resolvem do mesmo jeito,
    // com o código de pareamento.
    if (!vinculo) throw new ErroDePdv(401, "este aparelho ainda não foi pareado com nenhum balcão");
    establishmentId = vinculo.establishment_id;
  }

  const { data: loja } = await admin
    .from("establishments")
    .select("id, name, status")
    .eq("id", establishmentId)
    .maybeSingle();

  if (!loja) throw new ErroDePdv(403, "estabelecimento não encontrado");
  // A loja precisa estar ativa, e só. Exigir registro em rede era o que fazia
  // uma loja recém-aprovada abrir o PDV e não conseguir carimbar ninguém.
  if (loja.status !== "ativo") throw new ErroDePdv(403, "este estabelecimento não está ativo");

  return { id: loja.id, nome: loja.name, terminal };
};

export type Cliente = { profileId: string; nome: string | null };

/** Troca o passe lido no balcão pelo cliente, queimando o nonce. */
export const resolverCliente = async (entrada: VendaEntrada, janelaSegundos: number): Promise<Cliente> => {
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
  // só uma grava. O mesmo raciocínio se repete na venda e na entrega — toda
  // trava aqui é uma gravação que só passa se ninguém tiver passado antes.
  const { data: queimado } = await admin
    .from("pass_nonces")
    .update({ used_at: agora.toISOString() })
    .eq("nonce", nonce)
    .is("used_at", null)
    .select("nonce")
    .maybeSingle();

  if (!queimado) throw new ErroDePdv(409, "este passe já foi usado");

  const { data: perfil } = await admin.from("profiles").select("display_name").eq("id", profileId).maybeSingle();

  if (!perfil) throw new ErroDePdv(409, "cliente não encontrado");

  return { profileId: profileId!, nome: perfil.display_name };
};

/** Bônus de produto aceitável: inteiro, entre "sem bônus" e o triplo. */
const boostValido = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= BPS_SEM_BONUS && v <= BPS_TETO;

/**
 * Quantos carimbos esta venda rende.
 *
 * Um por visita, multiplicado pelo bônus do produto — `20000` bps dobra. O teto
 * por venda que existia no contrato não veio junto: ele valia 1 para anular a
 * conta em cima do valor da compra, e mantê-lo aqui deixaria o bônus
 * decorativo. Quem limita o exagero agora é `BPS_TETO`.
 *
 * Bônus fora do limite vira "sem bônus" em vez de exceção porque a prévia
 * também chama isto, e ela não pode explodir na cara do atendente. Quem RECUSA
 * a venda por bônus inválido é `registrarVenda`, antes de gravar.
 */
export const carimbosDaVenda = (boostBps?: unknown) =>
  Math.floor((REGRA.carimbosPorVisita * (boostValido(boostBps) ? boostBps : BPS_SEM_BONUS)) / BPS_SEM_BONUS);

/**
 * Processa um lote de vendas: resolve cada passe, credita e devolve o veredito
 * individual.
 *
 * Uma venda com problema não derruba as outras — num esvaziamento de fila com
 * dez vendas, uma com passe já usado não pode impedir as nove boas de entrarem.
 */
export const processarVendas = async (
  userId: string | undefined,
  entradas: VendaEntrada[],
  { janelaSegundos = JANELA_DA_FILA_SEGUNDOS } = {},
): Promise<{ balcao: Balcao; resultados: ResultadoVenda[] }> => {
  if (!passeConfigurado()) throw new ErroDePdv(503, "PASS_HMAC_SECRET não configurado");
  if (entradas.length === 0) throw new ErroDePdv(400, "nenhuma venda enviada");
  if (entradas.length > MAX_POR_LOTE) throw new ErroDePdv(400, `no máximo ${MAX_POR_LOTE} vendas por lote`);

  const balcao = await balcaoDoOperador(userId);
  // Uma conferência por lote, e não por venda: a loja é a mesma nas oito.
  const assinaturaEmDia = await assinaturaDaLojaAtiva();

  const resultados = new Map<string, ResultadoVenda>();

  // Em série, e não em `Promise.all`: duas vendas do mesmo cliente no mesmo lote
  // disputariam a mesma cartela, e a segunda sobrescreveria a primeira.
  for (const entrada of entradas) {
    const saleRef = String(entrada.saleRef ?? "").trim();
    if (resultados.has(saleRef)) continue;
    resultados.set(saleRef, await registrarVenda(balcao, userId, entrada, saleRef, janelaSegundos, assinaturaEmDia));
  }

  return {
    balcao,
    resultados: entradas
      .map(e => resultados.get(String(e.saleRef ?? "").trim()))
      .filter((r): r is ResultadoVenda => Boolean(r)),
  };
};

/**
 * Uma venda, do começo ao fim.
 *
 * A ordem aqui é a defesa contra crédito em dobro, e ela é deliberada: **a
 * linha de `sales` é gravada antes de a cartela mexer**. A unicidade de
 * `sale_ref` é a única trava que restou depois que a cadeia saiu — quem
 * conseguir inserir é quem credita, e o reenvio que perder a corrida encontra a
 * venda pronta e devolve o recibo dela.
 */
const registrarVenda = async (
  balcao: Balcao,
  userId: string | undefined,
  entrada: VendaEntrada,
  saleRef: string,
  janelaSegundos: number,
  assinaturaEmDia: boolean,
): Promise<ResultadoVenda> => {
  if (saleRef.length < 8 || saleRef.length > 64) {
    return { saleRef, ok: false, reter: false, erro: "referência de venda inválida" };
  }

  const boostBps = entrada.boostBps ?? BPS_SEM_BONUS;
  if (!boostValido(boostBps)) return { saleRef, ok: false, reter: false, erro: MENSAGENS.bonusForaDoTeto };

  const admin = supabaseAdmin();

  const { data: existente } = await admin
    .from("sales")
    .select("status, stamps_issued, points_issued, customer_profile_id")
    .eq("sale_ref", saleRef)
    .maybeSingle();

  // Já creditada: o reenvio é o PDV offline conferindo, não um erro.
  if (existente?.status === "confirmada") return recibo(saleRef, existente);

  // Assinatura vencida é veredito, não acidente: reenviar amanhã dá a mesma
  // resposta, então a venda sai da fila do aparelho.
  if (!assinaturaEmDia) return { saleRef, ok: false, reter: false, erro: MENSAGENS.assinaturaVencida };

  const carimbos = carimbosDaVenda(boostBps);

  if (existente) return retomarVenda(balcao.id, saleRef, existente.customer_profile_id, carimbos);

  let cliente: Cliente;
  try {
    cliente = await resolverCliente(entrada, janelaSegundos);
  } catch (e) {
    // Passe vencido, já usado ou sem cliente: insistir não conserta.
    return { saleRef, ok: false, reter: false, erro: e instanceof Error ? e.message : "passe inválido" };
  }

  const espera = await esperaRestante(balcao.id, cliente.profileId);
  if (espera > 0) return { saleRef, ok: false, reter: false, erro: mensagemDaCarencia(espera) };

  const { error } = await admin.from("sales").insert({
    sale_ref: saleRef,
    establishment_id: balcao.id,
    operator_profile_id: userId ?? null,
    pos_terminal_id: balcao.terminal?.id ?? null,
    customer_profile_id: cliente.profileId,
    stamps_issued: carimbos,
    // M9: ponto da cidade não tem mais onde ser creditado — o cofre saiu com a
    // rede e não há tabela no lugar. Zero é a verdade até ela existir.
    points_issued: 0,
    status: "confirmada",
    confirmed_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === CHAVE_DUPLICADA) {
      // Dois reenvios ao mesmo tempo. O outro gravou e está creditando: o
      // recibo dele é a resposta certa para este também.
      return (await lerRecibo(saleRef)) ?? { saleRef, ok: false, reter: false, erro: MENSAGENS.vendaJaCreditada };
    }
    // O atendente recebe a versão curta; o log guarda a inteira. Sem isto, um
    // banco recusando gravação vira "não foi possível registrar" e ninguém
    // descobre por quê.
    console.error("[pdv] falha ao gravar a venda:", error.message);
    // Recusa do banco é transitória: a venda volta para a fila.
    return { saleRef, ok: false, reter: true, erro: MENSAGENS.semRegistro };
  }

  return creditarEResponder(balcao.id, saleRef, cliente.profileId, carimbos, cliente.nome);
};

/**
 * Uma venda que ficou pelo caminho.
 *
 * Linha gravada, carimbo nunca creditado — é o que sobrou das vendas que
 * esperavam a rede confirmar, e do reenvio que morreu entre a gravação e o
 * crédito. O passe delas já foi queimado, então ler o QR de novo falharia
 * sempre: o cliente vem da própria linha.
 *
 * A virada para `confirmada` é condicionada à linha ainda NÃO estar confirmada.
 * É o que garante que dois reenvios simultâneos creditem uma vez só.
 */
const retomarVenda = async (
  balcaoId: string,
  saleRef: string,
  profileId: string,
  carimbos: number,
): Promise<ResultadoVenda> => {
  const { data: assumida } = await supabaseAdmin()
    .from("sales")
    .update({
      status: "confirmada",
      stamps_issued: carimbos,
      points_issued: 0,
      confirmed_at: new Date().toISOString(),
      erro: null,
      // O cliente volta em todo `update` porque o tipo gerado o exige desde que
      // a coluna virou NOT NULL. É o mesmo valor que já está na linha.
      customer_profile_id: profileId,
    })
    .eq("sale_ref", saleRef)
    .neq("status", "confirmada")
    .select("status, stamps_issued, points_issued")
    .maybeSingle();

  if (!assumida) {
    return (await lerRecibo(saleRef)) ?? { saleRef, ok: false, reter: true, erro: MENSAGENS.semRegistro };
  }

  return creditarEResponder(balcaoId, saleRef, profileId, carimbos);
};

/**
 * Credita a visita e monta o recibo.
 *
 * Se a cartela não puder ser gravada, a venda VOLTA para `falhou`. Deixá-la
 * `confirmada` seria o pior desfecho possível: o próximo reenvio veria venda
 * pronta e devolveria um recibo de um carimbo que nunca entrou. Fora de
 * `confirmada`, a retomada acha a linha e credita de verdade.
 */
const creditarEResponder = async (
  balcaoId: string,
  saleRef: string,
  profileId: string,
  carimbos: number,
  nome?: string | null,
): Promise<ResultadoVenda> => {
  const cartela = await creditarVisita(balcaoId, profileId, carimbos);

  if (!cartela) {
    await supabaseAdmin()
      .from("sales")
      .update({ status: "falhou", erro: MENSAGENS.cartelaOcupada, customer_profile_id: profileId })
      .eq("sale_ref", saleRef);

    return { saleRef, ok: false, reter: true, erro: MENSAGENS.cartelaOcupada };
  }

  return {
    saleRef,
    ok: true,
    carimbos,
    pontos: 0,
    saldo: cartela.saldo,
    sequencia: cartela.sequencia,
    cliente: nome ?? undefined,
  };
};

type VendaGravada = { stamps_issued: number | null; points_issued: number | null };

/** O recibo de uma venda que já tinha sido creditada — o mesmo da primeira vez. */
const recibo = (saleRef: string, venda: VendaGravada): ResultadoVenda => ({
  saleRef,
  ok: true,
  duplicada: true,
  carimbos: venda.stamps_issued ?? undefined,
  pontos: venda.points_issued ?? undefined,
});

const lerRecibo = async (saleRef: string): Promise<ResultadoVenda | undefined> => {
  const { data } = await supabaseAdmin()
    .from("sales")
    .select("status, stamps_issued, points_issued")
    .eq("sale_ref", saleRef)
    .maybeSingle();

  return data?.status === "confirmada" ? recibo(saleRef, data) : undefined;
};

/** Quantos segundos faltam para este cliente poder ser carimbado de novo. */
const esperaRestante = async (balcaoId: string, profileId: string) => {
  if (REGRA.esperaEntreCarimbosSegundos <= 0) return 0;

  const { ultimaVisita } = await lerCartela(balcaoId, profileId);
  if (!ultimaVisita) return 0;

  const desde = (Date.now() - new Date(ultimaVisita).getTime()) / 1000;
  return Math.max(0, Math.ceil(REGRA.esperaEntreCarimbosSegundos - desde));
};

const mensagemDaCarencia = (segundos: number) =>
  segundos > 60
    ? `este cliente já recebeu carimbo há pouco — volte em ${Math.ceil(segundos / 60)} min`
    : "este cliente já recebeu carimbo há pouco";

export type Cartela = {
  saldo: number;
  total: number;
  sequencia: number;
  melhorSequencia: number;
  ultimaVisita?: string;
};

type LinhaDaCartela = {
  balance: number;
  lifetime: number;
  streak_current: number;
  streak_best: number;
  last_visit_at: string | null;
};

const daLinha = (linha: LinhaDaCartela | null): Cartela => ({
  saldo: linha?.balance ?? 0,
  total: linha?.lifetime ?? 0,
  sequencia: linha?.streak_current ?? 0,
  melhorSequencia: linha?.streak_best ?? 0,
  ultimaVisita: linha?.last_visit_at ?? undefined,
});

/**
 * A cartela do cliente nesta loja.
 *
 * Isto era um espelho de conveniência de um saldo que morava na cadeia. Agora
 * é a cartela — não há segunda fonte para conferir contra, e o que estiver
 * escrito aqui é o que o cliente tem.
 */
export const lerCartela = async (balcaoId: string, profileId: string): Promise<Cartela> => {
  const { data } = await supabaseAdmin()
    .from("stamp_balances_cache")
    .select("balance, lifetime, streak_current, streak_best, last_visit_at")
    .eq("establishment_id", balcaoId)
    .eq("customer_profile_id", profileId)
    .maybeSingle();

  return daLinha(data);
};

/**
 * Mexe na cartela e devolve como ela ficou.
 *
 * Ler, somar e gravar tem corrida — e aqui a corrida custa um carimbo de
 * verdade. A gravação é condicionada ao saldo que acabamos de ler: se outro
 * caixa passou no meio, a nossa não pega, e refazemos a conta em cima do número
 * novo em vez de sobrescrever o dele.
 *
 * Devolve `undefined` só quando as três tentativas acabam sem gravar — dois
 * caixas brigando pela mesma cartela no mesmo instante, três vezes seguidas.
 * Recusa de regra (saldo insuficiente, por exemplo) sai por exceção.
 */
// M9: isto vira uma função no Postgres, e a corrida deixa de existir.
const mexerNaCartela = async (
  balcaoId: string,
  profileId: string,
  ajustar: (atual: Cartela) => Cartela,
): Promise<Cartela | undefined> => {
  const admin = supabaseAdmin();

  for (let tentativa = 0; tentativa < TENTATIVAS_DA_CARTELA; tentativa++) {
    const { data: linha } = await admin
      .from("stamp_balances_cache")
      .select("balance, lifetime, streak_current, streak_best, last_visit_at")
      .eq("establishment_id", balcaoId)
      .eq("customer_profile_id", profileId)
      .maybeSingle();

    const atual = daLinha(linha);
    const nova = ajustar(atual);

    const campos = {
      balance: nova.saldo,
      lifetime: nova.total,
      streak_current: nova.sequencia,
      streak_best: nova.melhorSequencia,
      last_visit_at: nova.ultimaVisita ?? null,
      updated_at: new Date().toISOString(),
    };

    if (!linha) {
      const { error } = await admin
        .from("stamp_balances_cache")
        .insert({ establishment_id: balcaoId, customer_profile_id: profileId, ...campos });

      if (!error) return nova;
      // Primeira visita do cliente chegando duas vezes ao mesmo tempo: quem
      // perdeu refaz a conta em cima da linha que o outro acabou de criar.
      if (error.code !== CHAVE_DUPLICADA) {
        console.error("[pdv] falha ao gravar a cartela:", error.message);
        return undefined;
      }
      continue;
    }

    const { data: gravada } = await admin
      .from("stamp_balances_cache")
      .update(campos)
      .eq("establishment_id", balcaoId)
      .eq("customer_profile_id", profileId)
      .eq("balance", atual.saldo)
      .select("balance")
      .maybeSingle();

    if (gravada) return nova;
  }

  return undefined;
};

/**
 * Credita a visita.
 *
 * A sequência é a parte que o atendente anuncia em voz alta — "cinco visitas
 * seguidas!" — então ela precisa estar certa: visita dentro da janela soma,
 * visita fora recomeça do um.
 */
const creditarVisita = async (balcaoId: string, profileId: string, carimbos: number) => {
  const agora = new Date();

  return mexerNaCartela(balcaoId, profileId, atual => {
    const sequencia = proximaSequencia(atual, agora);
    return {
      saldo: atual.saldo + carimbos,
      total: atual.total + carimbos,
      sequencia,
      melhorSequencia: Math.max(atual.melhorSequencia, sequencia),
      ultimaVisita: agora.toISOString(),
    };
  });
};

const proximaSequencia = (atual: Cartela, agora: Date) => {
  if (!atual.ultimaVisita) return 1;
  const desde = (agora.getTime() - new Date(atual.ultimaVisita).getTime()) / 1000;
  return desde <= REGRA.janelaDaSequenciaSegundos ? atual.sequencia + 1 : 1;
};

/**
 * Tira da cartela o que o prêmio custou.
 *
 * Exportado porque a entrega mexe no mesmo saldo que o carimbo. Um resgate que
 * não descontasse aqui deixaria a carteira do cliente anunciando carimbos que
 * ele acabou de gastar — e ele voltaria ao balcão pedir outro prêmio, na frente
 * da fila.
 *
 * De propósito não confere assinatura: loja atrasada para de emitir carimbo
 * novo, mas continua obrigada a honrar o que o cliente já juntou.
 */
export const debitarCarimbos = async (balcaoId: string, profileId: string, carimbos: number) =>
  mexerNaCartela(balcaoId, profileId, atual => {
    if (atual.saldo < carimbos) throw new ErroDePdv(422, "o cliente não tem carimbos suficientes");
    return { ...atual, saldo: atual.saldo - carimbos };
  });
