const BUCKET = "midia";

/**
 * O endereço público de um arquivo do balde de mídia.
 *
 * O banco guarda o caminho (`pecas/bronze.png`), nunca a URL inteira: o dia em
 * que o projeto da Supabase mudar de endereço, ou a arte passar por uma CDN, é
 * uma linha aqui e não um UPDATE em cinco tabelas.
 *
 * Devolve `undefined` quando não há arquivo, e a tela decide o que desenhar no
 * lugar. Nunca devolve uma URL quebrada: imagem quebrada numa vitrine parece
 * loja fechada.
 */
export const urlDaMidia = (caminho?: string | null) => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!caminho || !base) return undefined;
  if (caminho.startsWith("http://") || caminho.startsWith("https://")) return caminho;
  return `${base}/storage/v1/object/public/${BUCKET}/${caminho.replace(/^\/+/, "")}`;
};

/**
 * O endereço do site, para o que precisa de URL absoluta.
 *
 * Metadado de NFT é lido por carteira e por marketplace, que não têm ideia de
 * qual é o nosso domínio. Em desenvolvimento cai no localhost; publicado, a
 * Vercel preenche `VERCEL_PROJECT_PRODUCTION_URL` sozinha — mas
 * `NEXT_PUBLIC_SITE_URL` vence as duas, porque domínio próprio não aparece em
 * variável de plataforma.
 */
export const enderecoDoSite = () => {
  const explicito = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicito) return explicito.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
};

/** A URI que vai gravada na cadeia para uma peça ou um selo. */
export const uriDoToken = (familia: "peca" | "selo", onchainId: number | bigint) =>
  `${enderecoDoSite()}/api/nft/${familia}/${onchainId.toString()}`;
