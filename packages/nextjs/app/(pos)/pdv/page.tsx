import type { NextPage } from "next";
import { TerminalPdv } from "~~/components/pdv/TerminalPdv";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Terminal do balcão",
  description: "Registre a venda e carimbe o cliente em dois toques.",
});

/** Tela principal do PDV: o atendente opera daqui o dia inteiro. */
const Pdv: NextPage = () => <TerminalPdv />;

export default Pdv;
