import type { NextPage } from "next";
import { EmConstrucao } from "~~/components/EmConstrucao";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Recompensas",
  description: "Troque seus carimbos e pontos por produtos nos parceiros.",
});

const Recompensas: NextPage = () => (
  <EmConstrucao
    titulo="Recompensas"
    descricao="O catálogo onde você troca carimbos e pontos da cidade por produtos dos comércios parceiros."
    etapa="M5"
    voltarPara="/carteira"
    voltarLabel="Ver minha carteira"
  />
);

export default Recompensas;
