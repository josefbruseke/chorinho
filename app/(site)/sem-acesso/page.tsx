import Link from "next/link";
import type { NextPage } from "next";
import { LockClosedIcon } from "@heroicons/react/24/outline";
import { Text } from "~~/components/design-system";
import { getMetadata } from "~~/utils/metadata";
import { INICIO_DO_APP } from "~~/utils/rotas";

export const metadata = getMetadata({
  title: "Sem acesso",
  description: "Esta área é do balcão: só quem está na equipe de um comércio parceiro abre.",
});

const SemAcesso: NextPage = () => (
  <div className="flex flex-col items-center justify-center grow px-5 py-20 text-center gap-4">
    <span className="w-14 h-14 rounded-2xl bg-base-300/60 text-base-content/50 flex items-center justify-center">
      <LockClosedIcon className="w-7 h-7" />
    </span>
    <h1 className="text-2xl font-serif font-black m-0 text-secondary">Esta área não é sua</h1>
    <Text size="sm" tone="muted" className="max-w-sm leading-relaxed">
      Sua conta entrou, mas não tem o papel que esta tela pede. Se você atende no balcão de um comércio parceiro, peça a
      quem administra a loja para incluir você na equipe.
    </Text>
    {/* Quem cai aqui sem loja cadastrada não é intruso: é dono de comércio que
        ainda não passou pelo cadastro. A terceira porta é para ele. */}
    <Text size="sm" tone="muted" className="max-w-sm leading-relaxed">
      Se o comércio é seu e ainda não está no Chorinho, o caminho começa em Para comerciantes.
    </Text>
    <div className="flex flex-col sm:flex-row gap-2 mt-2">
      <Link href={INICIO_DO_APP} className="btn btn-primary min-h-14 rounded-2xl font-black">
        Ver os lugares do bairro
      </Link>
      <Link href="/para-comerciantes" className="btn btn-ghost min-h-14 rounded-2xl font-bold">
        Tenho um comércio
      </Link>
      <Link href="/ajuda" className="btn btn-ghost min-h-14 rounded-2xl font-bold">
        Preciso de ajuda
      </Link>
    </div>
  </div>
);

export default SemAcesso;
