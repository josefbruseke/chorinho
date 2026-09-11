import type { NextPage } from "next";
import { EmConstrucao } from "~~/components/EmConstrucao";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Perfil",
  description: "Sua conta, sua carteira e suas preferências.",
});

const Perfil: NextPage = () => (
  <EmConstrucao
    titulo="Seu perfil"
    descricao="Sua conta, o endereço da sua carteira, preferências de tema e a opção de conectar uma carteira própria."
    etapa="M2"
    voltarPara="/mapa"
    voltarLabel="Voltar ao mapa"
  />
);

export default Perfil;
