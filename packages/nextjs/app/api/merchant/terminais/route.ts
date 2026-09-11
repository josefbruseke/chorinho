import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { VALIDADE_DO_PAREAMENTO_SEGUNDOS, gerarCodigoDePareamento } from "~~/services/pdv/acesso";

export const runtime = "nodejs";

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

/** Os terminais da loja — quais estão pareados, qual foi usado por último. */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const { data: terminais } = await supabaseAdmin()
      .from("pos_terminals")
      .select("id, name, device_label, paired_at, last_seen_at, pairing_expires_at, created_at")
      .eq("establishment_id", loja.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      loja: { nome: loja.nome, limite: loja.limiteDePdv },
      terminais: (terminais ?? []).map(t => ({
        id: t.id,
        nome: t.name,
        aparelho: t.device_label,
        pareadoEm: t.paired_at,
        vistoEm: t.last_seen_at,
        // O código em si nunca sai do servidor depois de criado: quem perdeu
        // o papel cria outro terminal. Aqui só dizemos se ainda dá para parear.
        aguardandoPareamento:
          !t.paired_at && Boolean(t.pairing_expires_at) && t.pairing_expires_at! > new Date().toISOString(),
        expirado: !t.paired_at && Boolean(t.pairing_expires_at) && t.pairing_expires_at! <= new Date().toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao listar terminais" }, { status: 500 });
  }
}

/**
 * Cria um terminal e devolve o código de pareamento.
 *
 * O código aparece UMA vez, no painel, e o lojista leva até o tablet. Meia hora
 * de validade: tempo de atravessar a loja, não de esquecer num grupo de
 * WhatsApp.
 */
export async function POST(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { nome?: unknown };
  try {
    corpo = await request.json();
  } catch {
    corpo = {};
  }

  const nome = String(corpo.nome ?? "")
    .trim()
    .slice(0, 40);
  if (nome.length < 2) return NextResponse.json({ erro: "dê um nome ao terminal (ex.: Caixa 1)" }, { status: 400 });

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { count } = await admin
      .from("pos_terminals")
      .select("id", { count: "exact", head: true })
      .eq("establishment_id", loja.id)
      .is("revoked_at", null);

    if ((count ?? 0) >= loja.limiteDePdv) {
      return NextResponse.json(
        {
          erro: `seu plano permite ${loja.limiteDePdv} terminais ativos. Remova um aparelho antigo ou fale com a gente para aumentar.`,
        },
        { status: 409 },
      );
    }

    const codigo = gerarCodigoDePareamento();
    const { data: terminal, error } = await admin
      .from("pos_terminals")
      .insert({
        establishment_id: loja.id,
        name: nome,
        pairing_code: codigo,
        pairing_expires_at: new Date(Date.now() + VALIDADE_DO_PAREAMENTO_SEGUNDOS * 1000).toISOString(),
        created_by: userId,
      })
      .select("id")
      .single();

    if (error || !terminal) return NextResponse.json({ erro: "não foi possível criar o terminal" }, { status: 500 });

    return NextResponse.json({
      id: terminal.id,
      nome,
      codigo,
      validoPorSegundos: VALIDADE_DO_PAREAMENTO_SEGUNDOS,
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao criar terminal" }, { status: 500 });
  }
}
