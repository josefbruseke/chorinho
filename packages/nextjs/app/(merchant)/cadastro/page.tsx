import type { NextPage } from "next";
import { EmConstrucao } from "~~/components/EmConstrucao";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Cadastrar meu comércio",
  description: "Coloque seu estabelecimento no Chorinho.",
});

const Cadastro: NextPage = () => (
  <EmConstrucao
    titulo="Cadastrar meu comércio"
    descricao="O cadastro da loja com posição no mapa, fotos, horários e escolha do plano. Até lá, a ativação é feita manualmente pela nossa equipe."
    etapa="M6"
    voltarPara="/para-comerciantes"
    voltarLabel="Como funciona para o lojista"
  />
);

export default Cadastro;
