"use client";

import { BackspaceIcon } from "@heroicons/react/24/outline";
import { centavosParaVisor } from "~~/utils/dinheiro";

/**
 * O teclado do balcão.
 *
 * Os dígitos entram pela direita, como numa maquininha de cartão: o atendente
 * digita 1-2-5-0 e lê R$ 12,50, sem precisar acertar a vírgula. Teclas de 64px
 * e sem estados sutis — isto é operado com o polegar, rápido, às vezes com a
 * outra mão segurando o café do cliente.
 */
export const TecladoDeValor = ({
  centavos,
  aoMudar,
  desabilitado,
}: {
  centavos: number;
  aoMudar: (centavos: number) => void;
  desabilitado?: boolean;
}) => {
  const digitar = (d: string) => {
    const proximo = centavos * 10 + Number(d);
    if (proximo > 99_999_999) return;
    aoMudar(proximo);
  };

  const apagar = () => aoMudar(Math.floor(centavos / 10));

  return (
    <div className="w-full max-w-sm flex flex-col gap-4">
      <div className="rounded-2xl border-2 border-base-300 bg-base-100 px-5 py-6 text-center">
        <span className="text-xs font-bold uppercase tracking-wider opacity-60">Valor da compra</span>
        <div className="mt-1 flex items-baseline justify-center gap-1.5">
          <span className="text-2xl font-bold opacity-50">R$</span>
          <span
            className={`font-mono text-5xl font-black tabular-nums ${centavos === 0 ? "opacity-30" : "text-secondary"}`}
          >
            {centavosParaVisor(centavos)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(d => (
          <button
            key={d}
            type="button"
            disabled={desabilitado}
            onClick={() => digitar(d)}
            className="h-16 rounded-2xl border border-base-300 bg-base-100 text-2xl font-black text-secondary shadow-xs transition active:scale-95 disabled:opacity-40"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          disabled={desabilitado}
          onClick={() => aoMudar(0)}
          className="h-16 rounded-2xl border border-base-300 bg-base-200 text-sm font-bold uppercase tracking-wide text-secondary transition active:scale-95 disabled:opacity-40"
        >
          Limpar
        </button>
        <button
          type="button"
          disabled={desabilitado}
          onClick={() => digitar("0")}
          className="h-16 rounded-2xl border border-base-300 bg-base-100 text-2xl font-black text-secondary shadow-xs transition active:scale-95 disabled:opacity-40"
        >
          0
        </button>
        <button
          type="button"
          disabled={desabilitado}
          onClick={apagar}
          aria-label="Apagar último dígito"
          className="h-16 rounded-2xl border border-base-300 bg-base-200 text-secondary transition active:scale-95 disabled:opacity-40 flex items-center justify-center"
        >
          <BackspaceIcon className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
};
