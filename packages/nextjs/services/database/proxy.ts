import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Rotas que exigem alguém logado. O papel é conferido depois, no servidor.
 *
 * `/pdv` fica de fora de propósito: o tablet do caixa não tem sessão da
 * Supabase, ele opera por um terminal pareado guardado em cookie httpOnly.
 * Mandar o balcão para a tela de login seria trancá-lo fora da própria casa —
 * o atendente veria um formulário de e-mail e senha que ninguém ali tem. Quem
 * barra acesso indevido é o `balcaoDoOperador`, em cada rota de API, e a tela
 * de pareamento.
 */
const PRECISA_SESSAO = ["/carteira", "/passe", "/perfil", "/recompensas", "/painel", "/admin", "/cadastro"];

/** Rotas do próprio fluxo de entrada — nunca podem redirecionar para si mesmas. */
const LIVRES = ["/entrar", "/auth", "/sem-acesso"];

const exige = (pathname: string) => PRECISA_SESSAO.some(p => pathname === p || pathname.startsWith(`${p}/`));
const eLivre = (pathname: string) => LIVRES.some(p => pathname.startsWith(p));

/**
 * Renova a sessão a cada requisição e barra o que exige login.
 *
 * Estrutura copiada do exemplo oficial da Supabase, e os avisos dele valem
 * literalmente: não rode nada entre `createServerClient` e `getClaims()`, e
 * devolva o `resposta` original — montar outro `NextResponse` sem copiar os
 * cookies desconecta o usuário de forma aleatória e dificílima de depurar.
 *
 * `getClaims()` e não `getSession()`: só ele valida a assinatura do JWT contra
 * as chaves públicas do projeto. `getSession()` não revalida e não deve ser
 * usado em código de servidor.
 */
export const updateSession = async (request: NextRequest) => {
  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (paraGravar, headers) => {
          paraGravar.forEach(({ name, value }) => request.cookies.set(name, value));
          resposta = NextResponse.next({ request });
          paraGravar.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
          Object.entries(headers).forEach(([chave, valor]) => resposta.headers.set(chave, valor));
        },
      },
    },
  );

  // Nada entre a linha acima e a de baixo. Sério.
  const { data } = await supabase.auth.getClaims();

  const pathname = request.nextUrl.pathname;

  if (!data?.claims && exige(pathname) && !eLivre(pathname)) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/entrar";
    destino.searchParams.set("proximo", pathname);
    return NextResponse.redirect(destino);
  }

  return resposta;
};
