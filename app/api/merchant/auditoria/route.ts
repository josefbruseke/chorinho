import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * A auditoria dos carimbos emitidos.
 *
 * Um programa de fidelidade sem auditoria é um convite: o atendente carimba o
 * próprio celular no fim do turno e ninguém nota. Aqui cada carimbo diz de qual
 * terminal saiu, por qual conta e em que venda — e o lojista consegue olhar a
 * fita inteira do período sem pedir nada a ninguém.
 */
export async function GET(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const dias = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get("dias") ?? 30)));
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const [{ data: vendas }, { data: terminais }] = await Promise.all([
      admin
        .from("sales")
        .select(
          "sale_ref, created_at, confirmed_at, stamps_issued, points_issued, status, erro, customer_profile_id, pos_terminal_id, operator_profile_id",
        )
        .eq("establishment_id", loja.id)
        .gte("created_at", desde)
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("pos_terminals").select("id, name").eq("establishment_id", loja.id),
    ]);

    const nomeDoTerminal = new Map((terminais ?? []).map(t => [t.id, t.name]));
    const lista = vendas ?? [];
    const confirmadas = lista.filter(v => v.status === "confirmada");

    const porTerminal = new Map<string, { nome: string; vendas: number; carimbos: number }>();
    for (const v of confirmadas) {
      const chave = v.pos_terminal_id ?? "sem-terminal";
      const atual = porTerminal.get(chave) ?? {
        nome: v.pos_terminal_id ? (nomeDoTerminal.get(v.pos_terminal_id) ?? "terminal removido") : "sem terminal",
        vendas: 0,
        carimbos: 0,
      };
      atual.vendas += 1;
      atual.carimbos += v.stamps_issued ?? 0;
      porTerminal.set(chave, atual);
    }

    // Venda parada em "enviada" há mais de dez minutos é sinal de que o envio
    // morreu no meio. Vale o alerta: o cliente saiu sem o carimbo.
    const limiteDePaciencia = Date.now() - 10 * 60 * 1000;
    const travadas = lista.filter(v => v.status === "enviada" && new Date(v.created_at).getTime() < limiteDePaciencia);

    return NextResponse.json({
      loja: { nome: loja.nome },
      periodoEmDias: dias,
      resumo: {
        vendas: confirmadas.length,
        carimbos: confirmadas.reduce((s, v) => s + (v.stamps_issued ?? 0), 0),
        pontos: confirmadas.reduce((s, v) => s + (v.points_issued ?? 0), 0),
        clientes: new Set(confirmadas.map(v => v.customer_profile_id)).size,
        falhas: lista.filter(v => v.status === "falhou").length,
        travadas: travadas.length,
      },
      porTerminal: [...porTerminal.values()].sort((a, b) => b.carimbos - a.carimbos),
      vendas: lista.slice(0, 100).map(v => ({
        ref: v.sale_ref,
        quando: v.created_at,
        carimbos: v.stamps_issued,
        status: v.status,
        erro: v.erro,
        cliente: v.customer_profile_id,
        terminal: v.pos_terminal_id ? (nomeDoTerminal.get(v.pos_terminal_id) ?? "removido") : null,
      })),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao montar a auditoria" }, { status: 500 });
  }
}
