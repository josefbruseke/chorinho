import type { NextPage } from "next";
import { EmConstrucao } from "~~/components/EmConstrucao";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Mapa",
  description: "Os comércios parceiros perto de você.",
});

const Mapa: NextPage = () => (
  <EmConstrucao
    titulo="O mapa do bairro"
    descricao="Aqui vai ficar o mapa com os comércios parceiros perto de você, os bônus de cada local e quantos carimbos você já tem em cada um."
    etapa="M5"
    voltarPara="/explorar"
    voltarLabel="Ver a lista de locais"
  />
);

export default Mapa;
