import { NextResponse } from "next/server";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";

export const runtime = "nodejs";

/**
 * A primeira tela que a equipe da plataforma vê ao abrir o back office.
 *
 * Números grandes respondem "está tudo funcionando?" de relance; a lista de
 * atenção responde "o que eu preciso fazer agora?". As duas coisas vêm da
 * mesma consulta porque são a mesma pergunta feita de dois jeitos.
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
  const agora = Date.now();
  const desde7 = new Date(agora - 7 * 24 * 60 * 60 * 1000).toISOString();
  const desde30 = new Date(agora - 30 * 24 * 60 * 60 * 1000).toISOString();
  const desde24h = new Date(agora - 24 * 60 * 60 * 1000).toISOString();

  const [
    lojasAtivas,
    lojasPendentes,
    vendasConfirmadas,
    terminaisPareados,
    recompensasAtivas,
    resgatesConfirmados,
    vendasFalhas24h,
    carimbos7d,
    carimbos30d,
    listaLojasPendentes,
  ] = await Promise.all([
    admin.from("establishments").select("id", { count: "exact", head: true }).eq("status", "ativo"),
    admin.from("establishments").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    admin.from("sales").select("id", { count: "exact", head: true }).eq("status", "confirmada"),
    admin
      .from("pos_terminals")
      .select("id", { count: "exact", head: true })
      .not("paired_at", "is", null)
      .is("revoked_at", null),
    admin.from("rewards").select("id", { count: "exact", head: true }).eq("active", true),
    admin.from("redemptions").select("id", { count: "exact", head: true }).eq("status", "confirmada"),
    admin.from("sales").select("id", { count: "exact", head: true }).eq("status", "falhou").gte("created_at", desde24h),
    admin.from("sales").select("stamps_issued").eq("status", "confirmada").gte("created_at", desde7),
    admin
      .from("sales")
      .select("stamps_issued, customer_profile_id")
      .eq("status", "confirmada")
      .gte("created_at", desde30),
    admin
      .from("establishments")
      .select("id, name")
      .eq("status", "pendente")
      .order("created_at", { ascending: true })
      .limit(5),
  ]);

  // Contagem "d30" também alimenta clientes únicos: é a mesma janela, e pedir
  // duas vezes ao banco só para separar as métricas seria desperdício.
  const clientesUnicos30d = new Set((carimbos30d.data ?? []).map(v => v.customer_profile_id)).size;

  return NextResponse.json({
    lojas: { ativas: lojasAtivas.count ?? 0, pendentes: lojasPendentes.count ?? 0 },
    carimbos: {
      d7: (carimbos7d.data ?? []).reduce((soma, v) => soma + (v.stamps_issued ?? 0), 0),
      d30: (carimbos30d.data ?? []).reduce((soma, v) => soma + (v.stamps_issued ?? 0), 0),
    },
    vendas: vendasConfirmadas.count ?? 0,
    clientesUnicos30d,
    terminaisPareados: terminaisPareados.count ?? 0,
    recompensasAtivas: recompensasAtivas.count ?? 0,
    resgates: resgatesConfirmados.count ?? 0,
    atencao: {
      lojasPendentes: (listaLojasPendentes.data ?? []).map(l => ({ id: l.id, nome: l.name })),
      vendasFalhas24h: vendasFalhas24h.count ?? 0,
    },
  });
}
