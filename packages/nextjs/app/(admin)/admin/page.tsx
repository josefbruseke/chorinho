import type { NextPage } from "next";
import { EmConstrucao } from "~~/components/EmConstrucao";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Plataforma",
  description: "Administração do Chorinho.",
});

const Admin: NextPage = () => (
  <EmConstrucao
    titulo="Administração da plataforma"
    descricao="Aprovar estabelecimentos, conceder papéis on-chain, configurar tipos de ponto, acompanhar a saúde do relayer e auditar divergências."
    etapa="M7"
  />
);

export default Admin;
