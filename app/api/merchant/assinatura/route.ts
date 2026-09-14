import { NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * O preço do Chorinho: um produto só, medido em terminais.
 *
 * Não há recurso trancado atrás de faixa. A padaria de um caixa vê a mesma
 * tela que a rede de dez, porque o contrário obrigaria o lojista a descobrir
 * no meio do expediente que o plano dele não entrega o prêmio que ele já
 * prometeu ao cliente. O que cresce com o tamanho da loja é quantos balcões
 * carimbam ao mesmo tempo — é isso, e só isso, que a conta mede.
 */
const PLANOS = [
  { nome: "Até 3 caixas", terminaisDe: 1, terminaisAte: 3, centavosPorMes: 700 },
  { nome: "4 caixas ou mais", terminaisDe: 4, terminaisAte: null, centavosPorMes: 1_000 },
] as const;

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/**
 * O plano da loja e o preço que ele custa.
 *
 * `assinatura` vem nula porque ainda não existe onde guardá-la: o estado de
 * pagamento nasce junto com a cobrança, não antes dela. Devolver "vencida"
 * seria pior do que não devolver nada — a tela acusaria de caloteiro quem
 * nunca teve como pagar.
 */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);

    // M10: a cobrança traz a tabela `subscriptions`, e é dela que `assinatura`
    // passa a sair — mantida em dia pelo webhook do Stripe, nunca por esta rota.
    return NextResponse.json({
      loja: { nome: loja.nome },
      planos: PLANOS,
      assinatura: null,
      motivo: "a cobrança ainda não está no ar: nenhuma loja tem assinatura registrada",
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao ler a assinatura" }, { status: 500 });
  }
}
