import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { urlDaMidia } from "~~/utils/midia";

export const runtime = "nodejs";

/**
 * A coleção do cliente: as peças que ele tem e as conquistas ao alcance.
 *
 * As peças sumiram junto com a rede, e a razão de terem sumido é a mesma que
 * antes obrigava a lê-las do contrato em vez do espelho: peça é transferível.
 * Ela podia mudar de mão sem passar por nenhuma tela nossa, e o espelho
 * atrasado mostraria ao cliente um desconto que o balcão ia negar na frente da
 * fila. Sem contrato não sobrou nem espelho nem dono — não existe tabela de
 * posse de peça — então a lista vem vazia e avisada. Fingir um saldo aqui é
 * exatamente o erro que o desenho antigo se dava ao trabalho de evitar.
 *
 * Isso é dívida, não simplificação. Presentear peça para um amigo é M12: a
 * tabela de posse precisa nascer com transferência de verdade (dono, origem,
 * histórico), e não como uma view do que a pessoa ganhou. A transferibilidade
 * não sumiu com a rede — só ficou sem onde morar.
 *
 * O progresso das conquistas, ao contrário, dá para calcular aqui: carimbos
 * acumulados e sequência estão em `stamp_balances_cache`, e visita é linha de
 * `sales`. Os dois critérios de dinheiro não — ver a nota em `alcancadoAgora`.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const admin = supabaseAdmin();

  // As conquistas das lojas onde a pessoa já tem cartela: perseguir uma
  // conquista de uma loja onde nunca se pôs o pé não é uma meta, é ruído.
  const { data: cartelas } = await admin
    .from("stamp_balances_cache")
    .select("establishment_id, lifetime, streak_current")
    .eq("customer_profile_id", userId);

  const lojasVisitadas = [...new Set((cartelas ?? []).map(c => c.establishment_id))];
  if (lojasVisitadas.length === 0) {
    return NextResponse.json({ cliente: userId, conquistas: [], ...SEM_PECAS, ...SEM_ENTREGA });
  }

  const { data: conquistas } = await admin
    .from("achievements")
    .select("id, title, description, image_path, criterion, target, establishment_id")
    .in("establishment_id", lojasVisitadas)
    .eq("active", true);

  const idsDasConquistas = (conquistas ?? []).map(c => c.id);
  if (idsDasConquistas.length === 0) {
    return NextResponse.json({ cliente: userId, conquistas: [], ...SEM_PECAS, ...SEM_ENTREGA });
  }

  const idsDasLojas = [...new Set((conquistas ?? []).map(c => c.establishment_id))];

  const [{ data: vendas }, { data: recebidas }, { data: lojas }] = await Promise.all([
    // Uma linha de venda confirmada é uma visita — é o que o contador do
    // contrato media. Vem tudo numa consulta só e conta-se aqui: são dezenas de
    // linhas por cliente, e uma contagem por conquista seriam dezenas de idas.
    admin
      .from("sales")
      .select("establishment_id")
      .eq("customer_profile_id", userId)
      .eq("status", "confirmada")
      .in("establishment_id", idsDasLojas),
    admin
      .from("achievement_claims")
      .select("achievement_id")
      .eq("customer_profile_id", userId)
      .eq("status", "confirmada")
      .in("achievement_id", idsDasConquistas),
    admin.from("establishments").select("id, slug, name").in("id", idsDasLojas),
  ]);

  const visitasPorLoja = new Map<string, number>();
  for (const venda of vendas ?? []) {
    const loja = venda.establishment_id;
    visitasPorLoja.set(loja, (visitasPorLoja.get(loja) ?? 0) + 1);
  }

  const cartelaPorLoja = new Map((cartelas ?? []).map(c => [c.establishment_id, c]));
  const jaRecebidas = new Set((recebidas ?? []).map(r => r.achievement_id));
  const lojaPorId = new Map((lojas ?? []).map(l => [l.id, l]));

  const lista = (conquistas ?? []).map(c => {
    const alcancado = alcancadoAgora(
      c.criterion,
      cartelaPorLoja.get(c.establishment_id),
      visitasPorLoja.get(c.establishment_id) ?? 0,
    );
    const loja = lojaPorId.get(c.establishment_id);
    const jaRecebida = jaRecebidas.has(c.id);
    const alvo = Number(c.target);

    return {
      id: c.id,
      titulo: c.title,
      descricao: c.description,
      imagem: urlDaMidia(c.image_path),
      loja: loja ? { slug: loja.slug, nome: loja.name } : undefined,
      alcancado: alcancado ?? 0,
      alvo,
      merecida: alcancado !== null && alcancado >= alvo && !jaRecebida,
      jaRecebida,
      // O zero acima é ausência de medida, não medida de zero. A tela precisa
      // saber a diferença para não desenhar "0 de 5000" como se fosse começo.
      progressoIndisponivel: alcancado === null,
    };
  });

  return NextResponse.json({
    cliente: userId,
    ...SEM_PECAS,
    ...SEM_ENTREGA,
    // Primeiro as que já podem ser recebidas: é a única linha desta tela que
    // pede uma ação.
    conquistas: lista
      .filter(c => !c.jaRecebida)
      .sort(
        (a, b) =>
          Number(b.merecida) - Number(a.merecida) ||
          b.alcancado / Math.max(1, b.alvo) - a.alcancado / Math.max(1, a.alvo),
      ),
  });
}

/** Espelhava `Achievements.Criterion`. A ordem é a do enum — não reordene. */
const CRITERIO = { CARIMBOS: 0, SEQUENCIA: 1, VISITAS: 2, TOTAL_GASTO: 3, UMA_COMPRA: 4 } as const;

type CartelaDaLoja = { lifetime: number; streak_current: number };

/**
 * Quanto a pessoa já tem do que a conquista pede.
 *
 * Quem respondia era o contrato, lendo o StampLedger no mesmo instante em que
 * decidia a entrega — o número da tela era o número que ia valer. Agora responde
 * a tabela que o balcão escreve, e a conferência na entrega tem de voltar a
 * acontecer do lado de cá.
 *
 * Os dois critérios de dinheiro ficaram sem resposta possível: desde `ff4edf3`
 * o caixa não digita valor nenhum, e a venda deixou de guardar o valor da
 * compra. Total gasto e uma compra específica são critérios mortos enquanto o
 * PDV não voltar a cobrar o valor — devolvem `null`, e quem chama transforma
 * isso em aviso, não em zero.
 */
const alcancadoAgora = (criterio: number, cartela: CartelaDaLoja | undefined, visitas: number) => {
  switch (criterio) {
    case CRITERIO.CARIMBOS:
      return cartela?.lifetime ?? 0;
    case CRITERIO.SEQUENCIA:
      return cartela?.streak_current ?? 0;
    case CRITERIO.VISITAS:
      return visitas;
    case CRITERIO.TOTAL_GASTO:
    case CRITERIO.UMA_COMPRA:
    default:
      return null;
  }
};

// M9: peça era ERC-1155 e não tem tabela de posse nenhuma no Supabase. Lista
// vazia com a bandeira junto, até M12 dar a ela um lugar para morar.
const SEM_PECAS = { pecas: [], pecasIndisponiveis: true } as const;

// M9: a conquista ainda é merecida, mas não há como entregá-la — o selo e a
// peça que ela dava moravam na cadeia. A bandeira existe para a tela parar de
// prometer o recebimento antes de pedir; a rota de entrega devolve 503.
const SEM_ENTREGA = { entregaIndisponivel: true } as const;
