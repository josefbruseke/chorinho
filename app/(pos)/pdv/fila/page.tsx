import type { NextPage } from "next";
import { FilaPdv } from "~~/components/pdv/FilaPdv";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Fila do balcão",
  description: "Vendas registradas sem internet, esperando para subir.",
});

const Fila: NextPage = () => <FilaPdv />;

export default Fila;
