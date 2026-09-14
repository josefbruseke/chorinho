import type { NextPage } from "next";
import { RegrasDeCarimbo } from "~~/components/merchant/RegrasDeCarimbo";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Regra de carimbo",
  description: "Quanto de compra vale um carimbo na sua loja.",
});

const Regras: NextPage = () => <RegrasDeCarimbo />;

export default Regras;
