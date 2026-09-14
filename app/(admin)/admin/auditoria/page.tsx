import type { NextPage } from "next";
import { AuditoriaDaPlataforma } from "~~/components/admin/AuditoriaDaPlataforma";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Auditoria",
  description: "As últimas vendas de todas as lojas da plataforma, com o registro de cada uma na rede.",
});

const Auditoria: NextPage = () => <AuditoriaDaPlataforma />;

export default Auditoria;
