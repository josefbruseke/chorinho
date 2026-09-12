import { type NextRequest, NextResponse } from "next/server";
import { criarConquistaNaRede, redeConfigurada } from "~~/services/colecao/servidor";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { erroDoContrato } from "~~/services/relayer/servidor";
import { uriDoToken } from "~~/utils/midia";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * As conquistas que a loja define.
 *
 * O critério é conferido pela cadeia na hora de entregar — o contrato lê o
 * StampLedger sozinho. Por isso o lojista pode escrever a regra sem que ninguém
 * precise auditar a entrega depois: não há caminho em que alguém ganhe sem ter
 * cumprido.
 *
 * O critério "venda avulsa" é a exceção, e a tela diz isso na cara: ele depende
 * do servidor atestar uma compra específica, porque o ledger guarda acumulado,
 * não valor por venda.
 */

const COLUNAS =
  "id, onchain_id, title, description, criterion, target, starts_at, ends_at, max_winners, winners, piece_id, grants_badge, active";

type LinhaDeConquista = {
  id: string;
  onchain_id: number | null;
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
  onchainId: c.onchain_id,
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
  rascunho: c.onchain_id === null,
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
      ? await admin.from("pieces").select("id, title, onchain_id, level").in("program_id", ids).eq("active", true)
      : { data: [] };

    return NextResponse.json({
      loja: { nome: loja.nome, registrada: loja.onchainId !== null },
      conquistas: (conquistas ?? []).map(mapear),
      pecas: (pecas ?? []).map(p => ({
        id: p.id,
        titulo: p.title,
        nivel: p.level,
        // Peça sem `onchain_id` não pode ser prometida: a conquista guardaria
        // um id que a cadeia não conhece, e a entrega reverteria no melhor
        // momento possível para frustrar alguém.
        disponivel: p.onchain_id !== null,
      })),
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
  // O contrato também recusa (`DeliversNothing`), mas uma conquista que não
  // entrega nada é uma barra de progresso que termina em nada — o cliente
  // chega ao fim e não ganha coisa alguma.
  if (!entregaSelo && !pecaId) {
    return NextResponse.json({ erro: "a conquista precisa entregar o selo, uma peça, ou os dois" }, { status: 400 });
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    let pecaTokenId = 0;
    if (pecaId) {
      const { data: peca } = await admin
        .from("pieces")
        .select("id, onchain_id, program_id")
        .eq("id", pecaId)
        .maybeSingle();
      const { data: programa } = peca
        ? await admin.from("discount_programs").select("establishment_id").eq("id", peca.program_id).maybeSingle()
        : { data: null };

      if (!peca || programa?.establishment_id !== loja.id) {
        return NextResponse.json({ erro: "peça não encontrada nesta loja" }, { status: 404 });
      }
      if (peca.onchain_id === null) {
        return NextResponse.json({ erro: "essa peça ainda é rascunho na rede" }, { status: 409 });
      }
      pecaTokenId = peca.onchain_id;
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

    const registro = await registrarNaRede(loja.onchainId, conquista, pecaTokenId);
    if (!registro.ok) {
      return NextResponse.json({ ok: true, conquista: mapear(conquista), aviso: registro.aviso });
    }

    const { data: atualizado } = await admin
      .from("achievements")
      .update({ onchain_id: registro.onchainId, onchain_tx_hash: registro.hash })
      .eq("id", conquista.id)
      .select(COLUNAS)
      .single();

    return NextResponse.json({
      ok: true,
      conquista: mapear(atualizado ?? { ...conquista, onchain_id: registro.onchainId }),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[conquistas] falha ao criar:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao criar a conquista" }, { status: 500 });
  }
}

type Registro = { ok: true; onchainId: number; hash: string } | { ok: false; aviso: string };

const registrarNaRede = async (
  lojaOnchainId: number | null,
  c: LinhaDeConquista,
  pecaTokenId: number,
): Promise<Registro> => {
  if (!redeConfigurada()) {
    return { ok: false, aviso: "conquista salva como rascunho: a rede não está configurada neste ambiente." };
  }
  if (lojaOnchainId === null) {
    return { ok: false, aviso: "conquista salva como rascunho: sua loja ainda não foi registrada na rede." };
  }

  // A URI do selo precisa do id da conquista, que só existe depois de criada
  // na cadeia. Como o contador começa em 1 e é sequencial, o próximo id é
  // previsível — e o `_nextAchievementId` do contrato confirma na volta.
  const admin = supabaseAdmin();
  const { data: ultima } = await admin
    .from("achievements")
    .select("onchain_id")
    .not("onchain_id", "is", null)
    .order("onchain_id", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previsto = (ultima?.onchain_id ?? 0) + 1;

  try {
    const criado = await criarConquistaNaRede({
      lojaOnchainId,
      criterion: c.criterion,
      target: Number(c.target),
      startsAt: c.starts_at,
      endsAt: c.ends_at,
      maxWinners: c.max_winners,
      pecaTokenId,
      grantsBadge: c.grants_badge,
      routeId: 0,
      uri: uriDoToken("selo", previsto),
      supabaseId: c.id,
      titulo: c.title,
    });

    if (!criado) return { ok: false, aviso: "conquista salva, mas a rede não confirmou o registro." };
    return { ok: true, ...criado };
  } catch (e) {
    console.error("[conquistas] falha na rede:", e instanceof Error ? e.message : e);
    switch (erroDoContrato(e)?.nome) {
      case "NotEstablishmentOwner":
        return { ok: false, aviso: "conquista salva como rascunho: a plataforma não tem permissão nesta loja." };
      case "DeliversNothing":
        return {
          ok: false,
          aviso: "conquista salva como rascunho: a rede recusou uma conquista que não entrega nada.",
        };
      default:
        return { ok: false, aviso: "conquista salva como rascunho: não foi possível registrar na rede agora." };
    }
  }
};
