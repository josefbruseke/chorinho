import Link from "next/link";
import type { NextPage } from "next";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Sem acesso",
  description: "Esta área é restrita.",
});

const SemAcesso: NextPage = () => (
  <div className="flex flex-col items-center justify-center grow px-5 py-20 text-center gap-4">
    <span className="w-14 h-14 rounded-2xl bg-base-300/60 text-base-content/50 flex items-center justify-center">
      <LockClosedIcon className="w-7 h-7" />
    </span>
    <h1 className="text-2xl font-serif font-black m-0 text-secondary">Esta área não é sua</h1>
    <p className="m-0 text-sm opacity-75 max-w-sm leading-relaxed">
      Você está logado, mas sua conta não tem o papel necessário para abrir esta tela. Se você é dono ou atendente de um
      comércio parceiro, peça a quem administra a loja para incluir você na equipe.
    </p>
    <div className="flex flex-col sm:flex-row gap-2 mt-2">
      <Link href="/mapa" className="btn btn-primary rounded-2xl font-bold">
        Ir para o mapa
      </Link>
      <Link href="/ajuda" className="btn btn-ghost rounded-2xl font-bold">
        Preciso de ajuda
      </Link>
    </div>
  </div>
);

export default SemAcesso;
