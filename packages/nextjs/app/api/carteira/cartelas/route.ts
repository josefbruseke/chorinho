import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { lerPontos, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/**
 * As cartelas do cliente — a tela que ele abre para saber quanto falta.
 *
 * O saldo vem do espelho no Supabase, não da rede: a tela precisa abrir
 * instantânea, e uma chamada RPC por loja seria segundos de espera. A rede
 * continua sendo a verdade; quem escreve o espelho é o mesmo servidor que
 * envia a transação, no mesmo fluxo.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const admin = supabaseAdmin();

  const { data: perfil } = await admin.from("profiles").select("wallet_address").eq("id", userId).maybeSingle();
  const carteira = perfil?.wallet_address?.toLowerCase();
  if (!carteira) return NextResponse.json({ carteira: null, cartelas: [], pontos: 0 });

  const { data: saldos } = await admin
    .from("stamp_balances_cache")
    .select("establishment_id, balance, lifetime, streak_current, streak_best, last_visit_at")
    .eq("wallet", carteira)
    .order("last_visit_at", { ascending: false });

  const ids = (saldos ?? []).map(s => s.establishment_id);
  if (ids.length === 0) {
    return NextResponse.json({ carteira, cartelas: [], pontos: await pontosDaCidade(carteira) });
  }

  const [{ data: lojas }, { data: recompensas }] = await Promise.all([
    admin.from("establishments").select("id, slug, name, category, neighborhood, city, logo_path").in("id", ids),
    admin
      .from("rewards")
      .select("id, establishment_id, onchain_id, title, stamp_cost, point_cost")
      .in("establishment_id", ids)
      .eq("active", true)
      .order("stamp_cost", { ascending: true }),
  ]);

  const porLoja = new Map((lojas ?? []).map(l => [l.id, l]));
  const ofertasPorLoja = new Map<string, NonNullable<typeof recompensas>>();
  for (const r of recompensas ?? []) {
    const lista = ofertasPorLoja.get(r.establishment_id) ?? [];
    lista.push(r);
    ofertasPorLoja.set(r.establishment_id, lista);
  }

  const cartelas = (saldos ?? [])
    .map(s => {
      const loja = porLoja.get(s.establishment_id);
      if (!loja) return null;

      const ofertas = (ofertasPorLoja.get(s.establishment_id) ?? []).filter(o => o.stamp_cost > 0);
      const disponiveis = ofertas.filter(o => s.balance >= o.stamp_cost);
      // A meta é a próxima recompensa que ainda não dá para pegar. Quando já dá
      // para pegar todas, a meta vira a mais cara — senão a barra ficaria
      // cheia para sempre e o cliente perderia a razão de voltar.
      const proxima = ofertas.find(o => o.stamp_cost > s.balance) ?? ofertas.at(-1) ?? null;

      return {
        slug: loja.slug,
        nome: loja.name,
        categoria: loja.category,
        bairro: loja.neighborhood,
        cidade: loja.city,
        logoPath: loja.logo_path,
        saldo: s.balance,
        total: s.lifetime,
        sequencia: s.streak_current,
        melhorSequencia: s.streak_best,
        ultimaVisita: s.last_visit_at,
        meta: proxima ? { titulo: proxima.title, selos: proxima.stamp_cost } : null,
        disponiveis: disponiveis.length,
      };
    })
    .filter(Boolean);

  return NextResponse.json({ carteira, cartelas, pontos: await pontosDaCidade(carteira) });
}

/** O ponto compartilhado da rede mora só na cadeia — não há espelho para ele. */
const pontosDaCidade = async (carteira: string) => {
  if (!relayerConfigurado()) return 0;
  try {
    return await lerPontos(carteira as `0x${string}`);
  } catch {
    return 0;
  }
};
