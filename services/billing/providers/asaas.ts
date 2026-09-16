import { type BillingProvider, CobrancaNaoImplementada } from "../types";

/**
 * Adaptador engatilhado, ainda não implementado.
 *
 * A assinatura está correta: o caminho de dentro do produto — evento
 * normalizado, idempotência, assinatura do estabelecimento — não muda com o
 * gateway. Enquanto isso, falhar com mensagem clara aqui é melhor que fingir
 * que funciona.
 */
export const asaas: BillingProvider = {
  nome: "asaas",
  async criarCheckout() {
    throw new CobrancaNaoImplementada("asaas");
  },
  async criarPortal() {
    throw new CobrancaNaoImplementada("asaas");
  },
  async lerWebhook() {
    throw new CobrancaNaoImplementada("asaas");
  },
  async cancelar() {
    throw new CobrancaNaoImplementada("asaas");
  },
};
