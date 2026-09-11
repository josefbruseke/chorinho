import Link from "next/link";
import { FlavorTheme } from "~~/components/FlavorTheme";
import { Footer } from "~~/components/Footer";
import { Header } from "~~/components/Header";
import { emDesenvolvimento } from "~~/utils/desenvolvimento";

/**
 * Ferramentas do Scaffold-ETH — depurador de contratos e explorador de blocos.
 *
 * Fora de desenvolvimento elas viram um beco sem saída explicado. Não é um 404
 * de propósito: o service worker precacheia todas as páginas do build, e uma
 * única entrada respondendo 404 faz a instalação INTEIRA falhar — o aplicativo
 * ficaria sem modo offline por causa de uma tela de depuração que ninguém usa.
 *
 * Publicadas do jeito que vinham, essas telas tentavam falar com o anvil da
 * máquina de quem programou e entregavam ao visitante um "você esqueceu de
 * rodar bun chain?" que não significa nada para ele.
 */
const DevLayout = ({ children }: { children: React.ReactNode }) => (
  <FlavorTheme flavor="cliente" className="flex flex-col min-h-[100dvh] bg-base-200">
    <Header />
    <main className="relative flex flex-col flex-1">
      {emDesenvolvimento() ? (
        children
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-20 text-center">
          <h1 className="m-0 font-serif text-2xl font-black text-secondary">Esta tela é de desenvolvimento</h1>
          <p className="m-0 max-w-sm text-sm opacity-75">
            O depurador de contratos e o explorador de blocos só funcionam com a blockchain local rodando na máquina de
            quem desenvolve.
          </p>
          <Link href="/" className="btn btn-primary h-14 rounded-2xl px-8 font-black">
            Voltar ao início
          </Link>
        </div>
      )}
    </main>
    <Footer />
  </FlavorTheme>
);

export default DevLayout;
