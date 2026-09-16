import type { NextPage } from "next";
import { AuditoriaDaLoja } from "~~/components/merchant/AuditoriaDaLoja";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Auditoria",
  description: "Cada carimbo emitido na sua loja, e de qual terminal saiu.",
});

const Auditoria: NextPage = () => <AuditoriaDaLoja />;

export default Auditoria;
