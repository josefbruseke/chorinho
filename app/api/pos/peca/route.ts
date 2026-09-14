import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { lerAtendimento } from "~~/services/passe/atendimento";
import { ErroDePdv, balcaoDoOperador } from "~~/services/pdv/emitir";

export const runtime = "nodejs";

/**
 * A peça no balcão — desligada.
 *
 * `GET` listava os colecionáveis daquele cliente que valiam NESTA loja, e
 * `POST` queimava um deles em troca de desconto. As duas coisas dependiam de
 * uma informação que hoje não existe em lugar nenhum: **quem tem qual peça**.
 * Isso morava num contrato ERC-1155, e não há tabela no lugar.
 *
 * Então a lista vem vazia e o uso responde 503. É feio de propósito: inventar
 * uma lista daria ao atendente um botão que tira do cliente uma peça que
 * ninguém sabe se ele tem, e responder `ok` sem queimar nada é pior ainda —
 * seria a loja dando desconto contra um colecionável que continua na coleção.
 *
 * O atendimento continua sendo conferido em ambas: um endereço que responde
 * 403 e 410 nas mesmas situações de antes é o que permite ligar isto de volta
 * sem mexer no PDV.
 */
// M9: volta inteiro quando existir `piece_holdings` — uma linha por cliente,
// peça e quantidade — e o desconto for calculado aqui em vez de na rede.
const AINDA_NAO = "o uso de peças ainda não está disponível";

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/** Confere que este atendimento é deste balcão, e devolve o erro se não for. */
const conferir = async (token: string) => {
  const atendimento = lerAtendimento(token);
  if (!atendimento) {
    return NextResponse.json({ erro: "o atendimento expirou — leia o passe do cliente de novo" }, { status: 410 });
  }

  const balcao = await balcaoDoOperador(await sessao());
  if (atendimento.balcaoId !== balcao.id) {
    return NextResponse.json({ erro: "este atendimento não é deste balcão" }, { status: 403 });
  }

  return undefined;
};

export async function GET(request: NextRequest) {
  try {
    const recusa = await conferir(request.nextUrl.searchParams.get("atendimento") ?? "");
    if (recusa) return recusa;

    return NextResponse.json({ pecas: [] });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[pdv] falha ao listar peças:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "não foi possível ler as peças do cliente" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let corpo: { atendimento?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  try {
    const recusa = await conferir(typeof corpo.atendimento === "string" ? corpo.atendimento : "");
    if (recusa) return recusa;

    return NextResponse.json({ erro: AINDA_NAO }, { status: 503 });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[pdv] falha ao usar a peça:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: AINDA_NAO }, { status: 503 });
  }
}
