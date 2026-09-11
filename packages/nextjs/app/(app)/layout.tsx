import type { Metadata, Viewport } from "next";
import { FlavorTheme } from "~~/components/FlavorTheme";
import { TabBar } from "~~/components/app/TabBar";

/**
 * Cada flavor instala um aplicativo diferente: o cliente leva o mapa, o
 * atendente leva o balcao, o lojista leva o painel. Tres manifestos, um
 * codigo -- o `app/manifest.ts` do Next so permitiria um.
 */
export const metadata: Metadata = { manifest: "/manifest/cliente" };

export const viewport: Viewport = { themeColor: "#c2410c", viewportFit: "cover" };

/**
 * Flavor cliente: o PWA. Mobile-first, navegação por barra inferior ao alcance
 * do polegar — sem cabeçalho de desktop, que só rouba altura no celular.
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="cliente" className="flex flex-col min-h-[100dvh] bg-base-200">
    {/* O flavor do cliente e desenhado para o polegar. Num monitor, a coluna
        estreita continua sendo a leitura certa -- esticar cartela ate 1500px
        so afasta o numero do nome da loja. */}
    <main className="flex w-full max-w-2xl flex-1 flex-col self-center pb-2">{children}</main>
    <TabBar />
  </FlavorTheme>
);

export default AppLayout;
