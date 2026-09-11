import Link from "next/link";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

/**
 * Marcador honesto para rota que já existe na navegação mas ainda não tem
 * conteúdo. Diz o que vai ter e em qual etapa — melhor do que uma tela vazia
 * ou, pior, dados de exemplo que parecem reais.
 */
export const EmConstrucao = ({
  titulo,
  descricao,
  etapa,
  voltarPara,
  voltarLabel,
}: {
  titulo: string;
  descricao: string;
  etapa: string;
  voltarPara?: string;
  voltarLabel?: string;
}) => (
  <div className="w-full max-w-md mx-auto px-5 py-16 flex flex-col items-center text-center gap-4">
    <span className="w-14 h-14 rounded-2xl bg-base-300/60 text-base-content/50 flex items-center justify-center">
      <WrenchScrewdriverIcon className="w-7 h-7" />
    </span>

    <h1 className="text-2xl font-serif font-black m-0 text-secondary">{titulo}</h1>
    <p className="m-0 text-sm text-base-content/75 leading-relaxed text-balance">{descricao}</p>

    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-base-300/60 text-base-content/70">
      Chega em {etapa}
    </span>

    {voltarPara && (
      <Link href={voltarPara} className="btn btn-ghost min-h-12 rounded-2xl mt-2">
        {voltarLabel ?? "Voltar"}
      </Link>
    )}
  </div>
);
