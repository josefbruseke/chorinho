import type { NextPage } from "next";
import { TiposDePonto } from "~~/components/admin/TiposDePonto";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Tipos de ponto",
  description: "O catálogo de tipos de ponto da rede Chorinho, do escopo da cidade até o de cada loja.",
});

const Pontos: NextPage = () => <TiposDePonto />;

export default Pontos;
