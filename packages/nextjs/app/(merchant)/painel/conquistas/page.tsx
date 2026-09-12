import type { NextPage } from "next";
import { ConquistasDaLoja } from "~~/components/merchant/ConquistasDaLoja";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Conquistas",
  description: "As metas que a sua loja define, conferidas pela rede.",
});

const Conquistas: NextPage = () => <ConquistasDaLoja />;

export default Conquistas;
