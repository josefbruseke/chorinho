import { NextResponse } from "next/server";
import { supabaseAdmin } from "~~/services/database/admin";
import { formatarCentavos } from "~~/utils/dinheiro";
import { enderecoDoSite, urlDaMidia } from "~~/utils/midia";

export const runtime = "nodejs";

/**
 * O metadado que a peça e o selo apontam na cadeia.
 *
 * Antes o seed embutia `data:application/json,{…}` na própria URI do token.
 * Funciona para demonstrar, mas congela o metadado: mudar uma vírgula na
 * descrição exigiria uma transação, e arte de verdade não cabe dentro de uma
 * string de contrato. Aqui a URI é estável e o conteúdo vem do Supabase.
 *
 * O `attributes` não está no EIP — é convenção de marketplace, e sem ele a
 * carteira mostra um retângulo com nome e mais nada.
 *
 * Duas famílias:
 *   `/api/nft/peca/<tokenId>`   a peça de desconto, transferível
 *   `/api/nft/selo/<conquista>` o selo da conquista, que não se transfere
 */

const CRITERIOS = [
  (alvo: number) => `${alvo} carimbos nesta loja`,
  (alvo: number) => `${alvo} visitas seguidas`,
  (alvo: number) => `${alvo} visitas`,
  (alvo: number) => `${formatarCentavos(alvo)} gastos nesta loja`,
  (alvo: number) => `uma compra de ${formatarCentavos(alvo)}`,
];

/** O benefício do programa em português, que é como ele aparece na carteira. */
const beneficio = (kind: number, base: number, nivel: number, tetoCentavos: number) => {
  if (kind === 1) return formatarCentavos(base * nivel);
  const percentual = (base * nivel) / 100;
  const texto = `${Number.isInteger(percentual) ? percentual : percentual.toFixed(2)}%`;
  return tetoCentavos > 0 ? `${texto} até ${formatarCentavos(tetoCentavos)}` : texto;
};

const semCache = { "cache-control": "public, max-age=60, s-maxage=300" };

export async function GET(_req: Request, { params }: { params: Promise<{ familia: string; id: string }> }) {
  const { familia, id } = await params;
  const onchainId = Number(id);

  if (!Number.isInteger(onchainId) || onchainId <= 0) {
    return NextResponse.json({ erro: "identificador inválido" }, { status: 400 });
  }
  if (familia !== "peca" && familia !== "selo") {
    return NextResponse.json({ erro: "família desconhecida" }, { status: 404 });
  }

  const corpo = familia === "peca" ? await metadadoDaPeca(onchainId) : await metadadoDoSelo(onchainId);
  if (!corpo) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  return NextResponse.json(corpo, { headers: semCache });
}

const metadadoDaPeca = async (onchainId: number) => {
  const admin = supabaseAdmin();

  const { data: peca } = await admin
    .from("pieces")
    .select("title, description, image_path, level, max_supply, ends_at, program_id")
    .eq("onchain_id", onchainId)
    .maybeSingle();

  if (!peca) return undefined;

  const { data: programa } = await admin
    .from("discount_programs")
    .select("name, kind, base_benefit, cap_cents, product, joint, establishment_id")
    .eq("id", peca.program_id)
    .maybeSingle();

  const { data: loja } = programa
    ? await admin.from("establishments").select("name, slug").eq("id", programa.establishment_id).maybeSingle()
    : { data: null };

  const atributos: Record<string, unknown>[] = [];
  if (loja) atributos.push({ trait_type: "Estabelecimento", value: loja.name });
  if (programa) {
    atributos.push({ trait_type: "Programa", value: programa.name });
    atributos.push({
      trait_type: "Desconto",
      value: beneficio(programa.kind, programa.base_benefit, peca.level, programa.cap_cents),
    });
    atributos.push({ trait_type: "Vale em", value: programa.product ?? "toda a loja" });
    if (programa.joint) atributos.push({ trait_type: "Programa conjunto", value: "sim" });
  }
  atributos.push({ trait_type: "Nível", value: peca.level });
  if (peca.max_supply > 0) atributos.push({ trait_type: "Tiragem", value: peca.max_supply });
  if (peca.ends_at) {
    atributos.push({
      display_type: "date",
      trait_type: "Vale até",
      value: Math.floor(new Date(peca.ends_at).getTime() / 1000),
    });
  }

  return {
    name: peca.title,
    description: peca.description ?? `Peça colecionável${loja ? ` do ${loja.name}` : ""}.`,
    image: urlDaMidia(peca.image_path),
    external_url: loja ? `${enderecoDoSite()}/local/${loja.slug}` : enderecoDoSite(),
    attributes: atributos,
  };
};

const metadadoDoSelo = async (onchainId: number) => {
  const admin = supabaseAdmin();

  const { data: conquista } = await admin
    .from("achievements")
    .select("title, description, image_path, criterion, target, establishment_id")
    .eq("onchain_id", onchainId)
    .maybeSingle();

  if (!conquista) return undefined;

  const { data: loja } = await admin
    .from("establishments")
    .select("name, slug")
    .eq("id", conquista.establishment_id)
    .maybeSingle();

  const legivel = CRITERIOS[conquista.criterion]?.(Number(conquista.target)) ?? `${conquista.target}`;

  return {
    name: conquista.title,
    description: conquista.description ?? `Conquistado por ${legivel}${loja ? ` no ${loja.name}` : ""}.`,
    image: urlDaMidia(conquista.image_path),
    external_url: loja ? `${enderecoDoSite()}/local/${loja.slug}` : enderecoDoSite(),
    attributes: [
      ...(loja ? [{ trait_type: "Estabelecimento", value: loja.name }] : []),
      { trait_type: "Conquista", value: legivel },
      // Quem recebe precisa saber que isto não se vende. O selo prova que VOCÊ
      // esteve lá; vendê-lo destruiria o que ele significa.
      { trait_type: "Transferível", value: "não" },
    ],
  };
};
