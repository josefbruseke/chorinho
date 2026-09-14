import { asaas } from "./providers/asaas";
import { crypto } from "./providers/crypto";
import { manual } from "./providers/manual";
import { mercadopago } from "./providers/mercadopago";
import { pix } from "./providers/pix";
import { stripe } from "./providers/stripe";
import type { BillingProvider } from "./types";

const PROVEDORES: Record<string, BillingProvider> = { manual, stripe, mercadopago, asaas, pix, crypto };

/**
 * Resolve o provedor pela variável de ambiente.
 *
 * Nome desconhecido cai no manual em vez de derrubar a aplicação: um erro de
 * digitação no painel da Vercel não pode tirar o balcão do ar — e o manual
 * nunca impede ninguém de carimbar.
 */
export const provedorDeCobranca = (): BillingProvider => {
  const nome = (process.env.BILLING_PROVIDER ?? "manual").toLowerCase();
  const escolhido = PROVEDORES[nome];
  if (!escolhido) {
    console.warn(`[cobranca] BILLING_PROVIDER="${nome}" não existe. Seguindo com "manual".`);
    return manual;
  }
  return escolhido;
};

export type { BillingProvider, EventoDeCobranca, StatusDaAssinatura } from "./types";
export { CobrancaNaoImplementada } from "./types";
