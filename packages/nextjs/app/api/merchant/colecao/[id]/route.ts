import { type NextRequest, NextResponse } from "next/server";
import { definirPecaAtiva, redeConfigurada } from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * Liga e desliga uma peça.
 *
 * Desligar impede novas emissões; não apaga o que já está na mão de ninguém.
 * Uma peça que some da carteira de quem a conquistou seria a plataforma
 * voltando atrás numa promessa.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { id } = await params;
  let corpo: { ativa?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }
  if (typeof corpo.ativa !== "boolean") {
    return NextResponse.json({ erro: "informe se a peça fica ativa" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: peca } = await admin.from("pieces").select("id, onchain_id, program_id").eq("id", id).maybeSingle();

    if (!peca) return NextResponse.json({ erro: "peça não encontrada" }, { status: 404 });

    const { data: programa } = await admin
      .from("discount_programs")
      .select("establishment_id")
      .eq("id", peca.program_id)
      .maybeSingle();

    if (programa?.establishment_id !== loja.id) {
      return NextResponse.json({ erro: "peça não encontrada nesta loja" }, { status: 404 });
    }

    let aviso: string | undefined;
    if (peca.onchain_id !== null && redeConfigurada()) {
      try {
        await definirPecaAtiva(peca.onchain_id, corpo.ativa);
      } catch (e) {
        console.error("[colecao] falha ao alternar na rede:", e instanceof Error ? e.message : e);
        return NextResponse.json({ erro: "a rede não aceitou a mudança agora" }, { status: 502 });
      }
    } else if (peca.onchain_id === null) {
      aviso = "a peça ainda é rascunho: a mudança vale só no painel.";
    }

    await admin.from("pieces").update({ active: corpo.ativa }).eq("id", id);
    return NextResponse.json({ ok: true, aviso });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao atualizar a peça" }, { status: 500 });
  }
}
