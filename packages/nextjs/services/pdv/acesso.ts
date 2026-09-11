import { cookies } from "next/headers";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import "server-only";
import { supabaseAdmin } from "~~/services/database/admin";

/**
 * Quem pode carimbar neste balcão.
 *
 * Dois caminhos, de propósito:
 *
 * 1. **O aparelho pareado.** O lojista cria um terminal no painel e lê um
 *    código curto no tablet uma vez. Dali em diante o balcão simplesmente
 *    abre — nenhum atendente digita senha em troca de turno, que é como esse
 *    tipo de programa morre na prática.
 * 2. **A conta com vínculo na loja.** O dono conferindo pelo celular, ou o
 *    gerente cobrindo um caixa. Não substitui o terminal; complementa.
 *
 * O que fica no tablet é um token longo em cookie httpOnly. Guardamos só o
 * hash: vazar o banco não entrega o direito de carimbar em loja nenhuma.
 */

export const COOKIE_DO_TERMINAL = "chorinho_pdv";

/** Um ano. O tablet do balcão não deve deslogar sozinho numa manhã de sábado. */
const VALIDADE_DO_TOKEN_SEGUNDOS = 365 * 24 * 60 * 60;

/** Meia hora para levar o código até o tablet e digitar. */
export const VALIDADE_DO_PAREAMENTO_SEGUNDOS = 30 * 60;

/**
 * Alfabeto sem 0/O, 1/I/L e outras confusões de leitura.
 *
 * O código é ditado em voz alta com frequência — do painel no computador para
 * quem está com o tablet na mão.
 */
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const gerarCodigoDePareamento = () =>
  Array.from({ length: 8 }, () => ALFABETO[randomInt(0, ALFABETO.length)]).join("");

export const gerarTokenDoTerminal = () => randomBytes(32).toString("base64url");

export const hashDoToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Comparação em tempo constante — o hash é curto e vem de entrada externa. */
const hashesIguais = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export type Terminal = { id: string; nome: string; establishmentId: string };

/** Lê o cookie do aparelho e devolve o terminal, se ele ainda vale. */
export const terminalDoAparelho = async (): Promise<Terminal | undefined> => {
  const token = (await cookies()).get(COOKIE_DO_TERMINAL)?.value;
  if (!token) return undefined;

  const admin = supabaseAdmin();
  const alvo = hashDoToken(token);

  const { data: terminal } = await admin
    .from("pos_terminals")
    .select("id, name, establishment_id, token_hash, revoked_at")
    .eq("token_hash", alvo)
    .maybeSingle();

  if (!terminal?.token_hash || terminal.revoked_at) return undefined;
  if (!hashesIguais(terminal.token_hash, alvo)) return undefined;

  // Sinal de vida, para o painel mostrar qual tablet está de fato em uso.
  // Falhar aqui não pode derrubar uma venda.
  void admin
    .from("pos_terminals")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", terminal.id)
    .then(() => undefined);

  return { id: terminal.id, nome: terminal.name, establishmentId: terminal.establishment_id };
};

/** Grava o token no aparelho. httpOnly: JavaScript da página nunca o lê. */
export const gravarCookieDoTerminal = async (token: string) => {
  (await cookies()).set(COOKIE_DO_TERMINAL, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VALIDADE_DO_TOKEN_SEGUNDOS,
  });
};

export const limparCookieDoTerminal = async () => {
  (await cookies()).delete(COOKIE_DO_TERMINAL);
};
