import type { NextPage } from "next";
import { VisaoGeralDaPlataforma } from "~~/components/admin/VisaoGeralDaPlataforma";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Plataforma",
  description: "Visão geral da plataforma Chorinho: lojas, carimbos, vendas e o que precisa de atenção.",
});

const Admin: NextPage = () => <VisaoGeralDaPlataforma />;

export default Admin;
