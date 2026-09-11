import { NextResponse } from "next/server";
import { limparCookieDoTerminal } from "~~/services/pdv/acesso";

export const runtime = "nodejs";

/**
 * Desfaz o pareamento neste aparelho.
 *
 * Só apaga o cookie local: o terminal continua existindo no painel, e é de lá
 * que o lojista revoga de verdade. São coisas diferentes — "este tablet não é
 * mais o caixa 2" não é a mesma decisão que "o caixa 2 não existe mais".
 */
export async function POST() {
  await limparCookieDoTerminal();
  return NextResponse.json({ ok: true });
}
