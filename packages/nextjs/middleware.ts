import { type NextRequest, NextResponse } from "next/server";

/**
 * Guarda de acesso por flavor.
 *
 * Hoje só declara o mapa de rotas protegidas e deixa passar: a sessão de
 * verdade chega com o Supabase Auth, ainda no M2. A estrutura entra agora para
 * que nenhuma rota nova nasça fora do controle.
 *
 * Duas regras que valem desde já:
 *
 * 1. O middleware é conveniência de navegação, NUNCA a barreira de segurança.
 *    Toda rota de /api revalida papel no servidor. Quem confia só no middleware
 *    entrega o back office para quem digitar a URL.
 *
 * 2. Nada de consultar banco aqui. A decisão sai do próprio token, porque isso
 *    roda em toda navegação e o PDV não pode esperar ida e volta ao banco entre
 *    um cliente e o próximo.
 */

type Flavor = "cliente" | "merchant" | "pos" | "admin" | "dev";

const PROTEGIDAS: { prefixo: string; flavor: Flavor }[] = [
  { prefixo: "/carteira", flavor: "cliente" },
  { prefixo: "/passe", flavor: "cliente" },
  { prefixo: "/perfil", flavor: "cliente" },
  { prefixo: "/recompensas", flavor: "cliente" },
  { prefixo: "/painel", flavor: "merchant" },
  { prefixo: "/pdv", flavor: "pos" },
  { prefixo: "/admin", flavor: "admin" },
  { prefixo: "/debug", flavor: "dev" },
  { prefixo: "/blockexplorer", flavor: "dev" },
];

export const flavorDaRota = (pathname: string): Flavor | undefined =>
  PROTEGIDAS.find(({ prefixo }) => pathname === prefixo || pathname.startsWith(`${prefixo}/`))?.flavor;

export function middleware(request: NextRequest) {
  const flavor = flavorDaRota(request.nextUrl.pathname);

  // Sem sessão ainda: as rotas seguem abertas para o desenvolvimento do M2.
  // Quando o Supabase Auth entrar, é aqui que a sessão é lida e o papel
  // comparado com `flavor`, redirecionando para /entrar ou /sem-acesso.
  if (!flavor) return NextResponse.next();

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/carteira/:path*",
    "/passe",
    "/perfil/:path*",
    "/recompensas/:path*",
    "/painel/:path*",
    "/pdv/:path*",
    "/admin/:path*",
    "/debug/:path*",
    "/blockexplorer/:path*",
  ],
};
