import { type NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import type { TablesInsert } from "~~/services/database/types";
import { lerAtendimento } from "~~/services/passe/atendimento";
import { ErroDePdv, balcaoDoOperador, debitarCarimbos, lerCartela } from "~~/services/pdv/emitir";

export const runtime = "nodejs";

/** Violação de chave única no Postgres — aqui, o `claim_ref` chegando duas vezes. */
const CHAVE_DUPLICADA = "23505";

/**
 * Entrega o prêmio: desconta o que ele custa e registra a entrega.
 *
 * O `claimRef` vem do aparelho e é único por entrega — é ele que impede que um
 * toque duplo no botão, ou um reenvio depois de queda de rede, cobre duas vezes
 * do cliente. A unicidade da coluna é a trava inteira: a linha é gravada ANTES
 * de a cartela ser descontada, então quem perder a corrida encontra a entrega
 * pronta e não desconta de novo.
 *
 * O preço de gravar primeiro é o oposto do erro grave: se algo morrer entre a
 * linha e o desconto, o cliente fica com carimbos que já gastou. Perder um
 * carimbo do cliente na frente da fila é bem pior do que a loja honrar um a
 * mais.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;

  let corpo: { atendimento?: unknown; recompensa?: unknown; claimRef?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const claimRef = String(corpo.claimRef ?? "").trim();
  if (claimRef.length < 8 || claimRef.length > 64) {
    return NextResponse.json({ erro: "referência de entrega inválida" }, { status: 400 });
  }

  const atendimento = typeof corpo.atendimento === "string" ? lerAtendimento(corpo.atendimento) : undefined;
  if (!atendimento) {
    return NextResponse.json({ erro: "o atendimento expirou — leia o passe do cliente de novo" }, { status: 410 });
  }

  const profileId = atendimento.cliente;

  try {
    const balcao = await balcaoDoOperador(userId);

    // O atendimento foi aberto por ESTE balcão. Sem esta conferência, o token
    // de um comércio serviria para queimar carimbos no outro.
    if (atendimento.balcaoId !== balcao.id) {
      return NextResponse.json({ erro: "este atendimento não é deste balcão" }, { status: 403 });
    }

    const admin = supabaseAdmin();

    const { data: recompensa } = await admin
      .from("rewards")
      .select("id, title, stamp_cost, point_cost, active, max_redemptions, redeemed, starts_at, ends_at")
      .eq("establishment_id", balcao.id)
      .eq("id", String(corpo.recompensa ?? ""))
      .maybeSingle();

    if (!recompensa) return NextResponse.json({ erro: "prêmio não encontrado nesta loja" }, { status: 404 });

    const recusa = motivoDaRecusa(recompensa);
    if (recusa) return NextResponse.json({ erro: recusa }, { status: 422 });

    // Confere o saldo antes de gravar: recusar aqui é uma mensagem para o
    // atendente; recusar depois seria uma entrega registrada que não aconteceu.
    const cartela = await lerCartela(balcao.id, profileId);
    if (cartela.saldo < recompensa.stamp_cost) {
      return NextResponse.json({ erro: "o cliente não tem carimbos suficientes" }, { status: 422 });
    }

    const assumida = await assumirEntrega(claimRef, {
      reward_id: recompensa.id,
      establishment_id: balcao.id,
      customer_profile_id: profileId,
      operator_profile_id: userId ?? null,
      pos_terminal_id: balcao.terminal?.id ?? null,
      stamps_burned: recompensa.stamp_cost,
      points_burned: 0,
    });

    if (assumida === "duplicada") {
      return NextResponse.json({
        ok: true,
        duplicada: true,
        titulo: recompensa.title,
        selos: recompensa.stamp_cost,
        pontos: recompensa.point_cost,
      });
    }

    if (assumida === "falhou") {
      return NextResponse.json({ erro: "não foi possível registrar a entrega" }, { status: 500 });
    }

    try {
      const restante = await debitarCarimbos(balcao.id, profileId, recompensa.stamp_cost);
      if (!restante) throw new ErroDePdv(409, "outro caixa mexeu nesta cartela agora — tente de novo");
    } catch (e) {
      const mensagem = e instanceof ErroDePdv ? e.message : "não foi possível entregar agora";
      console.error("[pdv] falha ao descontar o prêmio:", e instanceof Error ? e.message : e);
      // O cliente vai junto por exigência do tipo gerado — `customer_profile_id`
      // é NOT NULL e reaparece em todo `update`. Reescrever o mesmo valor.
      await admin
        .from("redemptions")
        .update({ status: "falhou", erro: mensagem, customer_profile_id: profileId })
        .eq("claim_ref", claimRef);
      return NextResponse.json({ erro: mensagem }, { status: 422 });
    }

    await somarResgate(recompensa.id, recompensa.redeemed);

    return NextResponse.json({
      ok: true,
      titulo: recompensa.title,
      selos: recompensa.stamp_cost,
      pontos: recompensa.point_cost,
    });
  } catch (e) {
    if (e instanceof ErroDePdv) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[pdv] falha inesperada na entrega:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha inesperada na entrega" }, { status: 500 });
  }
}

type Recompensa = {
  active: boolean;
  point_cost: number;
  max_redemptions: number;
  redeemed: number;
  starts_at: string | null;
  ends_at: string | null;
};

/**
 * Por que este prêmio não pode sair agora.
 *
 * As frases são as mesmas de quando quem recusava era o contrato: o atendente
 * já leu essas palavras, e trocá-las por sinônimos criaria dois vocabulários
 * para o mesmo problema. O que mudou é só quem confere.
 */
const motivoDaRecusa = (r: Recompensa) => {
  const agora = Date.now();

  if (!r.active) return "este prêmio não está mais no ar";
  if (r.max_redemptions > 0 && r.redeemed >= r.max_redemptions) return "este prêmio esgotou";
  if (r.starts_at && new Date(r.starts_at).getTime() > agora) return "este prêmio ainda não começou";
  if (r.ends_at && new Date(r.ends_at).getTime() < agora) return "a validade deste prêmio terminou";
  // M9: ponto da cidade não tem mais onde ser contado, e um prêmio pago em
  // ponto não tem como ser cobrado. Recusar é a única resposta honesta.
  if (r.point_cost > 0) return "prêmio pago em pontos da cidade ainda não pode ser entregue";

  return undefined;
};

type Entrega = Omit<TablesInsert<"redemptions">, "claim_ref" | "status" | "erro" | "confirmed_at">;

/**
 * Reserva o `claim_ref` para esta entrega.
 *
 * `assumida` é quem pode descontar; `duplicada` é o reenvio encontrando a
 * entrega que já saiu. Uma linha que existe mas não está confirmada é entrega
 * que ficou pelo caminho — a virada é condicionada a isso, então dois reenvios
 * simultâneos descontam uma vez só.
 */
const assumirEntrega = async (claimRef: string, dados: Entrega): Promise<"assumida" | "duplicada" | "falhou"> => {
  const admin = supabaseAdmin();
  const confirmada = { status: "confirmada" as const, erro: null, confirmed_at: new Date().toISOString() };

  const { error } = await admin.from("redemptions").insert({ claim_ref: claimRef, ...dados, ...confirmada });
  if (!error) return "assumida";

  if (error.code !== CHAVE_DUPLICADA) {
    console.error("[pdv] falha ao gravar a entrega:", error.message);
    return "falhou";
  }

  const { data: retomada } = await admin
    .from("redemptions")
    .update({ ...dados, ...confirmada })
    .eq("claim_ref", claimRef)
    .neq("status", "confirmada")
    .select("claim_ref")
    .maybeSingle();

  return retomada ? "assumida" : "duplicada";
};

/**
 * Conta mais uma entrega no prêmio.
 *
 * Condicionada ao número que acabamos de ler: se outro caixa entregou no mesmo
 * instante, refazemos a soma em cima do valor dele em vez de sobrescrevê-lo —
 * é este contador que decide quando o prêmio esgota.
 */
// M9: vira um `increment` no Postgres e a corrida deixa de existir.
const somarResgate = async (rewardId: string, lido: number) => {
  const admin = supabaseAdmin();
  let atual = lido;

  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const { data } = await admin
      .from("rewards")
      .update({ redeemed: atual + 1, updated_at: new Date().toISOString() })
      .eq("id", rewardId)
      .eq("redeemed", atual)
      .select("redeemed")
      .maybeSingle();

    if (data) return;

    const { data: linha } = await admin.from("rewards").select("redeemed").eq("id", rewardId).maybeSingle();
    if (!linha) return;
    atual = linha.redeemed;
  }
};
