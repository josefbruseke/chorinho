import Link from "next/link";
import type { NextPage } from "next";
import { SignalSlashIcon } from "@heroicons/react/24/outline";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Sem conexão",
  description: "Esta tela precisa de internet.",
});

/** O que aparece quando a navegação falha e não há versão guardada da página. */
const SemConexao: NextPage = () => (
  <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-base-200 px-6 text-center">
    <SignalSlashIcon className="h-16 w-16 text-honey-ink" />
    <h1 className="m-0 font-serif text-2xl font-black text-secondary">Você está sem internet</h1>
    <p className="m-0 max-w-xs text-sm opacity-75">
      Esta tela precisa de conexão. O balcão continua funcionando: as vendas ficam guardadas no aparelho e sobem
      sozinhas quando a internet voltar.
    </p>
    <Link href="/pdv" className="btn btn-primary rounded-2xl font-bold">
      Abrir o balcão
    </Link>
  </div>
);

export default SemConexao;
