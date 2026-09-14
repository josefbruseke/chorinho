import type { Metadata, Viewport } from "next";
import { FlavorTheme } from "~~/components/FlavorTheme";
import { Header } from "~~/components/Header";
import { TabBar } from "~~/components/app/TabBar";
import { INICIO_DO_APP } from "~~/utils/rotas";

/**
 * Cada flavor instala um aplicativo diferente: o cliente leva o mapa, o
 * atendente leva o balcao, o lojista leva o painel. Tres manifestos, um
 * codigo -- o `app/manifest.ts` do Next so permitiria um.
 */
export const metadata: Metadata = { manifest: "/manifest/cliente" };

export const viewport: Viewport = { themeColor: "#76c112", viewportFit: "cover" };

/**
 * Flavor cliente: o PWA. Mobile-first, navegação por barra inferior ao alcance
 * do polegar.
 *
 * O cabeçalho é o mesmo do site, mas sem link nenhum: a navegação daqui mora
 * na TabBar de baixo, e repeti-la no topo só gastaria a altura que o celular
 * não tem. Ele entra pela marca — quem abre o app direto pelo ícone da tela
 * inicial não via "Chorinho" em lugar algum — e pelo menu da conta, que antes
 * só existia no site.
 */
const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="cliente" className="flex flex-col min-h-[100dvh] bg-base-200">
    <Header links={[]} homeHref={INICIO_DO_APP} />
    {/* O flavor do cliente e desenhado para o polegar. Num monitor, a coluna
        estreita continua sendo a leitura certa -- esticar cartela ate 1500px
        so afasta o numero do nome da loja. */}
    <main className="flex w-full max-w-2xl flex-1 flex-col self-center pb-2">{children}</main>
    <TabBar />
  </FlavorTheme>
);

export default AppLayout;
