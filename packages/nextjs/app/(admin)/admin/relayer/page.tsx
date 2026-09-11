import type { NextPage } from "next";
import { SaudeDoRelayer } from "~~/components/admin/SaudeDoRelayer";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Relayer",
  description: "A saúde da conta que paga o gás de todo carimbo emitido no balcão.",
});

const Relayer: NextPage = () => <SaudeDoRelayer />;

export default Relayer;
