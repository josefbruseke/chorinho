import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { lerCartela, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/** Quantas carteiras conferimos contra a rede por chamada. */
const AMOSTRA_DE_CONFERENCIA = 25;

/**
 * A auditoria dos carimbos emitidos.
 *
 * Um programa de fidelidade sem auditoria é um convite: o atendente carimba o
 * próprio celular no fim do turno e ninguém nota. Aqui cada carimbo diz de qual
 * terminal saiu, por qual conta, em que venda, e qual transação o registrou na
 * rede — que é a parte que nem nós conseguimos reescrever depois.
 *
 * A conferência com a rede existe porque o Supabase é espelho, não verdade. Se
 * o espelho divergir, é aqui que aparece.
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

    const [{ data: vendas }, { data: terminais }, { data: saldos }] = await Promise.all([
      admin
        .from("sales")
        .select(
          "sale_ref, created_at, confirmed_at, amount_cents, stamps_issued, points_issued, status, tx_hash, erro, customer_wallet, pos_terminal_id, operator_profile_id",
        )
        .eq("establishment_id", loja.id)
        .gte("created_at", desde)
        .order("created_at", { ascending: false })
        .limit(500),
      admin.from("pos_terminals").select("id, name").eq("establishment_id", loja.id),
      admin
        .from("stamp_balances_cache")
        .select("wallet, balance, lifetime")
        .eq("establishment_id", loja.id)
        .order("lifetime", { ascending: false })
        .limit(AMOSTRA_DE_CONFERENCIA),
    ]);

    const nomeDoTerminal = new Map((terminais ?? []).map(t => [t.id, t.name]));
    const lista = vendas ?? [];
    const confirmadas = lista.filter(v => v.status === "confirmada");

    const porTerminal = new Map<string, { nome: string; vendas: number; carimbos: number; centavos: number }>();
    for (const v of confirmadas) {
      const chave = v.pos_terminal_id ?? "sem-terminal";
      const atual = porTerminal.get(chave) ?? {
        nome: v.pos_terminal_id ? (nomeDoTerminal.get(v.pos_terminal_id) ?? "terminal removido") : "sem terminal",
        vendas: 0,
        carimbos: 0,
        centavos: 0,
      };
      atual.vendas += 1;
      atual.carimbos += v.stamps_issued ?? 0;
      atual.centavos += v.amount_cents;
      porTerminal.set(chave, atual);
    }

    // Venda parada em "enviada" há mais de dez minutos é sinal de que o envio
    // morreu no meio. Vale o alerta: o cliente saiu sem o carimbo.
    const limiteDePaciencia = Date.now() - 10 * 60 * 1000;
    const travadas = lista.filter(v => v.status === "enviada" && new Date(v.created_at).getTime() < limiteDePaciencia);

    return NextResponse.json({
      loja: { nome: loja.nome, onchainId: loja.onchainId },
      periodoEmDias: dias,
      resumo: {
        vendas: confirmadas.length,
        carimbos: confirmadas.reduce((s, v) => s + (v.stamps_issued ?? 0), 0),
        pontos: confirmadas.reduce((s, v) => s + (v.points_issued ?? 0), 0),
        centavos: confirmadas.reduce((s, v) => s + v.amount_cents, 0),
        clientes: new Set(confirmadas.map(v => v.customer_wallet)).size,
        falhas: lista.filter(v => v.status === "falhou").length,
        travadas: travadas.length,
      },
      porTerminal: [...porTerminal.values()].sort((a, b) => b.carimbos - a.carimbos),
      conferencia: await conferirComARede(loja.onchainId, saldos ?? []),
      vendas: lista.slice(0, 100).map(v => ({
        ref: v.sale_ref,
        quando: v.created_at,
        centavos: v.amount_cents,
        carimbos: v.stamps_issued,
        status: v.status,
        erro: v.erro,
        tx: v.tx_hash,
        carteira: v.customer_wallet,
        terminal: v.pos_terminal_id ? (nomeDoTerminal.get(v.pos_terminal_id) ?? "removido") : null,
      })),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao montar a auditoria" }, { status: 500 });
  }
}

/**
 * Compara o espelho com a rede, carteira a carteira.
 *
 * Divergência aqui não significa fraude — significa que uma escrita no espelho
 * falhou depois da transação. Mas é exatamente o tipo de coisa que só aparece
 * se alguém olhar.
 */
const conferirComARede = async (
  onchainId: number | null,
  saldos: { wallet: string; balance: number; lifetime: number }[],
) => {
  if (onchainId === null || !relayerConfigurado() || saldos.length === 0) {
    return { conferidas: 0, divergentes: [] as { carteira: string; espelho: number; rede: number }[] };
  }

  const divergentes: { carteira: string; espelho: number; rede: number }[] = [];

  await Promise.all(
    saldos.map(async s => {
      try {
        const cartela = await lerCartela(BigInt(onchainId), s.wallet as `0x${string}`);
        if (cartela.total !== s.lifetime) {
          divergentes.push({ carteira: s.wallet, espelho: s.lifetime, rede: cartela.total });
        }
      } catch {
        // RPC fora do ar não é divergência; é ausência de resposta.
      }
    }),
  );

  return { conferidas: saldos.length, divergentes };
};
