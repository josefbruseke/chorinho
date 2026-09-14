import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";

export const runtime = "nodejs";

/**
 * O cliente recebe a conquista que mereceu — e hoje não recebe.
 *
 * O prêmio era um selo ERC-721 e/ou uma peça ERC-1155, e os dois moravam na
 * cadeia. Nenhum dos dois tem tabela: não existe linha nenhuma onde gravar que
 * o selo é dele. Então esta rota responde 503 e diz isso em português. Responder
 * `ok` seria pior que a falha — a conquista sairia da lista como recebida e o
 * cliente ficaria sem ela e sem saber.
 *
 * O que sobrevive é o desenho em volta, que não dependia da rede: a referência
 * determinística e a linha de intenção gravada ANTES do envio. Quando a entrega
 * voltar, ela encontra a fila de quem pediu e em que ordem, sem ninguém
 * repetido.
 *
 * Uma coisa que a rede levava embora e precisa voltar do lado de cá: quem
 * conferia o critério era o contrato, lendo o StampLedger no ato. Era por isso
 * que esta rota podia ficar aberta a qualquer pessoa logada sem medo. No dia em
 * que ela voltar a entregar alguma coisa, a conferência do critério tem de
 * acontecer aqui dentro, antes da gravação — não na tela que chamou.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: conquista } = await admin.from("achievements").select("id, title, active").eq("id", id).maybeSingle();

  if (!conquista) return NextResponse.json({ erro: "conquista não encontrada" }, { status: 404 });
  if (!conquista.active) return NextResponse.json({ erro: "esta conquista não está mais valendo" }, { status: 409 });

  // A referência é determinística — o mesmo cliente na mesma conquista chega
  // sempre no mesmo texto, e era isso que fazia o `usedClaimRef` do contrato
  // barrar o toque duplo. A unicidade de `claim_ref` no Postgres faz hoje o
  // mesmo papel.
  const claimRef = `conquista:${conquista.id}:${userId}`;

  // Quem já recebeu não volta para a fila: o upsert abaixo rebaixaria uma linha
  // confirmada a pedido pendente.
  const { data: anterior } = await admin
    .from("achievement_claims")
    .select("status")
    .eq("achievement_id", conquista.id)
    .eq("customer_profile_id", userId)
    .eq("status", "confirmada")
    .maybeSingle();

  if (anterior) return NextResponse.json({ erro: "você já recebeu esta conquista" }, { status: 409 });

  // Grava a intenção ANTES de tentar entregar. Antes era para sobreviver à
  // função morrer no meio da espera do bloco; hoje é a própria fila de espera —
  // é esta linha que diz, quando a entrega voltar, quem estava esperando.
  //
  // `na_fila` porque é a verdade: o pedido está guardado e não foi enviado a
  // lugar nenhum.
  await admin.from("achievement_claims").upsert(
    {
      achievement_id: conquista.id,
      claim_ref: claimRef,
      customer_profile_id: userId,
      status: "na_fila" as const,
    },
    { onConflict: "claim_ref" },
  );

  // O contador `achievements.winners` não se mexe daqui: ele conta entrega
  // confirmada, e nada é entregue enquanto o selo e a peça não tiverem tabela.
  return NextResponse.json(
    { erro: "a entrega de conquistas está fora do ar por enquanto — seu pedido ficou guardado" },
    { status: 503 },
  );
}
