import { type NextRequest, NextResponse } from "next/server";
import { keccak256, parseEventLogs, stringToHex } from "viem";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { ErroDeGestao, lojaDoGestor } from "~~/services/merchant/acesso";
import { clientePublico, erroDoContrato, escreverComoAdmin, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/**
 * Classe de ponto padrão da rede — o ponto da cidade. Não existe outra hoje,
 * mas fica nomeado em vez de um `1n` solto no meio dos argumentos.
 */
const PONTO_DA_CIDADE = 1n;

/**
 * O pedaço do RewardCatalog que só esta rota usa: criar o prêmio e ler o
 * evento que devolve o `rewardId`.
 *
 * Não entra em `services/relayer/abi.ts` de propósito — outro processo mexe
 * naquele arquivo, e só o cadastro do lojista chama `createReward`.
 */
const ABI_CATALOGO_CRIACAO = [
  {
    type: "function",
    name: "createReward",
    stateMutability: "nonpayable",
    inputs: [
      { name: "establishmentId", type: "uint256" },
      { name: "stampCost", type: "uint256" },
      { name: "pointTypeId", type: "uint256" },
      { name: "pointCost", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "maxRedemptions", type: "uint32" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "rewardId", type: "uint256" }],
  },
  {
    type: "event",
    name: "RewardCreated",
    inputs: [
      { name: "rewardId", type: "uint256", indexed: true },
      { name: "establishmentId", type: "uint256", indexed: true },
      { name: "stampCost", type: "uint256", indexed: false },
      { name: "pointCost", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "NotEstablishmentOwner", inputs: [] },
  { type: "error", name: "FreeRewardNotAllowed", inputs: [] },
] as const;

const sessao = async () => {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  return claims?.claims?.sub;
};

type LinhaDeRecompensa = {
  id: string;
  onchain_id: number | null;
  title: string;
  description: string | null;
  stamp_cost: number;
  point_cost: number;
  active: boolean;
  max_redemptions: number;
  redeemed: number;
};

const COLUNAS = "id, onchain_id, title, description, stamp_cost, point_cost, active, max_redemptions, redeemed";

/** Do formato da tabela para o que a tela do lojista consome. */
const mapearRecompensa = (r: LinhaDeRecompensa) => ({
  id: r.id,
  onchainId: r.onchain_id,
  titulo: r.title,
  descricao: r.description,
  selos: r.stamp_cost,
  pontos: r.point_cost,
  ativa: r.active,
  maxResgates: r.max_redemptions,
  resgatados: r.redeemed,
  // Sem `onchain_id` o contrato não sabe que este prêmio existe: o balcão
  // não tem o que entregar, por mais que o Supabase já mostre a foto e o
  // texto na vitrine.
  rascunho: r.onchain_id === null,
});

/** As recompensas da loja, todas — inclusive as desligadas e os rascunhos. */
export async function GET() {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  try {
    const loja = await lojaDoGestor(userId);
    const { data: recompensas } = await supabaseAdmin()
      .from("rewards")
      .select(COLUNAS)
      .eq("establishment_id", loja.id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      loja: { nome: loja.nome },
      recompensas: (recompensas ?? []).map(mapearRecompensa),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    return NextResponse.json({ erro: "falha ao listar as recompensas" }, { status: 500 });
  }
}

/**
 * Cadastra um prêmio.
 *
 * Grava no Supabase antes de tentar a rede: o que o lojista digitou não pode
 * sumir por causa de um RPC fora do ar. Se a rede falhar, o prêmio fica como
 * rascunho — visível na lista, mas sem `onchain_id`, então o balcão ainda não
 * consegue entregá-lo.
 */
export async function POST(request: NextRequest) {
  const userId = await sessao();
  if (!userId) return NextResponse.json({ erro: "sem sessão" }, { status: 401 });

  let corpo: { titulo?: unknown; descricao?: unknown; selos?: unknown; pontos?: unknown };
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  const titulo = String(corpo.titulo ?? "").trim();
  const descricao = typeof corpo.descricao === "string" ? corpo.descricao.trim().slice(0, 280) : "";
  const selos = Number(corpo.selos);
  const pontos = Number(corpo.pontos);

  if (titulo.length < 2 || titulo.length > 80) {
    return NextResponse.json({ erro: "o título precisa ter entre 2 e 80 caracteres" }, { status: 400 });
  }
  if (!Number.isInteger(selos) || selos < 0 || !Number.isInteger(pontos) || pontos < 0) {
    return NextResponse.json(
      { erro: "carimbos e pontos precisam ser números inteiros, zero ou mais" },
      { status: 400 },
    );
  }
  // O contrato também recusa isto (`FreeRewardNotAllowed`), mas avisar aqui
  // poupa o lojista de esperar a chamada à rede para descobrir o problema.
  if (selos === 0 && pontos === 0) {
    return NextResponse.json(
      { erro: "um prêmio precisa custar carimbos, pontos, ou os dois — de graça não pode" },
      { status: 400 },
    );
  }

  try {
    const loja = await lojaDoGestor(userId);
    const admin = supabaseAdmin();

    const { data: reward, error } = await admin
      .from("rewards")
      .insert({
        establishment_id: loja.id,
        title: titulo,
        description: descricao || null,
        stamp_cost: selos,
        point_cost: pontos,
        point_type_id: Number(PONTO_DA_CIDADE),
        active: true,
      })
      .select(COLUNAS)
      .single();

    if (error || !reward) return NextResponse.json({ erro: "não foi possível salvar o prêmio" }, { status: 500 });

    const registro = await registrarNaRede(loja, reward, titulo);
    if (!registro.ok) {
      return NextResponse.json({ ok: true, recompensa: mapearRecompensa(reward), aviso: registro.aviso });
    }

    const { data: atualizado } = await admin
      .from("rewards")
      .update({ onchain_id: registro.onchainId, updated_at: new Date().toISOString() })
      .eq("id", reward.id)
      .eq("establishment_id", loja.id)
      .select(COLUNAS)
      .single();

    return NextResponse.json({
      ok: true,
      recompensa: mapearRecompensa(atualizado ?? { ...reward, onchain_id: registro.onchainId }),
    });
  } catch (e) {
    if (e instanceof ErroDeGestao) return NextResponse.json({ erro: e.message }, { status: e.status });
    console.error("[recompensas] falha ao criar o prêmio:", e instanceof Error ? e.message : e);
    return NextResponse.json({ erro: "falha ao criar o prêmio" }, { status: 500 });
  }
}

type ResultadoDoRegistro = { ok: true; onchainId: number } | { ok: false; aviso: string };

/**
 * Cria o prêmio na rede e lê o `rewardId` que o evento `RewardCreated`
 * devolve — é ele que amarra a linha do Supabase ao registro on-chain.
 *
 * Sem relayer configurado, ou sem a loja registrada na rede, nem tentamos: o
 * prêmio fica como rascunho até as duas coisas existirem.
 */
const registrarNaRede = async (
  loja: { onchainId: number | null },
  reward: { id: string; stamp_cost: number; point_cost: number },
  titulo: string,
): Promise<ResultadoDoRegistro> => {
  if (!relayerConfigurado()) {
    return { ok: false, aviso: "prêmio salvo como rascunho: a rede não está configurada neste ambiente." };
  }
  if (loja.onchainId === null) {
    return {
      ok: false,
      aviso: "prêmio salvo como rascunho: sua loja ainda não foi registrada na rede (veja Minha loja).",
    };
  }

  try {
    // O hash amarra o registro on-chain ao conteúdo do Supabase no momento da
    // criação — o contrato só guarda o hash, não o texto, então isto detecta
    // adulteração sem duplicar a foto e a descrição na cadeia.
    const metadataHash = keccak256(stringToHex(`${reward.id}:${titulo}`));

    const hash = await escreverComoAdmin("RewardCatalog", ABI_CATALOGO_CRIACAO, "createReward", [
      BigInt(loja.onchainId),
      BigInt(reward.stamp_cost),
      PONTO_DA_CIDADE,
      BigInt(reward.point_cost),
      0n,
      0n,
      0,
      metadataHash,
    ]);

    const recibo = await clientePublico().getTransactionReceipt({ hash });
    const [evento] = parseEventLogs({ abi: ABI_CATALOGO_CRIACAO, eventName: "RewardCreated", logs: recibo.logs });
    if (!evento) {
      return {
        ok: false,
        aviso: "prêmio salvo, mas a rede não confirmou o registro — tente ligar o prêmio de novo em instantes.",
      };
    }

    return { ok: true, onchainId: Number(evento.args.rewardId) };
  } catch (e) {
    console.error("[recompensas] falha ao criar o prêmio na rede:", e instanceof Error ? e.message : e);
    switch (erroDoContrato(e)?.nome) {
      case "NotEstablishmentOwner":
        return {
          ok: false,
          aviso: "prêmio salvo como rascunho: a plataforma ainda não tem permissão para gerenciar prêmios desta loja.",
        };
      case "FreeRewardNotAllowed":
        return { ok: false, aviso: "prêmio salvo como rascunho: a rede recusou um prêmio sem custo." };
      default:
        return { ok: false, aviso: "prêmio salvo como rascunho: não foi possível registrar na rede agora." };
    }
  }
};
