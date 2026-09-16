import type { NextPage } from "next";
import { EstabelecimentosDaPlataforma } from "~~/components/admin/EstabelecimentosDaPlataforma";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Estabelecimentos",
  description: "Aprovar lojas e liberar assinatura.",
});

const Estabelecimentos: NextPage = () => <EstabelecimentosDaPlataforma />;

export default Estabelecimentos;
