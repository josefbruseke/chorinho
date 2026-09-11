import type { NextPage } from "next";
import { EntregaDePremio } from "~~/components/pdv/EntregaDePremio";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Entregar prêmio",
  description: "Leia o passe do cliente e entregue o que ele já conquistou.",
});

const Resgatar: NextPage = () => <EntregaDePremio />;

export default Resgatar;
