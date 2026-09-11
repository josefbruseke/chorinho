import type { Metadata, Viewport } from "next";
import { FlavorTheme } from "~~/components/FlavorTheme";
import { PainelNav } from "~~/components/merchant/PainelNav";

/**
 * Cada flavor instala um aplicativo diferente: o cliente leva o mapa, o
 * atendente leva o balcao, o lojista leva o painel. Tres manifestos, um
 * codigo -- o `app/manifest.ts` do Next so permitiria um.
 */
export const metadata: Metadata = { manifest: "/manifest/lojista" };

export const viewport: Viewport = { themeColor: "#261c14", viewportFit: "cover" };

/**
 * Flavor comerciante: back office. Tema `merchant-*`, mais denso e orientado a
 * dados que a experiência do cliente.
 */
const MerchantLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="merchant" className="flex flex-col min-h-screen bg-base-200">
    <PainelNav />
    <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6">{children}</main>
  </FlavorTheme>
);

export default MerchantLayout;
