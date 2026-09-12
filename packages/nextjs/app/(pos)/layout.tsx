import type { Metadata, Viewport } from "next";
import { FlavorTheme } from "~~/components/FlavorTheme";

/**
 * Cada flavor instala um aplicativo diferente: o cliente leva o mapa, o
 * atendente leva o balcao, o lojista leva o painel. Tres manifestos, um
 * codigo -- o `app/manifest.ts` do Next so permitiria um.
 */
export const metadata: Metadata = { manifest: "/manifest/pdv" };

export const viewport: Viewport = { themeColor: "#1c2010", viewportFit: "cover" };

/**
 * Flavor PDV: terminal de balcão. Sem cabeçalho e sem rodapé — a tela inteira
 * é a operação. O tema `pos-*` tem mais contraste e raio menor porque o
 * aparelho fica sob luz do dia e é operado com uma mão só, rápido.
 */
const PosLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="pos" className="flex flex-col min-h-[100dvh] bg-base-200">
    <main className="flex flex-col flex-1">{children}</main>
  </FlavorTheme>
);

export default PosLayout;
