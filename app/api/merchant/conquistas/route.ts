import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";

export const runtime = "nodejs";

/**
 * As conquistas que a loja define.
 *
 * O critério é conferido na hora de entregar, contra os carimbos que a pessoa
 * já tem. Por isso o lojista escreve a regra e pronto: não há caminho em que
 * alguém ganhe sem ter cumprido, e ninguém precisa auditar a entrega depois.
 *
 * O critério "venda avulsa" é a exceção, e a tela diz isso na cara: ele depende
 * do servidor atestar uma compra específica, porque o saldo guarda acumulado,
 * não valor por venda.
 */

const COLUNAS =
  "id, title, description, criterion, target, starts_at, ends_at, max_winners, winners, piece_id, grants_badge, active";

type LinhaDeConquista = {
  id: string;
  title: string;
  description: string | null;
  criterion: number;
  target: number;
  starts_at: string | null;
  ends_at: string | null;
  max_winners: number;
  winners: number;
  piece_id: string | null;
  grants_badge: boolean;
  active: boolean;
};

const mapear = (c: LinhaDeConquista) => ({
  id: c.id,
  titulo: c.title,
  descricao: c.description,
  criterio: c.criterion,
  alvo: Number(c.target),
  comecaEm: c.starts_at,
  terminaEm: c.ends_at,
  maxConquistadores: c.max_winners,
  conquistadores: c.winners,
  pecaId: c.piece_id,
  entregaSelo: c.grants_badge,
  ativa: c.active,
});

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
    const admin = supabaseAdmin();

    const { data: conquistas } = await admin
      .from("achievements")
      .select(COLUNAS)
      .eq("establishment_id", loja.id)
      .order("created_at");

    // As peças que a loja pode entregar como prêmio da conquista.
    const { data: programas } = await admin.from("discount_programs").select("id").eq("establishment_id", loja.id);

    const ids = (programas ?? []).map(p => p.id);
    const { data: pecas } = ids.length
      ? await admin.from("pieces").select("id, title, level").in("program_id", ids).eq("active", true)
      : { data: [] };

    return NextResponse.json({
      loja: { nome: loja.nome },
      conquistas: (conquistas ?? []).map(mapear),
      // M9: toda peça ativa serve de prêmio. Antes só servia a que já existia
      // na rede; agora a peça existe quando está no banco.
      pecas: (pecas ?? []).map(p => ({ id: p.id, titulo: p.title, nivel: p.level })),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[conquistas] falha ao listar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao listar as conquistas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: Record<string, unknown>;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const titulo = String(corpo.titulo ?? "").trim();
  const descricao = typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 280) : "";
  const criterio = Number(corpo.criterio);
  const alvo = Number(corpo.alvo);
  const maxConquistadores = Number(corpo.maxConquistadores ?? 0);
  const pecaId = typeof corpo.pecaId === "string" && corpo.pecaId ? corpo.pecaId : null;
  const entregaSelo = corpo.entregaSelo !== false;
  const terminaEm = typeof corpo.terminaEm === "string" && corpo.terminaEm ? corpo.terminaEm : null;

  if (titulo.length < 2 || titulo.length > 80) {
    return NextResponse.json({ erro: "o nome da conquista precisa ter entre 2 e 80 caracteres" }, { status: 400 });
  }
  if (!Number.isInteger(criterio) || criterio < 0 || criterio > 4) {
    return NextResponse.json({ erro: "critério desconhecido" }, { status: 400 });
  }
  if (!Number.isInteger(alvo) || alvo <= 0) {
    return NextResponse.json({ erro: "o alvo precisa ser um inteiro maior que zero" }, { status: 400 });
  }
  // Uma conquista que não entrega nada é uma barra de progresso que termina em
  // nada — o cliente chega ao fim e não ganha coisa alguma.
  if (!entregaSelo && !pecaId) {
    return NextResponse.json({ erro: "a conquista precisa entregar o selo, uma peça, ou os dois" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    // A peça prometida precisa ser desta loja: prometer a peça da vizinha
    // seria entregar um desconto que não é da loja para dar.
    if (pecaId) {
      const { data: peca } = await admin.from("pieces").select("id, program_id").eq("id", pecaId).maybeSingle();
      const { data: programa } = peca
        ? await admin.from("discount_programs").select("establishment_id").eq("id", peca.program_id).maybeSingle()
        : { data: null };

      if (!peca || programa?.establishment_id !== loja.id) {
        return NextResponse.json({ erro: "peça não encontrada nesta loja" }, { status: 404 });
      }
    }

    const { data: conquista, error } = await admin
      .from("achievements")
      .insert({
        establishment_id: loja.id,
        title: titulo,
        description: descricao || null,
        criterion: criterio,
        target: alvo,
        max_winners: maxConquistadores,
        piece_id: pecaId,
        grants_badge: entregaSelo,
        ends_at: terminaEm,
      })
      .select(COLUNAS)
      .single();

    if (error || !conquista) {
      console.error("[conquistas] falha ao gravar:", error?.message);
      return NextResponse.json({ erro: "não foi possível salvar a conquista" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, conquista: mapear(conquista) });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[conquistas] falha ao criar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao criar a conquista" }, { status: 500 });
  }
}
