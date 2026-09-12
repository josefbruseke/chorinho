import { type NextRequest, NextResponse } from "next/server";
import {
  aceitarConvite,
  convidarLoja,
  definirProgramaAtivo,
  redeConfigurada,
  sairDoPrograma,
} from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { erroDoContrato } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * Ligar, desligar e mexer na pool de um programa.
 *
 * A regra que sustenta a pool inteira mora no `aceitar`: ele exige que quem
 * pede administre a loja que está ACEITANDO, nunca a que convidou. Na cadeia o
 * contrato faz a mesma checagem contra o dono; aqui ela precisa ser refeita
 * porque quem assina é a plataforma, em nome de todo mundo. Sem isso, uma loja
 * aceitaria convites em nome da vizinha e a obrigaria a dar desconto.
 */

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { id } = await params;
  let corpo: { ativo?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }
  if (typeof corpo.ativo !== "boolean") {
    return NextResponse.json({ erro: "informe se o programa fica ativo" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: programa } = await admin
      .from("discount_programs")
      .select("id, onchain_id, establishment_id")
      .eq("id", id)
      .maybeSingle();

    if (!programa || programa.establishment_id !== loja.id) {
      return NextResponse.json({ erro: "programa não encontrado nesta loja" }, { status: 404 });
    }

    let aviso: string | undefined;
    if (programa.onchain_id !== null && redeConfigurada()) {
      try {
        await definirProgramaAtivo(programa.onchain_id, corpo.ativo);
      } catch (e) {
        console.error("[programas] falha ao alternar na rede:", e instanceof Error ? e.message : e);
        // A cadeia é a fonte da verdade do desconto: se ela não mudou, mudar só
        // aqui faria a tela do lojista mentir para ele.
        return NextResponse.json(
          { erro: "a rede não aceitou a mudança agora — tente de novo em instantes" },
          { status: 502 },
        );
      }
    } else if (programa.onchain_id === null) {
      aviso = "o programa ainda é rascunho: a mudança vale só no painel.";
    }

    await admin.from("discount_programs").update({ active: corpo.ativo }).eq("id", id);
    return NextResponse.json({ ok: true, aviso });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao atualizar o programa" }, { status: 500 });
  }
}

/** Convidar uma vizinha, aceitar um convite recebido, ou sair da pool. */
export async function POST(request: NextRequest, { params }: Params) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { id } = await params;
  let corpo: { acao?: unknown; lojaId?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const acao = String(corpo.acao ?? "");
  if (!["convidar", "aceitar", "sair"].includes(acao)) {
    return NextResponse.json({ erro: "ação desconhecida" }, { status: 400 });
  }
  if (!redeConfigurada()) {
    return NextResponse.json({ erro: "a rede não está configurada neste ambiente" }, { status: 503 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: programa } = await admin
      .from("discount_programs")
      .select("id, onchain_id, establishment_id, joint, name")
      .eq("id", id)
      .maybeSingle();

    if (!programa) return NextResponse.json({ erro: "programa não encontrado" }, { status: 404 });
    if (!programa.joint) return NextResponse.json({ erro: "este programa não é conjunto" }, { status: 400 });
    if (programa.onchain_id === null) {
      return NextResponse.json({ erro: "o programa ainda é rascunho na rede" }, { status: 409 });
    }

    if (acao === "convidar") {
      // Convidar é do dono do programa. É o único dos três em que a loja da
      // sessão precisa ser a criadora.
      if (programa.establishment_id !== loja.id) {
        return NextResponse.json({ erro: "só a loja que criou o programa convida" }, { status: 403 });
      }
      return convidar(programa.onchain_id, programa.id, String(corpo.lojaId ?? ""));
    }

    // Aceitar e sair são da loja convidada — a da sessão, sempre.
    if (loja.onchainId === null) {
      return NextResponse.json({ erro: "sua loja ainda não foi registrada na rede" }, { status: 409 });
    }

    const { data: vinculo } = await admin
      .from("program_members")
      .select("id, status")
      .eq("program_id", programa.id)
      .eq("establishment_id", loja.id)
      .maybeSingle();

    if (acao === "aceitar") {
      if (vinculo?.status !== "convidada") {
        return NextResponse.json({ erro: "não há convite pendente para a sua loja aqui" }, { status: 409 });
      }
      await aceitarConvite(programa.onchain_id, loja.onchainId);
      await admin
        .from("program_members")
        .update({ status: "aceita", responded_at: new Date().toISOString() })
        .eq("id", vinculo.id);
      return NextResponse.json({ ok: true });
    }

    if (vinculo?.status !== "aceita") {
      return NextResponse.json({ erro: "sua loja não está nesta pool" }, { status: 409 });
    }
    await sairDoPrograma(programa.onchain_id, loja.onchainId);
    await admin
      .from("program_members")
      .update({ status: "saiu", responded_at: new Date().toISOString() })
      .eq("id", vinculo.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[programas] falha na pool:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: mensagemDaPool(e) }, { status: 502 });
  }
}

const convidar = async (programaOnchainId: number, programaId: string, lojaId: string) => {
  const admin = supabaseAdmin();

  const { data: convidada } = await admin
    .from("establishments")
    .select("id, name, onchain_id, status")
    .eq("id", lojaId)
    .maybeSingle();

  if (!convidada || convidada.status !== "ativo") {
    return NextResponse.json({ erro: "loja não encontrada ou inativa" }, { status: 404 });
  }
  if (convidada.onchain_id === null) {
    return NextResponse.json({ erro: "essa loja ainda não foi registrada na rede" }, { status: 409 });
  }

  await convidarLoja(programaOnchainId, convidada.onchain_id);

  await admin
    .from("program_members")
    .upsert(
      { program_id: programaId, establishment_id: convidada.id, status: "convidada", responded_at: null },
      { onConflict: "program_id,establishment_id" },
    );

  return NextResponse.json({ ok: true, convidada: convidada.name });
};

const mensagemDaPool = (e: unknown) => {
  switch (erroDoContrato(e)?.nome) {
    case "AlreadyAMember":
      return "essa loja já foi convidada ou já está na pool";
    case "NotInvited":
      return "não há convite pendente para essa loja";
    case "NotAMember":
      return "essa loja não está na pool";
    case "ProgramIsNotJoint":
      return "este programa não aceita outras lojas";
    case "UnknownEstablishment":
      return "essa loja não existe na rede";
    default:
      return "a rede não aceitou a mudança agora";
  }
};
