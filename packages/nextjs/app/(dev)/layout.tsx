import { FlavorTheme } from "~~/components/FlavorTheme";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";

/** Ferramentas do Scaffold-ETH. Fora da navegação de produção. */
const DevLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="cliente" className="flex flex-col min-h-screen bg-base-200">
    <Header />
    <main className="relative flex flex-col flex-1">{children}</main>
    <Footer />
  </FlavorTheme>
);

export default DevLayout;
