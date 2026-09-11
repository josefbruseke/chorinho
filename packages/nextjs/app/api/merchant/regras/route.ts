import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { ABI_REGRA_ESCRITA } from "~~/services/relayer/abi";
import { erroDoContrato, escreverComoAdmin, lerRegra, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/** Um dia. Acima disso a "sequência" deixa de significar hábito. */
const JANELA_MAXIMA_SEGUNDOS = 90 * 24 * 60 * 60;

/** Classe de ponto padrão da rede — o ponto da cidade. */
const PONTO_DA_CIDADE = 1n;

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/**
 * A regra que o balcão aplica em toda venda.
 *
 * Ela vive na cadeia, não aqui: é o que impede a plataforma de, numa
 * atualização mal feita, mudar silenciosamente quanto vale o carimbo de uma
 * loja. O lojista não assina nada — quem escreve é a plataforma, depois de
 * conferir que aquela conta administra aquela loja.
 */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    if (loja.onchainId === null || !relayerConfigurado()) {
      return NextResponse.json({ loja: { nome: loja.nome }, regra: null, motivo: "loja ainda não registrada na rede" });
    }
    return NextResponse.json({ loja: { nome: loja.nome }, regra: await lerRegra(BigInt(loja.onchainId)) });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao ler a regra" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const inteiro = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 ? n : null;
  };

  const piso = inteiro(corpo.pisoDeTicketCentavos);
  const porCarimbo = inteiro(corpo.centavosPorCarimbo);
  const teto = inteiro(corpo.tetoPorVenda);
  const intervalo = inteiro(corpo.intervaloSegundos);
  const janela = inteiro(corpo.janelaDaSequenciaSegundos);
  const pontos = inteiro(corpo.pontosPorCarimbo);
  const ativa = corpo.ativa !== false;

  // Cada limite aqui existe por um motivo prático, não por burocracia:
  // centsPerStamp zero dividiria por zero no contrato; teto zero faria toda
  // venda gerar zero carimbo; e janela de sequência absurda transformaria
  // "voltou no mês passado" em hábito.
  if (!porCarimbo || porCarimbo < 100) {
    return NextResponse.json({ erro: "cada carimbo precisa valer pelo menos R$ 1,00 de compra" }, { status: 400 });
  }
  if (piso === null || piso > 1_000_000) {
    return NextResponse.json({ erro: "piso de ticket inválido" }, { status: 400 });
  }
  if (!teto || teto > 500) {
    return NextResponse.json({ erro: "o teto por venda precisa estar entre 1 e 500 carimbos" }, { status: 400 });
  }
  if (intervalo === null || intervalo > 24 * 60 * 60) {
    return NextResponse.json({ erro: "o intervalo entre carimbos não pode passar de 24 horas" }, { status: 400 });
  }
  if (janela === null || janela > JANELA_MAXIMA_SEGUNDOS) {
    return NextResponse.json({ erro: "a janela da sequência não pode passar de 90 dias" }, { status: 400 });
  }
  if (pontos === null || pontos > 10_000) {
    return NextResponse.json({ erro: "pontos por carimbo fora do limite" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    if (loja.onchainId === null) {
      return NextResponse.json({ erro: "sua loja ainda não foi registrada na rede" }, { status: 409 });
    }
    if (!relayerConfigurado()) {
      return NextResponse.json({ erro: "a plataforma não consegue escrever na rede agora" }, { status: 503 });
    }

    const hash = await escreverComoAdmin("StampLedger", ABI_REGRA_ESCRITA, "setAccrualRule", [
      BigInt(loja.onchainId),
      {
        minTicketCents: BigInt(piso),
        centsPerStamp: BigInt(porCarimbo),
        maxStampsPerTx: teto,
        cooldownSeconds: intervalo,
        streakWindowSeconds: janela,
        pointsPerStamp: pontos,
        pointTypeId: PONTO_DA_CIDADE,
        active: ativa,
      },
    ]);

    return NextResponse.json({ ok: true, tx: hash });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });

    console.error("[painel] falha ao gravar a regra:", e instanceof Error ? e.message : e);
    const nome = erroDoContrato(e)?.nome;
    if (nome === "InvalidRule") return NextResponse.json({ erro: "a rede recusou esta regra" }, { status: 422 });
    if (nome === "NotOperator") {
      return NextResponse.json({ erro: "a plataforma não tem permissão para escrever nesta loja" }, { status: 403 });
    }
    return NextResponse.json({ erro: "não foi possível gravar a regra agora" }, { status: 500 });
  }
}
