import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { INICIO_DO_APP } from "~~/utils/rotas";

/**
 * Destino do OAuth e do link de confirmação por e-mail. Troca o código por
 * sessão e devolve o usuário para onde ele estava indo.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const proximo = searchParams.get("proximo") ?? INICIO_DO_APP;

  // `proximo` vem da URL, então só aceitamos caminho interno — sem isso o link
  // de login vira redirecionamento aberto para qualquer site.
  const destino = proximo.startsWith("/") && !proximo.startsWith("//") ? proximo : INICIO_DO_APP;

  // Quando o Google (ou a Supabase) recusa, o retorno vem com `error` e sem
  // `code`. Sem tratar isto antes, a recusa cai no ramo do código ausente e o
  // motivo real — provedor desligado, URI não autorizada, consentimento negado
  // — se perde no caminho.
  const recusa = searchParams.get("error_description") ?? searchParams.get("error");
  if (recusa) {
    return NextResponse.redirect(`${origin}/entrar?erro=${encodeURIComponent(recusa)}`);
  }

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
