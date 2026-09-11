import { FlavorTheme } from "~~/components/FlavorTheme";
import { PainelNav } from "~~/components/merchant/PainelNav";

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
