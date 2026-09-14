import type { NextPage } from "next";
import { ColecaoDaLoja } from "~~/components/merchant/ColecaoDaLoja";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Coleção",
  description: "As peças colecionáveis que a sua loja emite.",
});

const Colecao: NextPage = () => <ColecaoDaLoja />;

export default Colecao;
