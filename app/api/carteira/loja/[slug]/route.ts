import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";

export const runtime = "nodejs";

/**
 * A cartela de uma loja só, com o catálogo dela.
 *
 * Existe separada da lista porque aqui entra o que a lista não precisa: todas
 * as recompensas, não só a próxima, e o histórico de visitas.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const admin = supabaseAdmin();

  const { data: loja } = await admin
    .from("establishments")
    .select("id, slug, name, category, neighborhood, city, description, logo_path, cover_path")
    .eq("slug", slug)
    .maybeSingle();

  if (!loja) return NextResponse.json({ erro: "loja não encontrada" }, { status: 404 });

  const [{ data: saldo }, { data: recompensas }] = await Promise.all([
    admin
      .from("stamp_balances_cache")
      .select("balance, lifetime, streak_current, streak_best, last_visit_at")
      .eq("customer_profile_id", userId)
      .eq("establishment_id", loja.id)
      .maybeSingle(),
    admin
      .from("rewards")
      .select("id, title, description, stamp_cost, point_cost, max_redemptions, redeemed")
      .eq("establishment_id", loja.id)
      .eq("active", true)
      .order("stamp_cost", { ascending: true }),
  ]);

  const carimbos = saldo?.balance ?? 0;

  return NextResponse.json({
    loja: {
      slug: loja.slug,
      nome: loja.name,
      categoria: loja.category,
      bairro: loja.neighborhood,
      cidade: loja.city,
      descricao: loja.description,
    },
    cartela: {
      saldo: carimbos,
      total: saldo?.lifetime ?? 0,
      sequencia: saldo?.streak_current ?? 0,
      melhorSequencia: saldo?.streak_best ?? 0,
      ultimaVisita: saldo?.last_visit_at ?? null,
    },
    ...SEM_PONTOS,
    recompensas: (recompensas ?? []).map(r => ({
      id: r.id,
      titulo: r.title,
      descricao: r.description,
      selos: r.stamp_cost,
      pontos: r.point_cost,
      esgotada: r.max_redemptions > 0 && r.redeemed >= r.max_redemptions,
      // Quem confere de novo é a troca no balcão. Isto aqui é só para a tela
      // saber o que destacar — nunca é a autorização. Prêmio que custa ponto
      // não fica pronto para ninguém enquanto não houver saldo de pontos: dizer
      // "pode pegar" sem saber é o cliente descobrindo o contrário na fila.
      pronta: carimbos >= r.stamp_cost && r.point_cost === 0,
    })),
  });
}

// M9: o ponto da cidade vivia no PointsVault e não tem tabela que o substitua.
// Zero com a bandeira junto, para a tela poder dizer "indisponível" em vez de
// "você tem zero".
const SEM_PONTOS = { pontos: 0, pontosIndisponiveis: true } as const;
