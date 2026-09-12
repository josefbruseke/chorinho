import { type NextRequest, NextResponse } from "next/server";
import {
  descontoDaPeca,
  programaValeNaLoja,
  redeConfigurada,
  saldoDasPecas,
  usarPeca,
} from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { lerAtendimento } from "~~/services/passe/atendimento";
import { ErroDePdv, balcaoDoOperador } from "~~/services/pdv/emitir";
import { erroDoContrato } from "~~/services/relayer/servidor";
import { urlDaMidia } from "~~/utils/midia";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * A peça no balcão.
 *
 * `GET` lista as peças que ESTE cliente tem e que valem NESTA loja; `POST`
 * queima uma delas em troca do desconto.
 *
 * As duas condições do filtro importam, e a segunda é a que sustenta a pool: a
 * peça de um programa conjunto só aparece onde a loja aceitou o convite. Uma
 * loja que não entrou não é obrigada a honrar o desconto da vizinha, e o
 * atendente não precisa saber disso — a peça simplesmente não está na lista.
 */

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

export async function GET(request: NextRequest) {
  if (!redeConfigurada()) return NextResponse.json({ erro: "a rede não está configurada aqui" }, { status: 503 });

  const userId = await sessao();
  const token = request.nextUrl.searchParams.get("atendimento") ?? "";
  const contaCentavos = Number(request.nextUrl.searchParams.get("conta") ?? 0);

  const atendimento = lerAtendimento(token);
  if (!atendimento) {
    return NextResponse.json({ erro: "o atendimento expirou — leia o passe do cliente de novo" }, { status: 410 });
  }

  try {
    const balcao = await balcaoDoOperador(userId);
    if (atendimento.balcaoId !== balcao.id) {
      return NextResponse.json({ erro: "este atendimento não é deste balcão" }, { status: 403 });
    }

    const admin = supabaseAdmin();
    const { data: pecas } = await admin
      .from("pieces")
      .select("id, onchain_id, title, description, image_path, level, ends_at, program_id")
      .eq("active", true)
      .not("onchain_id", "is", null);

    const tokenIds = (pecas ?? []).map(p => p.onchain_id).filter((id): id is number => id !== null);
    const saldos = await saldoDasPecas(atendimento.carteira as `0x${string}`, tokenIds);
    const naMao = (pecas ?? []).filter(p => (saldos.get(p.onchain_id!) ?? 0) > 0);

    // Quais programas valem aqui, agora. Vem da cadeia: a vizinha pode ter
    // saído da pool esta manhã, e honrar uma peça que já não vale é o lojista
    // dando desconto que ele não deve mais.
    const programas = [...new Set(naMao.map(p => p.program_id))];
    const { data: linhas } = programas.length
      ? await admin.from("discount_programs").select("id, onchain_id, name, kind").in("id", programas)
      : { data: [] };

    const onchainDoPrograma = new Map((linhas ?? []).map(p => [p.id, p]));
    const validade = new Map<string, boolean>();
    await Promise.all(
      (linhas ?? []).map(async p => {
        if (p.onchain_id === null || balcao.onchainId === null) return validade.set(p.id, false);
        validade.set(p.id, await programaValeNaLoja(p.onchain_id, balcao.onchainId).catch(() => false));
      }),
    );

    const validas = naMao.filter(p => validade.get(p.program_id));

    // O desconto em centavos, já calculado pelo contrato: é o número que o
    // atendente lê pronto, sem fazer conta de cabeça no meio do atendimento.
    const conta = Number.isInteger(contaCentavos) && contaCentavos > 0 ? contaCentavos : 0;
    const descontos = conta
      ? await Promise.all(validas.map(p => descontoDaPeca(p.onchain_id!, conta).catch(() => 0n)))
      : [];

    return NextResponse.json({
      pecas: validas.map((p, i) => ({
        id: p.id,
        onchainId: p.onchain_id,
        titulo: p.title,
        descricao: p.description,
        imagem: urlDaMidia(p.image_path),
        nivel: p.level,
        quantidade: saldos.get(p.onchain_id!) ?? 0,
        programa: onchainDoPrograma.get(p.program_id)?.name,
        descontoCentavos: conta ? Number(descontos[i] ?? 0n) : null,
      })),
    });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[pdv] falha ao listar peças:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "não foi possível ler as peças do cliente" }, { status: 500 });
  }
}

/** Queima a peça. */
export async function POST(request: NextRequest) {
  if (!redeConfigurada()) return NextResponse.json({ erro: "a rede não está configurada aqui" }, { status: 503 });

  const userId = await sessao();

  let corpo: { atendimento?: unknown; peca?: unknown; redemptionRef?: unknown; conta?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const redemptionRef = String(corpo.redemptionRef ?? "").trim();
  if (redemptionRef.length < 8 || redemptionRef.length > 64) {
    return NextResponse.json({ erro: "referência de uso inválida" }, { status: 400 });
  }

  const atendimento = typeof corpo.atendimento === "string" ? lerAtendimento(corpo.atendimento) : undefined;
  if (!atendimento) {
    return NextResponse.json({ erro: "o atendimento expirou — leia o passe do cliente de novo" }, { status: 410 });
  }

  try {
    const balcao = await balcaoDoOperador(userId);
    if (atendimento.balcaoId !== balcao.id) {
      return NextResponse.json({ erro: "este atendimento não é deste balcão" }, { status: 403 });
    }
    if (balcao.onchainId === null) {
      return NextResponse.json({ erro: "esta loja ainda não foi registrada na rede" }, { status: 409 });
    }

    const tokenId = Number(corpo.peca);
    const admin = supabaseAdmin();
    const { data: peca } = await admin
      .from("pieces")
      .select("id, onchain_id, title")
      .eq("onchain_id", tokenId)
      .maybeSingle();

    if (!peca || peca.onchain_id === null) {
      return NextResponse.json({ erro: "peça não encontrada" }, { status: 404 });
    }

    const conta = Number(corpo.conta);
    const desconto = Number.isInteger(conta) && conta > 0 ? Number(await descontoDaPeca(tokenId, conta)) : 0;

    const hash = await usarPeca(atendimento.carteira as `0x${string}`, tokenId, balcao.onchainId, redemptionRef);

    return NextResponse.json({ ok: true, titulo: peca.title, descontoCentavos: desconto, tx: hash });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[pdv] falha ao usar a peça:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: mensagemDaPeca(e) }, { status: 422 });
  }
}

const mensagemDaPeca = (e: unknown) => {
  switch (erroDoContrato(e)?.nome) {
    case "NotValidHere":
      return "esta peça não vale nesta loja";
    case "NotOperator":
      return "este balcão não tem permissão para usar peças";
    case "UnknownPiece":
      return "esta peça não existe na rede";
    case "ERC1155InsufficientBalance":
      return "o cliente não tem mais esta peça";
    default:
      return "não foi possível usar a peça agora";
  }
};
