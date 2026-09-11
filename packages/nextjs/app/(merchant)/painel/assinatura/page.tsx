import type { NextPage } from "next";
import { AssinaturaDaLoja } from "~~/components/merchant/AssinaturaDaLoja";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Assinatura",
  description: "O plano da sua loja e o que muda quando a assinatura vence.",
});

const Assinatura: NextPage = () => <AssinaturaDaLoja />;

export default Assinatura;
