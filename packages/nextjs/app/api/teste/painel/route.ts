import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { COOKIE_DA_LOJA_DE_TESTE, modoDeTesteLigado } from "~~/services/teste/modo";

export const runtime = "nodejs";

/** A conta que o modo de teste usa. Existe só onde o modo está ligado. */
const EMAIL = "modo-de-teste@chorinho.local";

/**
 * Abre o painel de uma loja qualquer — só em modo de teste.
 *
 * O painel é preso à identidade por desenho, e cada uma das onze rotas confere
 * a sessão por conta própria. Furar isso significaria remover autenticação em
 * onze lugares, e um deles esquecido ligado é um estrago que ninguém vê.
 *
 * Então aqui não se fura nada: cria-se uma conta de verdade e ENTRA-SE com ela.
 * A sessão que sai daqui é indistinguível de um login normal, o proxy e as onze
 * rotas seguem intactos, e desligar o modo de teste basta para fechar a porta —
 * sem precisar lembrar de desfazer nada no código.
 *
 * A loja escolhida vai num cookie que só `lojaDoGestor` lê, e só com o modo
 * ligado.
 */
export async function POST(request: NextRequest) {
  if (!modoDeTesteLigado()) return new NextResponse(null, { status: 404 });

  let corpo: { lojaId?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const lojaId = String(corpo.lojaId ?? "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lojaId)) {
    return NextResponse.json({ erro: "loja inválida" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: loja } = await admin.from("establishments").select("id, name").eq("id", lojaId).maybeSingle();
  if (!loja) return NextResponse.json({ erro: "loja não encontrada" }, { status: 404 });

  // Senha longa e aleatória a cada vez: ela não precisa ser lembrada por
  // ninguém, e uma fixa no código viraria credencial válida no dia em que o
  // modo de teste fosse ligado por engano num lugar público.
  const senha = `t-${crypto.randomUUID()}-${crypto.randomUUID()}`;

  const { data: existentes } = await admin.auth.admin.listUsers({ perPage: 200 });
  const ja = existentes?.users.find(u => u.email === EMAIL);

  const { error: eConta } = ja
    ? await admin.auth.admin.updateUserById(ja.id, { password: senha })
    : await admin.auth.admin.createUser({ email: EMAIL, password: senha, email_confirm: true });

  if (eConta) {
    console.error("[teste] falha ao preparar a conta:", eConta.message);
    return NextResponse.json({ erro: "não foi possível preparar a conta de teste" }, { status: 500 });
  }

  // O cliente de servidor grava os cookies da sessão — daqui em diante é um
  // login como qualquer outro.
  const supabase = await supabaseServer();
  const { error: eLogin } = await supabase.auth.signInWithPassword({ email: EMAIL, password: senha });

  if (eLogin) {
    console.error("[teste] falha ao entrar:", eLogin.message);
    return NextResponse.json({ erro: "não foi possível entrar" }, { status: 500 });
  }

  (await cookies()).set(COOKIE_DA_LOJA_DE_TESTE, loja.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ ok: true, loja: loja.name });
}
