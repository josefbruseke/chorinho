import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import "server-only";
import { PASSE_VERSAO, type PassePayload } from "~~/utils/pass";

/**
 * O lado servidor do passe: assina, confere e nunca deixa o segredo sair daqui.
 *
 * `server-only` no topo faz o build falhar se alguém importar isto de um
 * componente de cliente — é barato e evita o pior erro possível nesta camada.
 */

const segredo = () => {
  const s = process.env.PASS_HMAC_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "PASS_HMAC_SECRET ausente ou curto demais (mínimo 32 caracteres). Sem ele o passe pode ser forjado.",
    );
  }
  return s;
};

export const passeConfigurado = () => Boolean(process.env.PASS_HMAC_SECRET);

// `cliente` é o id do perfil. Era o endereço da carteira até M8; o formato do
// payload não mudou de propósito, para a fila offline do PDV (48h) não recusar
// passe emitido antes da migração. O campo se chama `a` por herança.
const assinar = (cliente: string, nonce: string, expira: number) =>
  createHmac("sha256", segredo()).update(`${cliente.toLowerCase()}|${nonce}|${expira}`).digest("base64url");

export const assinarPasse = (cliente: string, nonce: string, expira: number): PassePayload => ({
  v: PASSE_VERSAO,
  a: cliente.toLowerCase(),
  n: nonce,
  e: expira,
  s: assinar(cliente, nonce, expira),
});

/**
 * Confere a assinatura em tempo constante.
 *
 * Comparar com `===` vazaria informação pelo tempo de resposta: quanto mais
 * caracteres iniciais acertados, mais demorada a comparação. Com isso dá para
 * descobrir a assinatura byte a byte.
 */
export const assinaturaConfere = (p: PassePayload) => {
  const esperada = Buffer.from(assinar(p.a, p.n, p.e));
  const recebida = Buffer.from(p.s);
  if (esperada.length !== recebida.length) return false;
  return timingSafeEqual(esperada, recebida);
};

/** Seis dígitos com gerador criptográfico — `Math.random()` é previsível. */
export const gerarCodigoCurto = () => String(randomInt(0, 1_000_000)).padStart(6, "0");
