import type { NextPage } from "next";
import { ProgramasDaLoja } from "~~/components/merchant/ProgramasDaLoja";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Programas de desconto",
  description: "A regra com nome que as peças da sua loja acionam.",
});

const Programas: NextPage = () => <ProgramasDaLoja />;

export default Programas;
