import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { assinarPasse, gerarCodigoCurto, passeConfigurado } from "~~/services/passe/servidor";
import { CODIGO_CURTO_VALIDADE_SEGUNDOS, PASSE_VALIDADE_SEGUNDOS, codificarPasse } from "~~/utils/pass";

export const runtime = "nodejs";

/**
 * Emite um passe para quem está logado.
 *
 * A carteira vem do PERFIL, nunca do corpo da requisição — senão qualquer um
 * pediria um passe apontando para a carteira de outra pessoa e receberia os
 * carimbos dela.
 */
export async function POST() {
  if (!passeConfigurado()) {
    return NextResponse.json({ erro: "PASS_HMAC_SECRET não configurado" }, { status: 503 });
  }

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const admin = supabaseAdmin();

  const { data: perfil } = await admin.from("profiles").select("wallet_address").eq("id", userId).maybeSingle();

  if (!perfil?.wallet_address) {
    return NextResponse.json({ erro: "carteira ainda não criada" }, { status: 409 });
  }

  const agora = Math.floor(Date.now() / 1000);
  const expira = agora + PASSE_VALIDADE_SEGUNDOS;
  const codigoCurto = gerarCodigoCurto();

  const { data: linha, error } = await admin
    .from("pass_nonces")
    .insert({
      profile_id: userId,
      short_code: codigoCurto,
      // O código curto vive mais: digitar à mão leva mais tempo que apontar a
      // câmera, e o QR se renova sozinho antes disso.
      expires_at: new Date((agora + CODIGO_CURTO_VALIDADE_SEGUNDOS) * 1000).toISOString(),
    })
    .select("nonce")
    .single();

  if (error || !linha) {
    return NextResponse.json({ erro: error?.message ?? "falha ao emitir" }, { status: 500 });
  }

  const payload = assinarPasse(perfil.wallet_address, linha.nonce, expira);

  return NextResponse.json({
    qr: codificarPasse(payload),
    codigoCurto,
    expiraEm: expira,
    validadeSegundos: PASSE_VALIDADE_SEGUNDOS,
  });
}
