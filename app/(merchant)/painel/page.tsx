import type { NextPage } from "next";
import { VisaoGeral } from "~~/components/merchant/VisaoGeral";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Painel da loja",
  description: "Carimbos do dia, pendências e o estado da sua operação.",
});

const Painel: NextPage = () => <VisaoGeral />;

export default Painel;
