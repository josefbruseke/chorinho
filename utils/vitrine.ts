/**
 * As categorias de estabelecimento, e a arte que cada uma empresta.
 *
 * O gradiente e o ícone dão um cartão apresentável para quem ainda não subiu
 * imagem nenhuma — e num bairro onde o lojista cadastra pelo celular, isso é a
 * maioria. Sem eles a vitrine nasceria cheia de retângulo cinza.
 *
 * O resto deste arquivo — campanha, cupom, preço em ETH convertido para reais
 * por uma taxa inventada — saiu junto com o modelo antigo de cupom.
 */
export const CATEGORIES = [
  { id: 0, label: "Cafés & Gastronomia", iconKey: "cafe", gradient: "bg-linear-to-br from-amber-800 to-stone-900" },
  { id: 1, label: "Lazer & Experiências", iconKey: "lazer", gradient: "bg-linear-to-br from-orange-800 to-amber-950" },
  {
    id: 2,
    label: "Barbearias & Estética",
    iconKey: "barbearia",
    gradient: "bg-linear-to-br from-stone-800 to-stone-950",
  },
  { id: 3, label: "Cultura & Livros", iconKey: "cultura", gradient: "bg-linear-to-br from-amber-900 to-stone-900" },
  { id: 4, label: "Mercados & Lojas", iconKey: "mercado", gradient: "bg-linear-to-br from-amber-800 to-orange-950" },
] as const;

export type CategoryIconKey = (typeof CATEGORIES)[number]["iconKey"];

export const categoryInfo = (id: number) => CATEGORIES[id] ?? CATEGORIES[0];
