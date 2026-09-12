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
      .select("id, name, device_label, paired_at, last_seen_at, pairing_expires_at, pairing_code, created_at")
      .eq("establishment_id", loja.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      loja: { nome: loja.nome, limite: loja.limiteDePdv },
      terminais: (terminais ?? []).map(t => {
        const agora = new Date().toISOString();
        const aguardando = !t.paired_at && Boolean(t.pairing_expires_at) && t.pairing_expires_at! > agora;

        return {
          id: t.id,
          nome: t.name,
          aparelho: t.device_label,
          pareadoEm: t.paired_at,
          vistoEm: t.last_seen_at,
          aguardandoPareamento: aguardando,
          expirado: !t.paired_at && Boolean(t.pairing_expires_at) && t.pairing_expires_at! <= agora,
          // O código volta enquanto o pareamento está em aberto, para o painel
          // poder mostrar o QR de novo.
          //
          // Antes ele aparecia uma vez só, "para não guardar chave de balcão em
          // texto puro" — mas ele já está em texto puro na tabela, é assim que
          // o pareamento o encontra. Esconder do painel não protegia nada e
          // custava caro: quem fechasse a tela cedo demais tinha que criar
          // OUTRO terminal e queimar uma vaga do plano. Quem protege são a
          // validade de trinta minutos, o uso único e o desligamento imediato.
          codigo: aguardando ? t.pairing_code : null,
          expiraEm: aguardando ? t.pairing_expires_at : null,
        };
      }),
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

  const pedido = String(corpo.nome ?? "")
    .trim()
    .slice(0, 40);

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

    // Nome em branco vira "Caixa N". Uma loja com seis caixas não deveria
    // precisar inventar seis nomes para instalar seis tablets.
    const nome = pedido.length >= 2 ? pedido : `Caixa ${(count ?? 0) + 1}`;

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
