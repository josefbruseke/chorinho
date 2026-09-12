import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { gerarTokenDoTerminal, gravarCookieDoTerminal, hashDoToken } from "~~/services/pdv/acesso";
import { acessoDeTesteLiberado } from "~~/services/teste/modo";

export const runtime = "nodejs";

/**
 * Entra no balcão de uma loja sem pareamento — só em modo de teste.
 *
 * Não abre caminho novo: cria um terminal de verdade e devolve o mesmo cookie
 * que `POST /api/pos/parear` devolveria. Daí em diante o PDV não sabe a
 * diferença, e continua recusando loja suspensa, loja fora da cadeia,
 * assinatura vencida e passe inválido — que é o ponto, porque um atalho que
 * também pula essas checagens não testaria nada.
 *
 * Com o modo desligado responde 404, não 403: um 403 confirmaria que a rota
 * existe.
 */
export async function POST(request: NextRequest) {
  // A mesma trava da vitrine: sem isto a chave protegeria a tela e deixaria
  // as rotas abertas, que e o que de fato carimba.
  const { liberado } = await acessoDeTesteLiberado();
  if (!liberado) return new NextResponse(null, { status: 404 });

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

  const { data: loja } = await admin.from("establishments").select("id, name, status").eq("id", lojaId).maybeSingle();
  if (!loja) return NextResponse.json({ erro: "loja não encontrada" }, { status: 404 });

  const token = gerarTokenDoTerminal();

  // Um terminal por loja, reaproveitado: sem isto cada clique deixaria uma
  // linha nova em `pos_terminals`, e o painel do lojista encheria de lixo.
  const { data: existente } = await admin
    .from("pos_terminals")
    .select("id")
    .eq("establishment_id", loja.id)
    .eq("name", "Terminal de teste")
    .maybeSingle();

  const campos = {
    token_hash: hashDoToken(token),
    device_label: "modo de teste",
    paired_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    revoked_at: null,
    pairing_code: null,
    pairing_expires_at: null,
  };

  const { error } = existente
    ? await admin.from("pos_terminals").update(campos).eq("id", existente.id)
    : await admin.from("pos_terminals").insert({ establishment_id: loja.id, name: "Terminal de teste", ...campos });

  if (error) {
    console.error("[teste] falha ao preparar o terminal:", error.message);
    return NextResponse.json({ erro: "não foi possível abrir o balcão" }, { status: 500 });
  }

  await gravarCookieDoTerminal(token);

  return NextResponse.json({ ok: true, loja: loja.name, status: loja.status });
}
