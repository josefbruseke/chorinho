import type { NextRequest } from "next/server";
import { updateSession } from "~~/services/database/proxy";

/**
 * No Next 16 este arquivo se chama `proxy.ts`, não `middleware.ts`.
 *
 * Ele é conveniência de navegação, NUNCA a barreira de segurança: só confere
 * se existe sessão. O papel — cliente, lojista, operador, admin — é validado
 * no servidor, em cada rota de API e em cada layout de flavor. Quem confia só
 * nisto aqui entrega o back office para quem digitar a URL.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Tudo, menos estático e imagem — a sessão precisa ser renovada em toda
    // navegação, não só nas rotas protegidas.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
