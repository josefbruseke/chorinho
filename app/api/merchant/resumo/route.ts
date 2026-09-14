import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

type Janela = { vendas: number; carimbos: number; clientes: number };

const vazia = (): Janela => ({ vendas: 0, carimbos: 0, clientes: 0 });

/**
 * A primeira tela do lojista.
 *
 * Ele abre isto entre um cliente e outro, com o celular apoiado na
 * registradora. Então responde três perguntas e para: o que aconteceu hoje, o
 * que está me impedindo de funcionar, e onde eu aperto para resolver.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const inicioDoDia = new Date();
    inicioDoDia.setHours(0, 0, 0, 0);
    const trintaDias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [{ data: vendas }, { count: terminais }, { count: recompensas }] = await Promise.all([
      admin
        .from("sales")
        .select("created_at, stamps_issued, customer_profile_id, status")
        .eq("establishment_id", loja.id)
        .eq("status", "confirmada")
        .gte("created_at", trintaDias.toISOString()),
      admin
        .from("pos_terminals")
        .select("id", { count: "exact", head: true })
        .eq("establishment_id", loja.id)
        .is("revoked_at", null),
      admin
        .from("rewards")
        .select("id", { count: "exact", head: true })
        .eq("establishment_id", loja.id)
        .eq("active", true),
    ]);

    const hoje = vazia();
    const mes = vazia();
    const clientesHoje = new Set<string>();
    const clientesMes = new Set<string>();

    for (const v of vendas ?? []) {
      const noDia = new Date(v.created_at) >= inicioDoDia;
      mes.vendas += 1;
      mes.carimbos += v.stamps_issued ?? 0;
      clientesMes.add(v.customer_profile_id);
      if (noDia) {
        hoje.vendas += 1;
        hoje.carimbos += v.stamps_issued ?? 0;
        clientesHoje.add(v.customer_profile_id);
      }
    }
    hoje.clientes = clientesHoje.size;
    mes.clientes = clientesMes.size;

    // A lista de pendências é o que transforma o painel em ferramenta: sem
    // ela, o lojista descobre que falta terminal quando um cliente reclama no
    // balcão.
    //
    // M9: a pendência de regra de acúmulo volta com `accrual_rules` — hoje a
    // regra é a mesma para todo mundo e não há o que o lojista deixar de fazer.
    // M10: a de assinatura vencida volta com `subscriptions`, junto da cobrança.
    const pendencias: { chave: string; texto: string; para: string }[] = [];
    if ((terminais ?? 0) === 0) {
      pendencias.push({
        chave: "sem-terminal",
        texto: "Nenhum aparelho ligado ao balcão. Crie um terminal e leve o código até o caixa.",
        para: "/painel/pdv",
      });
    }
    if ((recompensas ?? 0) === 0) {
      pendencias.push({
        chave: "sem-recompensa",
        texto: "Cadastre pelo menos um prêmio. Cartela sem prêmio no fim não faz ninguém voltar.",
        para: "/painel/recompensas",
      });
    }

    return NextResponse.json({
      loja: { nome: loja.nome, papel: loja.papel },
      hoje,
      mes,
      terminais: { ativos: terminais ?? 0, limite: loja.limiteDePdv },
      recompensas: recompensas ?? 0,
      pendencias,
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao montar o resumo" }, { status: 500 });
  }
}
