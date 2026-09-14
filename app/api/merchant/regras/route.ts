import { NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * A regra que o balcão aplica hoje, igual para todas as lojas.
 *
 * O valor da compra saiu da conta — passou no balcão, ganhou um carimbo — e
 * com ele foram embora piso de ticket, centavos por carimbo e teto por venda.
 * Sobraram três números, e por enquanto os três são os mesmos em todo lugar:
 * carimbar a mesma pessoa em sequência é permitido, a sequência morre depois
 * de uma semana sem visita, e cada carimbo rende dez pontos da cidade.
 *
 * Servir isto como constante é mais honesto do que servir um formulário que
 * não grava: o lojista vê o que o caixa dele realmente faz.
 */
const REGRA_EM_VIGOR = {
  ativa: true,
  intervaloSegundos: 0,
  janelaDaSequenciaSegundos: 7 * 24 * 60 * 60,
  pontosPorCarimbo: 10,
} as const;

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    return NextResponse.json({
      loja: { nome: loja.nome },
      regra: REGRA_EM_VIGOR,
      motivo: "esta regra ainda é a mesma para todas as lojas — por enquanto ela não se ajusta por aqui.",
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao ler a regra" }, { status: 500 });
  }
}

/**
 * Ainda não há onde gravar.
 *
 * Responder 503 é a única saída honesta: aceitar o PUT e devolver `ok` faria a
 * tela dizer "regra salva" para uma escolha que o balcão nunca leria — e o
 * lojista só descobriria a mentira quando um cliente reclamasse no caixa.
 */
// M9: a tabela `accrual_rules` (uma linha por loja) é o que destrava esta
// escrita; até lá `REGRA_EM_VIGOR` acima é a verdade.
export async function PUT() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  return NextResponse.json(
    { erro: "ajustar a regra de carimbo ainda não está disponível — fale com a gente para mudar a sua" },
    { status: 503 },
  );
}
