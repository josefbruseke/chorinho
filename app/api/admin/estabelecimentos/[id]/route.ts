import { type NextRequest, NextResponse } from "next/server";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import type { TablesUpdate } from "~~/services/database/types";

export const runtime = "nodejs";

/**
 * As decisões da equipe sobre uma loja: aprovar, suspender e ajustar o limite
 * de terminais.
 *
 * Aprovar é uma mudança de `status` e nada mais — é barato, é reversível, e é
 * o que destrava o balcão da loja.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  // M10: a renovação manual continua fazendo sentido depois da cobrança —
  // piloto, loja em teste e caso de suporte precisam de uma saída que não
  // passe por cartão. Ela volta escrevendo em `subscriptions`; recusar agora é
  // melhor do que aceitar e não guardar em lugar nenhum.
  if (corpo.assinaturaAteEm !== undefined) {
    return NextResponse.json(
      { erro: "renovar assinatura à mão ainda não está disponível: a cobrança não entrou no ar" },
      { status: 503 },
    );
  }

  const admin = supabaseAdmin();
  const { data: loja } = await admin.from("establishments").select("id").eq("id", id).maybeSingle();

  if (!loja) return NextResponse.json({ erro: "loja não encontrada" }, { status: 404 });

  const mudancas: TablesUpdate<"establishments"> = {};

  if (typeof corpo.status === "string") {
    if (!["rascunho", "pendente", "ativo", "suspenso"].includes(corpo.status)) {
      return NextResponse.json({ erro: "status inválido" }, { status: 400 });
    }
    mudancas.status = corpo.status as TablesUpdate<"establishments">["status"];
  }

  if (corpo.limiteDePdv !== undefined) {
    const limite = Number(corpo.limiteDePdv);
    if (!Number.isInteger(limite) || limite < 1 || limite > 200) {
      return NextResponse.json({ erro: "o limite de terminais precisa estar entre 1 e 200" }, { status: 400 });
    }
    mudancas.pos_limit = limite;
  }

  if (Object.keys(mudancas).length > 0) {
    mudancas.updated_at = new Date().toISOString();
    const { error } = await admin.from("establishments").update(mudancas).eq("id", id);
    if (error) return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
