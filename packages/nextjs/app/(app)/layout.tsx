import { FlavorTheme } from "~~/components/FlavorTheme";
import { TabBar } from "~~/components/app/TabBar";

/**
 * Flavor cliente: o PWA. Mobile-first, navegação por barra inferior ao alcance
 * do polegar — sem cabeçalho de desktop, que só rouba altura no celular.
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="cliente" className="flex flex-col min-h-screen bg-base-200">
    <main className="flex flex-col flex-1 pb-2">{children}</main>
    <TabBar />
  </FlavorTheme>
);

export default AppLayout;
