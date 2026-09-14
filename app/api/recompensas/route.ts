import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";

export const runtime = "nodejs";

/**
 * Tudo o que dá para trocar no bairro.
 *
 * Funciona sem sessão de propósito: é a vitrine que convence alguém a criar
 * conta. Quem está logado ganha o contexto — quanto falta em cada uma.
 */
export async function GET() {
  const admin = supabaseAdmin();

  const { data: recompensas } = await admin
    .from("rewards")
    .select("id, title, description, stamp_cost, point_cost, max_redemptions, redeemed, establishment_id")
    .eq("active", true)
    .order("stamp_cost", { ascending: true });

  const ids = [...new Set((recompensas ?? []).map(r => r.establishment_id))];
  const { data: lojas } = await admin
    .from("establishments")
    .select("id, slug, name, category, neighborhood, city, status")
    .in("id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const porLoja = new Map((lojas ?? []).filter(l => l.status === "ativo").map(l => [l.id, l]));

  // Saldo por loja, para a tela saber o que já está ao alcance.
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  let saldoPorLoja = new Map<string, number>();

  if (userId) {
    const { data: saldos } = await admin
      .from("stamp_balances_cache")
      .select("establishment_id, balance")
      .eq("customer_profile_id", userId);
    saldoPorLoja = new Map((saldos ?? []).map(s => [s.establishment_id, s.balance]));
  }

  const catalogo = (recompensas ?? [])
    .map(r => {
      const loja = porLoja.get(r.establishment_id);
      if (!loja) return null;
      const saldo = saldoPorLoja.get(r.establishment_id) ?? 0;
      return {
        id: r.id,
        titulo: r.title,
        descricao: r.description,
        selos: r.stamp_cost,
        pontos: r.point_cost,
        esgotada: r.max_redemptions > 0 && r.redeemed >= r.max_redemptions,
        pronta: Boolean(userId) && saldo >= r.stamp_cost && r.point_cost === 0,
        falta: Math.max(0, r.stamp_cost - saldo),
        // Sem saldo de pontos, o que falta é o preço inteiro. A bandeira embaixo
        // diz à tela que este número é a ausência do dado, não uma medição.
        faltamPontos: r.point_cost,
        loja: {
          slug: loja.slug,
          nome: loja.name,
          categoria: loja.category,
          bairro: loja.neighborhood ?? loja.city,
        },
      };
    })
    .filter(Boolean);

  // M9: o ponto da cidade morava no PointsVault e não deixou tabela atrás de si.
  return NextResponse.json({ catalogo, pontos: 0, pontosIndisponiveis: true, logado: Boolean(userId) });
}
