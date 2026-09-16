import type { BillingProvider } from "../types";

/**
 * O provedor padrão: não há gateway nenhum.
 *
 * A equipe libera a loja à mão em `/admin/estabelecimentos`, escrevendo direto
 * no estabelecimento. Parece pouco, mas é o que destrava o piloto e as
 * primeiras dezenas de lojas sem que nenhuma outra parte do produto fique
 * esperando a decisão de gateway.
 *
 * Ele continua existindo depois que um gateway de verdade entrar: loja em
 * teste, cortesia e caso de suporte precisam de uma saída que não passe por
 * cartão de crédito.
 */
export const manual: BillingProvider = {
  nome: "manual",

  async criarCheckout() {
    // Sem gateway não há para onde mandar o lojista: quem libera é a equipe.
    return "/painel/assinatura";
  },

  async criarPortal() {
    return null;
  },

  async lerWebhook() {
    return null;
  },

  async cancelar() {
    // A suspensão manual acontece no painel do admin, não por aqui.
  },
};
