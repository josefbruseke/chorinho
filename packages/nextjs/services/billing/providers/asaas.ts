import { type BillingProvider, CobrancaNaoImplementada } from "../types";

/**
 * Adaptador engatilhado, ainda não implementado.
 *
 * A assinatura está correta e o custo de ativar é uma tarde de trabalho: o
 * caminho de dentro do produto — evento normalizado, idempotência, espelho
 * on-chain — já existe e não muda. Enquanto isso, falhar com mensagem clara
 * aqui é melhor que fingir que funciona.
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
