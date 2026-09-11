import type { NextPage } from "next";
import { EmConstrucao } from "~~/components/EmConstrucao";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Painel do lojista",
  description: "Gerencie sua loja, produtos, regras de pontuação e recompensas.",
});

const Painel: NextPage = () => (
  <EmConstrucao
    titulo="Painel do lojista"
    descricao="Daqui você vai configurar sua loja, o catálogo, as regras de quantos reais valem um carimbo, as recompensas e a equipe do balcão."
    etapa="M6"
    voltarPara="/pdv"
    voltarLabel="Abrir o terminal do balcão"
  />
);

export default Painel;
