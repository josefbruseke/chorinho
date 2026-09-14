import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { gerarTokenDoTerminal, gravarCookieDoTerminal, hashDoToken } from "~~/services/pdv/acesso";

export const runtime = "nodejs";

/**
 * Pareia este aparelho com um balcão.
 *
 * O atendente digita o código uma única vez, na instalação. Daí em diante o
 * tablet abre o PDV direto — sem login, sem senha colada no monitor, sem
 * ninguém travado no começo do turno.
 *
 * O código morre no uso. O que fica é um token longo em cookie httpOnly, do
 * qual guardamos só o hash.
 */
export async function POST(request: NextRequest) {
  let corpo: { codigo?: unknown; aparelho?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const codigo = String(corpo.codigo ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

  if (codigo.length !== 8) return NextResponse.json({ erro: "código inválido" }, { status: 400 });

  const admin = supabaseAdmin();
  const agora = new Date();

  const { data: terminal } = await admin
    .from("pos_terminals")
    .select("id, name, establishment_id, pairing_expires_at, paired_at, revoked_at")
    .eq("pairing_code", codigo)
    .maybeSingle();

  // Mensagem única para código errado, vencido, já usado ou revogado: dizer
  // qual dos quatro foi entregaria a quem está tentando adivinhar exatamente
  // a informação que falta.
  const recusar = () => NextResponse.json({ erro: "código inválido ou já usado" }, { status: 404 });

  if (!terminal || terminal.revoked_at || terminal.paired_at) return recusar();
  if (!terminal.pairing_expires_at || new Date(terminal.pairing_expires_at) <= agora) return recusar();

  const { data: loja } = await admin
    .from("establishments")
    .select("name, status")
    .eq("id", terminal.establishment_id)
    .maybeSingle();

  if (!loja || loja.status !== "ativo") {
    return NextResponse.json({ erro: "esta loja não está ativa" }, { status: 403 });
  }

  const token = gerarTokenDoTerminal();
  const aparelho =
    String(corpo.aparelho ?? "")
      .trim()
      .slice(0, 60) || null;

  // Condicionado a `pairing_code` ainda existir: dois tablets lendo o mesmo
  // papel ao mesmo tempo, só um pareia.
  const { data: pareado } = await admin
    .from("pos_terminals")
    .update({
      token_hash: hashDoToken(token),
      pairing_code: null,
      pairing_expires_at: null,
      paired_at: agora.toISOString(),
      last_seen_at: agora.toISOString(),
      device_label: aparelho,
    })
    .eq("id", terminal.id)
    .eq("pairing_code", codigo)
    .select("id")
    .maybeSingle();

  if (!pareado) return recusar();

  await gravarCookieDoTerminal(token);

  return NextResponse.json({ terminal: { id: terminal.id, nome: terminal.name }, loja: loja.name });
}
