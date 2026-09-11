import { notFound } from "next/navigation";
import { FlavorTheme } from "~~/components/FlavorTheme";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { emDesenvolvimento } from "~~/utils/desenvolvimento";

/**
 * Ferramentas do Scaffold-ETH — depurador de contratos e explorador de blocos.
 *
 * Existem só em desenvolvimento. Numa aplicação publicada elas tentam falar com
 * o anvil da máquina de quem programou (`127.0.0.1:8545`) e entregam ao
 * visitante uma tela dizendo "você esqueceu de rodar bun chain?", que não
 * significa nada para ele. Aqui o grupo inteiro vira 404 fora de
 * desenvolvimento — é a resposta honesta: essas rotas não existem em produção.
 */
const DevLayout = ({ children }: { children: React.ReactNode }) => {
  if (!emDesenvolvimento()) notFound();

  return (
    <FlavorTheme flavor="cliente" className="flex flex-col min-h-screen bg-base-200">
      <Header />
      <main className="relative flex flex-col flex-1">{children}</main>
      <Footer />
    </FlavorTheme>
  );
};

export default DevLayout;
