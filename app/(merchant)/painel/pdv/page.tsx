import type { NextPage } from "next";
import { TerminaisDePdv } from "~~/components/merchant/TerminaisDePdv";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Terminais do balcão",
  description: "Os aparelhos que carimbam na sua loja.",
});

const Terminais: NextPage = () => <TerminaisDePdv />;

export default Terminais;
