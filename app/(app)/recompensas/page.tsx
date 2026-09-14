import type { NextPage } from "next";
import { CatalogoRecompensas } from "~~/components/carteira/CatalogoRecompensas";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Prêmios",
  description: "Tudo o que seus carimbos e pontos trocam nos comércios do bairro.",
});

const Recompensas: NextPage = () => <CatalogoRecompensas />;

export default Recompensas;
