"use client";

import Link from "next/link";
import { ArrowPathIcon, GiftIcon, InboxStackIcon, SignalSlashIcon } from "@heroicons/react/24/outline";

/**
 * A faixa de cima do balcão: onde estou, se tem internet, quantas vendas ainda
 * não subiram. Sempre visível — um atendente não deve precisar navegar para
 * descobrir que está offline há vinte minutos.
 */
export const BarraPdv = ({
  loja,
  online,
  pendentes,
  sincronizando,
}: {
  loja?: string;
  online: boolean;
  pendentes: number;
  sincronizando?: boolean;
}) => (
  <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-base-300 bg-base-100 px-3 py-2.5">
    <div className="min-w-0 flex-1">
      <span className="block text-[10px] font-bold uppercase tracking-wider opacity-55">Balcão</span>
      <span className="block truncate text-sm font-bold text-secondary">{loja ?? "Carregando…"}</span>
    </div>

    {!online && (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2.5 py-1 text-xs font-bold text-warning-content">
        <SignalSlashIcon className="h-4 w-4" />
        Sem internet
      </span>
    )}

    <Link
      href="/pdv/fila"
      className="inline-flex items-center gap-1 rounded-full border border-base-300 px-2.5 py-1 text-xs font-bold text-secondary"
    >
      {sincronizando ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <InboxStackIcon className="h-4 w-4" />}
      {pendentes > 0 ? `${pendentes} na fila` : "Fila"}
    </Link>

    <Link
      href="/pdv/resgatar"
      aria-label="Entregar recompensa"
      className="inline-flex items-center rounded-full border border-base-300 p-1.5 text-secondary"
    >
      <GiftIcon className="h-5 w-5" />
    </Link>
  </header>
);
