import type { NextPage } from "next";
import { EntregaDePremio } from "~~/components/pdv/EntregaDePremio";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Prêmio ou peça",
  description: "Leia o passe do cliente: entregue um prêmio ou use uma peça de desconto.",
});

const Resgatar: NextPage = () => <EntregaDePremio />;

export default Resgatar;
