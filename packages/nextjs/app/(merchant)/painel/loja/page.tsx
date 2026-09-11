import type { NextPage } from "next";
import { DadosDaLoja } from "~~/components/merchant/DadosDaLoja";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Minha loja",
  description: "Identidade, endereço, contato e horário de funcionamento da sua loja no Chorinho.",
});

const Loja: NextPage = () => <DadosDaLoja />;

export default Loja;
