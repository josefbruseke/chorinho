import type { NextPage } from "next";
import { MerchantTerminal } from "~~/components/vitrine/MerchantTerminal";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Terminal do balcão",
  description: "Registre carimbos e entregue recompensas no caixa.",
});

/** Tela principal do PDV: o atendente opera daqui o dia inteiro. */
const Pdv: NextPage = () => <MerchantTerminal />;

export default Pdv;
