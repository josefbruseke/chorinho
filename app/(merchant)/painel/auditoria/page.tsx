import type { NextPage } from "next";
import { AuditoriaDaLoja } from "~~/components/merchant/AuditoriaDaLoja";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Auditoria",
  description: "Cada carimbo emitido na sua loja, com origem e registro na rede.",
});

const Auditoria: NextPage = () => <AuditoriaDaLoja />;

export default Auditoria;
