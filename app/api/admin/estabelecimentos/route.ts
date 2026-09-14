import { NextResponse } from "next/server";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";

export const runtime = "nodejs";

/**
 * A fila de lojas da plataforma.
 *
 * Cadastro novo chega como `pendente` e fica parado até alguém da equipe
 * olhar. É de propósito: aprovar uma loja concede o direito de emitir carimbo
 * em nome do Chorinho — não é coisa que se automatize num formulário público.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  const admin = supabaseAdmin();
  const { data: lojas } = await admin
    .from("establishments")
    .select("id, slug, name, city, neighborhood, status, pos_limit, created_at, owner_profile_id")
    .order("created_at", { ascending: false })
    .limit(200);

  // M10: `assinatura` volta a esta listagem com a tabela `subscriptions` — é o
  // que diz à equipe quem está pagando e quem só está cadastrado.
  return NextResponse.json({
    lojas: (lojas ?? []).map(l => ({
      id: l.id,
      slug: l.slug,
      nome: l.name,
      lugar: l.neighborhood ?? l.city,
      status: l.status,
      limiteDePdv: l.pos_limit,
      criadaEm: l.created_at,
      temDono: Boolean(l.owner_profile_id),
    })),
  });
}
