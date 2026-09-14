import { type NextRequest, NextResponse } from "next/server";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";

export const runtime = "nodejs";

const STATUS_VALIDOS = ["na_fila", "enviada", "confirmada", "falhou"] as const;
type StatusDeVenda = (typeof STATUS_VALIDOS)[number];

const ehStatusValido = (valor: string | null): valor is StatusDeVenda =>
  STATUS_VALIDOS.includes(valor as StatusDeVenda);

/**
 * A auditoria da plataforma inteira — a mesma ideia de `merchant/auditoria`,
 * sem o filtro de loja. O nome da loja é resolvido numa segunda consulta em
 * vez de um embed do Supabase porque o tipo gerado não declara a relação
 * entre `sales` e `establishments`; duas consultas simples e sem surpresa de
 * tipo valem mais do que um embed que quebra silenciosamente.
 */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  const dias = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get("dias") ?? 30)));
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const statusParam = request.nextUrl.searchParams.get("status");
  const status = ehStatusValido(statusParam) ? statusParam : undefined;

  const admin = supabaseAdmin();
  let consulta = admin
    .from("sales")
    .select("sale_ref, establishment_id, created_at, stamps_issued, status, erro, customer_profile_id")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) consulta = consulta.eq("status", status);

  const { data: vendas } = await consulta;
  const lista = vendas ?? [];

  const idsDeLoja = [...new Set(lista.map(v => v.establishment_id))];
  const { data: lojas } =
    idsDeLoja.length > 0 ? await admin.from("establishments").select("id, name").in("id", idsDeLoja) : { data: [] };
  const nomeDaLoja = new Map((lojas ?? []).map(l => [l.id, l.name]));

  return NextResponse.json({
    periodoEmDias: dias,
    statusFiltro: status ?? "todas",
    resumo: {
      vendas: lista.length,
      carimbos: lista.reduce((soma, v) => soma + (v.stamps_issued ?? 0), 0),
      falhas: lista.filter(v => v.status === "falhou").length,
    },
    vendas: lista.map(v => ({
      ref: v.sale_ref,
      loja: nomeDaLoja.get(v.establishment_id) ?? "loja removida",
      quando: v.created_at,
      carimbos: v.stamps_issued,
      status: v.status,
      erro: v.erro,
      cliente: v.customer_profile_id,
    })),
  });
}
