import { type BillingProvider, CobrancaNaoImplementada } from "../types";

/**
 * Adaptador engatilhado, ainda não implementado.
 *
 * A assinatura está correta: o caminho de dentro do produto — evento
 * normalizado, idempotência, assinatura do estabelecimento — não muda com o
 * gateway. Enquanto isso, falhar com mensagem clara aqui é melhor que fingir
 * que funciona.
 */
export const mercadopago: BillingProvider = {
  nome: "mercadopago",
  async criarCheckout() {
    throw new CobrancaNaoImplementada("mercadopago");
  },
  async criarPortal() {
    throw new CobrancaNaoImplementada("mercadopago");
  },
  async lerWebhook() {
    throw new CobrancaNaoImplementada("mercadopago");
  },
  async cancelar() {
    throw new CobrancaNaoImplementada("mercadopago");
  },
};
