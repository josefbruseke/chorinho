import { type NextRequest, NextResponse } from "next/server";
import { stringToHex } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseServer } from "~~/services/database/server";
import {
  clientePublico,
  enderecoDoContrato,
  erroDoContrato,
  escreverComoAdmin,
  relayerConfigurado,
} from "~~/services/relayer/servidor";

export const runtime = "nodejs";

// Espera a transação ser minerada: na Sepolia o bloco fecha a cada ~12s, e no
// teto padrão da Vercel a função morre no meio da espera.
export const maxDuration = 60;

/**
 * O pedaço do PointsVault que o back office usa para administrar o catálogo
 * de tipos de ponto. Vive aqui, e não em `services/relayer/abi.ts`, porque
 * essa tela é a única que precisa dele — declarar no arquivo compartilhado
 * espalharia uma responsabilidade que só existe neste lugar.
 */
const ABI_PONTOS_ADMIN = [
  {
    type: "function",
    name: "pointTypes",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "name", type: "bytes32" },
      { name: "scope", type: "uint8" },
      { name: "scopeId", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "createPointType",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "name", type: "bytes32" },
      { name: "scope", type: "uint8" },
      { name: "scopeId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPointTypeActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "PointTypeCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "name", type: "bytes32", indexed: false },
      { name: "scope", type: "uint8", indexed: false },
      { name: "scopeId", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "UnknownPointType", inputs: [] },
] as const;

/** Nomes do enum `Scope` do contrato, na ordem exata da declaração Solidity. */
const ESCOPOS = ["Global", "Cidade", "Região", "Bairro", "Categoria", "Estabelecimento"] as const;
type NomeDeEscopo = (typeof ESCOPOS)[number];

/**
 * `bytes32 name` chega preenchido com zero à direita: é como o Solidity
 * converte um literal de string para bytes32, sem o length-prefix do ABI
 * dinâmico. Cortar os zeros é o inverso dessa conversão.
 */
const textoDoNome = (hex: `0x${string}`) => {
  const bytes = Buffer.from(hex.slice(2), "hex");
  const fimDoTexto = bytes.indexOf(0);
  return bytes.subarray(0, fimDoTexto === -1 ? bytes.length : fimDoTexto).toString("utf8");
};

/**
 * A struct não tem contador nem lista: o único jeito de descobrir quais ids
 * existem é reler o evento de criação desde o bloco do deploy e, a partir daí,
 * consultar o estado atual de cada um — porque `active` pode ter mudado depois
 * do evento.
 */
const listarTiposDePonto = async () => {
  const publico = clientePublico();
  const endereco = enderecoDoContrato("PointsVault");
  const chainId = publico.chain.id;

  const infoDoContrato = (
    deployedContracts as Record<number, Record<string, { address: string; deployedOnBlock: number }>>
  )[chainId]?.PointsVault;
  const blocoDeOrigem = infoDoContrato ? BigInt(infoDoContrato.deployedOnBlock) : 0n;

  const eventos = await publico.getContractEvents({
    address: endereco,
    abi: ABI_PONTOS_ADMIN,
    eventName: "PointTypeCreated",
    fromBlock: blocoDeOrigem,
    toBlock: "latest",
  });

  const ids = [...new Set(eventos.map(e => e.args.id).filter((id): id is bigint => id !== undefined))].sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );

  return Promise.all(
    ids.map(async id => {
      const [name, scope, scopeId, active] = await publico.readContract({
        address: endereco,
        abi: ABI_PONTOS_ADMIN,
        functionName: "pointTypes",
        args: [id],
      });
      return {
        id: id.toString(),
        nome: textoDoNome(name),
        escopo: ESCOPOS[scope] ?? "Global",
        escopoId: scopeId.toString(),
        ativo: active,
      };
    }),
  );
};

/** GET: o catálogo de tipos de ponto, lido direto da cadeia. */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  if (!relayerConfigurado()) {
    return NextResponse.json({ tipos: [], indisponivel: true });
  }

  try {
    const tipos = await listarTiposDePonto();
    return NextResponse.json({ tipos, indisponivel: false });
  } catch {
    // RPC fora do ar não pode derrubar a tela — só esconde o que ela mostraria.
    return NextResponse.json({ tipos: [], indisponivel: true });
  }
}

type CorpoDeCriacao = { id: unknown; nome: unknown; escopo: unknown; escopoId: unknown };

/** POST: cria uma classe de ponto nova. */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  if (!relayerConfigurado()) {
    return NextResponse.json({ erro: "relayer não configurado nesta rede" }, { status: 503 });
  }

  const corpo = (await request.json().catch(() => ({}))) as Partial<CorpoDeCriacao>;
  const id = typeof corpo.id === "number" || typeof corpo.id === "string" ? BigInt(corpo.id) : undefined;
  const nome = typeof corpo.nome === "string" ? corpo.nome.trim() : "";
  const escopo = ESCOPOS.indexOf(corpo.escopo as NomeDeEscopo);
  const escopoId =
    typeof corpo.escopoId === "number" || typeof corpo.escopoId === "string" ? BigInt(corpo.escopoId) : 0n;

  if (id === undefined || id <= 0n) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }
  if (!nome) {
    return NextResponse.json({ erro: "nome obrigatório" }, { status: 400 });
  }
  if (new TextEncoder().encode(nome).length > 32) {
    return NextResponse.json({ erro: "nome muito longo (máx. 32 bytes em UTF-8)" }, { status: 400 });
  }
  if (escopo === -1) {
    return NextResponse.json({ erro: "escopo inválido" }, { status: 400 });
  }

  try {
    // `createPointType` sobrescreve sem avisar se o id já existir — a
    // conferência é daqui, não do contrato, para não arriscar apagar por
    // engano o nome e o escopo de um tipo de ponto que já está em uso.
    const publico = clientePublico();
    const endereco = enderecoDoContrato("PointsVault");
    const [nomeExistente] = await publico.readContract({
      address: endereco,
      abi: ABI_PONTOS_ADMIN,
      functionName: "pointTypes",
      args: [id],
    });
    if (nomeExistente !== `0x${"0".repeat(64)}`) {
      return NextResponse.json({ erro: `id ${id} já existe: ${textoDoNome(nomeExistente)}` }, { status: 409 });
    }

    const hash = await escreverComoAdmin("PointsVault", ABI_PONTOS_ADMIN, "createPointType", [
      id,
      stringToHex(nome, { size: 32 }),
      escopo,
      escopoId,
    ]);
    return NextResponse.json({ hash });
  } catch (e) {
    const doContrato = erroDoContrato(e);
    return NextResponse.json(
      { erro: doContrato?.nome ?? "a rede recusou a criação do tipo de ponto" },
      { status: 502 },
    );
  }
}

/** PATCH: liga ou desliga um tipo de ponto existente. */
export async function PATCH(request: NextRequest) {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  if (!relayerConfigurado()) {
    return NextResponse.json({ erro: "relayer não configurado nesta rede" }, { status: 503 });
  }

  const corpo = (await request.json().catch(() => ({}))) as { id?: unknown; ativo?: unknown };
  const id = typeof corpo.id === "number" || typeof corpo.id === "string" ? BigInt(corpo.id) : undefined;
  const ativo = Boolean(corpo.ativo);

  if (id === undefined || id <= 0n) {
    return NextResponse.json({ erro: "id inválido" }, { status: 400 });
  }

  try {
    const hash = await escreverComoAdmin("PointsVault", ABI_PONTOS_ADMIN, "setPointTypeActive", [id, ativo]);
    return NextResponse.json({ hash });
  } catch (e) {
    const doContrato = erroDoContrato(e);
    return NextResponse.json({ erro: doContrato?.nome ?? "a rede recusou a alteração" }, { status: 502 });
  }
}
