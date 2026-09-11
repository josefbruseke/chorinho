import { NextResponse } from "next/server";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { lerAssinatura, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/**
 * A fila de lojas da plataforma.
 *
 * Cadastro novo chega como `pendente` e fica parado até alguém da equipe
 * olhar. É de propósito: registrar loja na cadeia custa gás e concede o
 * direito de emitir carimbo — não é coisa que se automatize num formulário
 * público.
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
    .select("id, slug, name, city, neighborhood, status, onchain_id, pos_limit, created_at, owner_profile_id")
    .order("created_at", { ascending: false })
    .limit(200);

  // A assinatura mora na cadeia; ler todas seria uma chamada RPC por loja. Só
  // as já registradas interessam aqui, e só quando há relayer configurado.
  const registradas = (lojas ?? []).filter(l => l.onchain_id !== null).slice(0, 40);
  const assinaturas = new Map<number, { ativa: boolean; plano: number; venceEm: number }>();

  if (relayerConfigurado()) {
    await Promise.all(
      registradas.map(async l => {
        try {
          assinaturas.set(l.onchain_id!, await lerAssinatura(BigInt(l.onchain_id!)));
        } catch {
          // RPC fora do ar não pode derrubar a listagem inteira.
        }
      }),
    );
  }

  return NextResponse.json({
    lojas: (lojas ?? []).map(l => ({
      id: l.id,
      slug: l.slug,
      nome: l.name,
      lugar: l.neighborhood ?? l.city,
      status: l.status,
      onchainId: l.onchain_id,
      limiteDePdv: l.pos_limit,
      criadaEm: l.created_at,
      temDono: Boolean(l.owner_profile_id),
      assinatura: l.onchain_id !== null ? (assinaturas.get(l.onchain_id) ?? null) : null,
    })),
  });
}
