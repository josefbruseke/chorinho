import { createHmac, timingSafeEqual } from "node:crypto";
import "server-only";

/**
 * O atendimento em curso no balcão.
 *
 * Depois que o atendente lê o passe, o cliente já está identificado — mas o
 * passe foi queimado na leitura. Entregar a recompensa exige provar de novo
 * que aquele cliente está ali; sem isso, saber o endereço de alguém bastaria
 * para queimar os carimbos dele de longe.
 *
 * Este token resolve isso: vale cinco minutos, é assinado pelo servidor e
 * amarra o cliente ao balcão que o leu. Não vai ao banco — é
 * autocontido, como o próprio passe.
 */

const VALIDADE_SEGUNDOS = 5 * 60;

const segredo = () => {
  const s = process.env.PASS_HMAC_SECRET;
  if (!s || s.length < 32) throw new Error("PASS_HMAC_SECRET ausente ou curto demais.");
  return s;
};

const assinar = (corpo: string) => createHmac("sha256", segredo()).update(corpo).digest("base64url");

export const abrirAtendimento = (cliente: string, balcaoId: string) => {
  const corpo = Buffer.from(
    JSON.stringify({ w: cliente.toLowerCase(), b: balcaoId, e: Math.floor(Date.now() / 1000) + VALIDADE_SEGUNDOS }),
  ).toString("base64url");
  return `${corpo}.${assinar(corpo)}`;
};

export type Atendimento = { cliente: string; balcaoId: string };

/** Devolve undefined para qualquer coisa adulterada, vencida ou malformada. */
export const lerAtendimento = (token: string): Atendimento | undefined => {
  try {
    const [corpo, assinatura] = token.split(".");
    if (!corpo || !assinatura) return undefined;

    const esperada = Buffer.from(assinar(corpo));
    const recebida = Buffer.from(assinatura);
    if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return undefined;

    const dados = JSON.parse(Buffer.from(corpo, "base64url").toString());
    if (typeof dados.w !== "string" || typeof dados.b !== "string" || typeof dados.e !== "number") return undefined;
    if (dados.e <= Math.floor(Date.now() / 1000)) return undefined;

    return { cliente: dados.w, balcaoId: dados.b };
  } catch {
    return undefined;
  }
};
