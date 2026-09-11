import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";

/**
 * Destino do OAuth e do link de confirmação por e-mail. Troca o código por
 * sessão e devolve o usuário para onde ele estava indo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const proximo = searchParams.get("proximo") ?? "/mapa";

  // `proximo` vem da URL, então só aceitamos caminho interno — sem isso o link
  // de login vira redirecionamento aberto para qualquer site.
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : "/mapa";

  if (!code) {
    return NextResponse.redirect(`${origin}/entrar?erro=codigo_ausente`);
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/entrar?erro=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
