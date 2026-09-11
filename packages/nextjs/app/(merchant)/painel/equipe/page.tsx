import type { NextPage } from "next";
import { EquipeDaLoja } from "~~/components/merchant/EquipeDaLoja";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Equipe",
  description: "Quem administra o painel da sua loja.",
});

const Equipe: NextPage = () => <EquipeDaLoja />;

export default Equipe;
