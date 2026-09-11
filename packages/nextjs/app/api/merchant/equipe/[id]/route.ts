import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import type { Enums } from "~~/services/database/types";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

type Papel = Enums<"papel_membro">;
const PAPEIS: Papel[] = ["owner", "manager", "operator"];
/** Papéis que só o dono da loja pode tocar — criar, promover, rebaixar ou desativar. */
const NIVEL_ALTO: Papel[] = ["owner", "manager"];

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/**
 * Muda papel e/ou ativa/desativa um membro da equipe.
 *
 * PATCH e DELETE caem aqui porque as regras de segurança são as mesmas dos
 * dois lados: DELETE é só um PATCH que sempre desativa, nunca apaga a linha —
 * o histórico de quem carimbou uma venda precisa continuar apontando para
 * alguém, mesmo depois que essa pessoa sai da loja.
 */
const aplicarMudanca = async (userId: string, id: string, mudanca: { role?: Papel; active?: boolean }) => {
  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: alvo } = await admin
      .from("establishment_members")
      .select("id, profile_id, role, active")
      .eq("id", id)
      .eq("establishment_id", loja.id)
      .maybeSingle();
    if (!alvo) return NextResponse.json({ erro: "membro não encontrado" }, { status: 404 });

    if (mudanca.role !== undefined && alvo.profile_id === userId) {
      return NextResponse.json({ erro: "você não pode mudar o seu próprio papel" }, { status: 403 });
    }

    const tocaNivelAlto =
      NIVEL_ALTO.includes(alvo.role) || (mudanca.role !== undefined && NIVEL_ALTO.includes(mudanca.role));
    if (tocaNivelAlto && loja.papel !== "owner") {
      return NextResponse.json({ erro: "só o dono da loja mexe em dono ou gerente" }, { status: 403 });
    }

    const perderiaOUltimoDono =
      alvo.role === "owner" && (mudanca.active === false || (mudanca.role !== undefined && mudanca.role !== "owner"));
    if (perderiaOUltimoDono) {
      const { count } = await admin
        .from("establishment_members")
        .select("id", { count: "exact", head: true })
        .eq("establishment_id", loja.id)
        .eq("role", "owner")
        .eq("active", true);
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ erro: "a loja precisa de pelo menos um dono ativo" }, { status: 409 });
      }
    }

    const { data: atualizado, error } = await admin
      .from("establishment_members")
      .update(mudanca)
      .eq("id", id)
      .select("id, role, active")
      .single();
    if (error || !atualizado) return NextResponse.json({ erro: "não foi possível gravar" }, { status: 500 });

    return NextResponse.json({ id: atualizado.id, papel: atualizado.role, ativo: atualizado.active });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao atualizar a equipe" }, { status: 500 });
  }
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { papel?: unknown; ativo?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const mudanca: { role?: Papel; active?: boolean } = {};

  if (corpo.papel !== undefined) {
    if (typeof corpo.papel !== "string" || !PAPEIS.includes(corpo.papel as Papel)) {
      return NextResponse.json({ erro: "papel inválido" }, { status: 400 });
    }
    mudanca.role = corpo.papel as Papel;
  }

  if (corpo.ativo !== undefined) {
    if (typeof corpo.ativo !== "boolean") {
      return NextResponse.json({ erro: "ativo precisa ser verdadeiro ou falso" }, { status: 400 });
    }
    mudanca.active = corpo.ativo;
  }

  if (mudanca.role === undefined && mudanca.active === undefined) {
    return NextResponse.json({ erro: "nada para atualizar" }, { status: 400 });
  }

  return aplicarMudanca(userId, id, mudanca);
}

/** Desativa — nunca apaga. Ver comentário de `aplicarMudanca`. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  return aplicarMudanca(userId, id, { active: false });
}
