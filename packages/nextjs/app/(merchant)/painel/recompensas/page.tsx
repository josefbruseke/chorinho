import type { NextPage } from "next";
import { RecompensasDaLoja } from "~~/components/merchant/RecompensasDaLoja";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Recompensas",
  description: "O que os carimbos da sua loja compram.",
});

const Recompensas: NextPage = () => <RecompensasDaLoja />;

export default Recompensas;
