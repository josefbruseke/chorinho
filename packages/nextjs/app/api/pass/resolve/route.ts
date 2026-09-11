import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { assinaturaConfere, passeConfigurado } from "~~/services/passe/servidor";
import { codigoCurtoValido, decodificarPasse, passeVencido } from "~~/utils/pass";

export const runtime = "nodejs";

/**
 * Resolve o passe lido no balcão e devolve a carteira do cliente.
 *
 * Quem chama é o PDV, autenticado e operando alguma loja. O passe é queimado na
 * primeira leitura: escanear a mesma tela duas vezes não credita duas vezes.
 *
 * As mensagens de erro são deliberadamente vagas para quem está do outro lado —
 * "passe inválido" e "passe expirado" não revelam se o nonce existe, o que
 * evita usar esta rota para descobrir passes válidos por tentativa.
 */
export async function POST(request: NextRequest) {
  if (!passeConfigurado()) {
    return NextResponse.json({ erro: "PASS_HMAC_SECRET não configurado" }, { status: 503 });
  }

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const admin = supabaseAdmin();

  // Só quem opera alguma loja pode resolver passe. Sem isso, qualquer cliente
  // logado descobriria a carteira de outro cliente lendo o QR dele.
  const { data: vinculo } = await admin
    .from("establishment_members")
    .select("establishment_id")
    .eq("profile_id", userId)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (!vinculo) {
    return NextResponse.json({ erro: "esta conta não opera nenhum balcão" }, { status: 403 });
  }

  let corpo: { qr?: unknown; codigo?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const agora = new Date();

  // ------------------------------------------------------- código curto
  if (typeof corpo.codigo === "string") {
    if (!codigoCurtoValido(corpo.codigo)) {
      return NextResponse.json({ erro: "código inválido" }, { status: 400 });
    }

    const { data: linha } = await admin
      .from("pass_nonces")
      .select("nonce, profile_id, expires_at, used_at")
      .eq("short_code", corpo.codigo.trim())
      .is("used_at", null)
      .gt("expires_at", agora.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!linha) return NextResponse.json({ erro: "código inválido ou expirado" }, { status: 404 });

    return finalizar(admin, linha.nonce, linha.profile_id, agora);
  }

  // ---------------------------------------------------------------- QR
  if (typeof corpo.qr !== "string") {
    return NextResponse.json({ erro: "informe o QR ou o código" }, { status: 400 });
  }

  const passe = decodificarPasse(corpo.qr);
  if (!passe) return NextResponse.json({ erro: "passe inválido" }, { status: 400 });

  // Assinatura antes de qualquer consulta: um passe forjado não deve nem
  // encostar no banco.
  if (!assinaturaConfere(passe)) {
    return NextResponse.json({ erro: "passe inválido" }, { status: 400 });
  }

  if (passeVencido(passe)) {
    return NextResponse.json({ erro: "passe expirado", expirado: true }, { status: 410 });
  }

  const { data: linha } = await admin
    .from("pass_nonces")
    .select("nonce, profile_id, used_at")
    .eq("nonce", passe.n)
    .maybeSingle();

  if (!linha) return NextResponse.json({ erro: "passe inválido" }, { status: 400 });
  if (linha.used_at) {
    return NextResponse.json({ erro: "este passe já foi usado", jaUsado: true }, { status: 409 });
  }

  return finalizar(admin, linha.nonce, linha.profile_id, agora);
}

/** Queima o nonce e devolve quem é o cliente. */
async function finalizar(admin: ReturnType<typeof supabaseAdmin>, nonce: string, profileId: string, agora: Date) {
  // Marca como usado condicionando a `used_at is null`: se duas leituras
  // chegarem juntas, só uma grava. É o mesmo raciocínio do `usedSaleRef` no
  // contrato, um nível acima.
  const { data: queimado } = await admin
    .from("pass_nonces")
    .update({ used_at: agora.toISOString() })
    .eq("nonce", nonce)
    .is("used_at", null)
    .select("nonce")
    .maybeSingle();

  if (!queimado) {
    return NextResponse.json({ erro: "este passe já foi usado", jaUsado: true }, { status: 409 });
  }

  const { data: perfil } = await admin
    .from("profiles")
    .select("wallet_address, display_name")
    .eq("id", profileId)
    .maybeSingle();

  if (!perfil?.wallet_address) {
    return NextResponse.json({ erro: "cliente sem carteira" }, { status: 409 });
  }

  return NextResponse.json({
    carteira: perfil.wallet_address,
    nome: perfil.display_name,
    profileId,
  });
}
