import { FlavorTheme } from "~~/components/FlavorTheme";

/**
 * Flavor PDV: terminal de balcão. Sem cabeçalho e sem rodapé — a tela inteira
 * é a operação. O tema `pos-*` tem mais contraste e raio menor porque o
 * aparelho fica sob luz do dia e é operado com uma mão só, rápido.
 */
const PosLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="pos" className="flex flex-col min-h-screen bg-base-200">
    <main className="flex flex-col flex-1">{children}</main>
  </FlavorTheme>
);

export default PosLayout;
