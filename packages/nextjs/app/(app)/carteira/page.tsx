import type { NextPage } from "next";
import { MinhasCartelas } from "~~/components/carteira/MinhasCartelas";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Minhas cartelas",
  description: "Seus carimbos em cada loja do bairro e o que falta para o próximo prêmio.",
});

const Carteira: NextPage = () => <MinhasCartelas />;

export default Carteira;
