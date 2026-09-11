import type { NextPage } from "next";
import { CartelaDaLoja } from "~~/components/carteira/CartelaDaLoja";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Cartela da loja",
  description: "Seus carimbos nesta loja e o que dá para trocar por eles.",
});

const Cartela: NextPage<{ params: Promise<{ slug: string }> }> = async ({ params }) => {
  const { slug } = await params;
  return <CartelaDaLoja slug={slug} />;
};

export default Cartela;
