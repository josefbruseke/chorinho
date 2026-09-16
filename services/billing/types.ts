/**
 * A porta de cobrança.
 *
 * Qual gateway o Chorinho vai usar ainda não está decidido — e adiar essa
 * decisão só é barato se ela couber atrás de uma interface. O que está fixo
 * aqui é a FORMA: quatro métodos, um evento normalizado, e a troca de
 * provedor sendo uma variável de ambiente.
 *
 * Princípio que vale para todos os adaptadores: **o estabelecimento paga a
 * plataforma, e ponto**. Nenhum dinheiro flui para os comerciantes através de
 * nós — nada de split, marketplace ou repasse. Isso elimina KYC de
 * intermediário e uma montanha de compliance, independente do gateway
 * escolhido.
 */

export type StatusDaAssinatura = "ativa" | "atrasada" | "cancelada";

/**
 * O evento interno, para onde todo webhook converge.
 *
 * Daí para frente o caminho é único e não sabe qual gateway falou: guarda o
 * evento para idempotência e atualiza a assinatura do estabelecimento. O
 * lojista nunca precisa saber por qual gateway pagou.
 */
export type EventoDeCobranca = {
  /** Identificador do evento no provedor. É a chave de idempotência. */
  idNoProvedor: string;
  establishmentId: string;
  plano: number;
  status: StatusDaAssinatura;
  validoAte: Date;
  /** Referência opaca do provedor (assinatura, cobrança, preapproval). */
  referencia: string;
};

export type BillingProvider = {
  /** Nome curto, igual ao valor de BILLING_PROVIDER. */
  nome: string;

  /** Leva o lojista para pagar. Devolve a URL para onde redirecionar. */
  criarCheckout(establishmentId: string, planoId: string): Promise<string>;

  /**
   * Portal de autoatendimento do provedor, quando existe. `null` significa
   * "este gateway não tem portal" — e a tela precisa saber disso para não
   * mostrar um botão que não leva a lugar nenhum.
   */
  criarPortal(establishmentId: string): Promise<string | null>;

  /**
   * Converte o webhook em evento interno, ou devolve `null` quando a
   * requisição não é um evento que nos interessa.
   *
   * ATENÇÃO ao implementar: leia o corpo com `await request.text()`, NUNCA com
   * `request.json()`. Toda verificação de assinatura (Stripe, Mercado Pago,
   * Asaas) precisa dos bytes exatos, e `json()` os consome.
   */
  lerWebhook(request: Request): Promise<EventoDeCobranca | null>;

  cancelar(referencia: string): Promise<void>;
};

/** Lançado pelos adaptadores ainda não implementados. */
export class CobrancaNaoImplementada extends Error {
  constructor(provedor: string) {
    super(
      `O provedor de cobrança "${provedor}" ainda não foi implementado. ` +
        `Use BILLING_PROVIDER=manual ou implemente services/billing/providers/${provedor}.ts.`,
    );
  }
}
