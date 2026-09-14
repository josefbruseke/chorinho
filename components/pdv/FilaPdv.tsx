"use client";

import Link from "next/link";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { useFilaOffline } from "~~/hooks/pdv/useFilaOffline";

/**
 * O que ainda não subiu.
 *
 * Existe para o atendente não precisar acreditar em nós: ele vê a lista, o
 * valor de cada venda e há quanto tempo está esperando. Sem esta tela, "salvo
 * na fila" é só uma promessa.
 */
export const FilaPdv = () => {
  const { fila, online, sincronizando, sincronizar } = useFilaOffline();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-2.5">
        <Link href="/pdv" className="btn btn-ghost btn-sm gap-1 rounded-xl font-bold">
          <ArrowLeftIcon className="h-4 w-4" />
          Balcão
        </Link>
        <h1 className="m-0 flex-1 text-sm font-bold text-secondary">Fila de envio</h1>
        <button
          type="button"
          onClick={() => void sincronizar()}
          disabled={!online || sincronizando || fila.length === 0}
          className="btn btn-primary btn-sm gap-1 rounded-xl font-bold disabled:opacity-40"
        >
          <ArrowPathIcon className={`h-4 w-4 ${sincronizando ? "animate-spin" : ""}`} />
          Enviar
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-3 px-4 py-5">
        {!online && (
          <div className="rounded-2xl border border-warning bg-warning/10 p-3 text-center text-sm font-semibold">
            Sem internet. Nada se perde: a fila sobe sozinha quando a conexão voltar.
          </div>
        )}

        {fila.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <CheckCircleIcon className="h-16 w-16 text-success" />
            <p className="m-0 text-lg font-bold text-secondary">Nada pendente</p>
            <p className="m-0 max-w-xs text-sm opacity-70">Todas as vendas deste aparelho já foram creditadas.</p>
          </div>
        ) : (
          fila.map(v => (
            <article key={v.saleRef} className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-base font-black text-secondary">Carimbo pendente</span>
                <span className="inline-flex items-center gap-1 text-xs opacity-65">
                  <ClockIcon className="h-3.5 w-3.5" />
                  {new Date(v.criadaEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>

              {v.cliente && <p className="m-0 mt-1 font-mono text-xs opacity-55">cliente {v.cliente.slice(0, 8)}</p>}

              {v.ultimoErro && (
                <p className="m-0 mt-2 inline-flex items-start gap-1.5 text-xs font-semibold text-error">
                  <ExclamationCircleIcon className="mt-px h-4 w-4 shrink-0" />
                  {v.ultimoErro}
                  {v.tentativas > 1 && <span className="opacity-70">({v.tentativas} tentativas)</span>}
                </p>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  );
};
