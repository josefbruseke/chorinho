import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { lerAssinatura, lerRegra, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

type Janela = { vendas: number; carimbos: number; centavos: number; clientes: number };

const vazia = (): Janela => ({ vendas: 0, carimbos: 0, centavos: 0, clientes: 0 });

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
        .select("created_at, amount_cents, stamps_issued, customer_wallet, status")
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
      mes.centavos += v.amount_cents;
      clientesMes.add(v.customer_wallet);
      if (noDia) {
        hoje.vendas += 1;
        hoje.carimbos += v.stamps_issued ?? 0;
        hoje.centavos += v.amount_cents;
        clientesHoje.add(v.customer_wallet);
      }
    }
    hoje.clientes = clientesHoje.size;
    mes.clientes = clientesMes.size;

    const rede = await lerDaRede(loja.onchainId);

    // A lista de pendências é o que transforma o painel em ferramenta: sem
    // ela, o lojista descobre que a regra não está configurada quando um
    // cliente reclama no balcão.
    const pendencias: { chave: string; texto: string; para: string }[] = [];
    if (loja.onchainId === null) {
      pendencias.push({
        chave: "sem-registro",
        texto: "Sua loja ainda não foi registrada na rede. Sem isso o balcão não credita carimbo.",
        para: "/painel/loja",
      });
    } else if (rede && !rede.assinatura.ativa) {
      pendencias.push({
        chave: "assinatura",
        texto: "Assinatura vencida: o balcão para de emitir carimbo, mas continua entregando os prêmios já ganhos.",
        para: "/painel/assinatura",
      });
    }
    if (rede && !rede.regra.ativa) {
      pendencias.push({
        chave: "sem-regra",
        texto: "Configure quanto de compra vale um carimbo. Sem regra, nenhuma venda gera carimbo.",
        para: "/painel/regras",
      });
    }
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
      loja: { nome: loja.nome, onchainId: loja.onchainId, papel: loja.papel },
      hoje,
      mes,
      terminais: { ativos: terminais ?? 0, limite: loja.limiteDePdv },
      recompensas: recompensas ?? 0,
      rede,
      pendencias,
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao montar o resumo" }, { status: 500 });
  }
}

/** O que só a cadeia sabe: se a assinatura vale e qual regra o balcão aplica. */
const lerDaRede = async (onchainId: number | null) => {
  if (onchainId === null || !relayerConfigurado()) return null;
  try {
    const [assinatura, regra] = await Promise.all([lerAssinatura(BigInt(onchainId)), lerRegra(BigInt(onchainId))]);
    return { assinatura, regra };
  } catch {
    // RPC fora do ar: o painel mostra o que veio do banco e omite a parte da
    // rede, em vez de virar uma tela de erro inteira.
    return null;
  }
};
