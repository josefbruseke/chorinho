import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * Ligar, desligar e mexer na pool de um programa.
 *
 * A regra que sustenta a pool inteira mora no `aceitar`: ele exige que quem
 * pede administre a loja que está ACEITANDO, nunca a que convidou. Sem isso,
 * uma loja aceitaria convites em nome da vizinha e a obrigaria a dar desconto.
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
      .select("id, establishment_id")
      .eq("id", id)
      .maybeSingle();

    if (!programa || programa.establishment_id !== loja.id) {
      return NextResponse.json({ erro: "programa não encontrado nesta loja" }, { status: 404 });
    }

    await admin.from("discount_programs").update({ active: corpo.ativo }).eq("id", id);
    return NextResponse.json({ ok: true });
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

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: programa } = await admin
      .from("discount_programs")
      .select("id, establishment_id, joint, name")
      .eq("id", id)
      .maybeSingle();

    if (!programa) return NextResponse.json({ erro: "programa não encontrado" }, { status: 404 });
    if (!programa.joint) return NextResponse.json({ erro: "este programa não é conjunto" }, { status: 400 });

    if (acao === "convidar") {
      // Convidar é do dono do programa. É o único dos três em que a loja da
      // sessão precisa ser a criadora.
      if (programa.establishment_id !== loja.id) {
        return NextResponse.json({ erro: "só a loja que criou o programa convida" }, { status: 403 });
      }
      return convidar(programa.id, String(corpo.lojaId ?? ""));
    }

    // Aceitar e sair são da loja convidada — a da sessão, sempre.
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
      await admin
        .from("program_members")
        .update({ status: "aceita", responded_at: new Date().toISOString() })
        .eq("id", vinculo.id);
      return NextResponse.json({ ok: true });
    }

    if (vinculo?.status !== "aceita") {
      return NextResponse.json({ erro: "sua loja não está nesta pool" }, { status: 409 });
    }
    await admin
      .from("program_members")
      .update({ status: "saiu", responded_at: new Date().toISOString() })
      .eq("id", vinculo.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[programas] falha na pool:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "não foi possível mexer na pool agora" }, { status: 500 });
  }
}

/**
 * O convite em si.
 *
 * O `upsert` é de propósito: reconvidar uma loja que saiu precisa funcionar, e
 * o vizinho que recusou hoje pode aceitar no mês que vem.
 */
const convidar = async (programaId: string, lojaId: string) => {
  const admin = supabaseAdmin();

  const { data: convidada } = await admin
    .from("establishments")
    .select("id, name, status")
    .eq("id", lojaId)
    .maybeSingle();

  if (!convidada || convidada.status !== "ativo") {
    return NextResponse.json({ erro: "loja não encontrada ou inativa" }, { status: 404 });
  }

  const { error } = await admin
    .from("program_members")
    .upsert(
      { program_id: programaId, establishment_id: convidada.id, status: "convidada", responded_at: null },
      { onConflict: "program_id,establishment_id" },
    );

  if (error) {
    console.error("[programas] falha ao convidar:", error.message);
    return NextResponse.json({ erro: "não foi possível registrar o convite" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, convidada: convidada.name });
};
