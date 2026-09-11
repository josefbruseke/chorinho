"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckBadgeIcon, ChevronRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type Resumo = {
  lojas: { ativas: number; pendentes: number };
  carimbos: { d7: number; d30: number };
  vendas: number;
  clientesUnicos30d: number;
  terminaisPareados: number;
  recompensasAtivas: number;
  resgates: number;
  atencao: {
    lojasPendentes: { id: string; nome: string }[];
    lojasSemOnchainId: { id: string; nome: string }[];
    vendasFalhas24h: number;
  };
};

/**
 * A primeira tela da plataforma: números grandes para ver de relance se está
 * tudo funcionando, e uma lista curta do que precisa de uma decisão humana.
 */
export const VisaoGeralDaPlataforma = () => {
  const [dados, setDados] = useState<Resumo>();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/admin/resumo");
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        setErro(corpo?.erro ?? "não foi possível carregar o resumo da plataforma");
        return;
      }
      setDados(await r.json());
    })();
  }, []);

  if (erro) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }

  if (!dados) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const semAtencao =
    dados.atencao.lojasPendentes.length === 0 &&
    dados.atencao.lojasSemOnchainId.length === 0 &&
    dados.atencao.vendasFalhas24h === 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Visão geral da plataforma</h1>
        <p className="m-0 mt-1 text-sm opacity-75">O estado da rede inteira, de relance.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Numero rotulo="Lojas ativas" valor={dados.lojas.ativas} />
        <Numero rotulo="Lojas pendentes" valor={dados.lojas.pendentes} />
        <Numero rotulo="Carimbos (7 dias)" valor={dados.carimbos.d7} />
        <Numero rotulo="Carimbos (30 dias)" valor={dados.carimbos.d30} />
        <Numero rotulo="Vendas confirmadas" valor={dados.vendas} />
        <Numero rotulo="Clientes únicos (30 dias)" valor={dados.clientesUnicos30d} />
        <Numero rotulo="Terminais pareados" valor={dados.terminaisPareados} />
        <Numero rotulo="Recompensas ativas" valor={dados.recompensasAtivas} />
        <Numero rotulo="Resgates" valor={dados.resgates} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="m-0 font-serif text-lg font-black text-secondary">Precisa de atenção</h2>

        {semAtencao ? (
          <p className="m-0 inline-flex items-center gap-2 rounded-2xl border border-success bg-success/10 p-4 text-sm font-bold text-success">
            <CheckBadgeIcon className="h-5 w-5 shrink-0" />
            Nada pendente no momento.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {dados.atencao.lojasPendentes.length > 0 && (
              <ItemDeAtencao
                href="/admin/estabelecimentos"
                titulo={`${dados.atencao.lojasPendentes.length} loja(s) aguardando aprovação`}
                detalhe={dados.atencao.lojasPendentes.map(l => l.nome).join(", ")}
              />
            )}
            {dados.atencao.lojasSemOnchainId.length > 0 && (
              <ItemDeAtencao
                href="/admin/estabelecimentos"
                titulo={`${dados.atencao.lojasSemOnchainId.length} loja(s) ativa(s) sem registro na rede`}
                detalhe={dados.atencao.lojasSemOnchainId.map(l => l.nome).join(", ")}
              />
            )}
            {dados.atencao.vendasFalhas24h > 0 && (
              <ItemDeAtencao
                href="/admin/auditoria"
                titulo={`${dados.atencao.vendasFalhas24h} venda(s) falharam nas últimas 24 horas`}
                detalhe="Confira a origem de cada falha na auditoria."
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
};

const ItemDeAtencao = ({ href, titulo, detalhe }: { href: string; titulo: string; detalhe: string }) => (
  <Link
    href={href}
    className="flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-warning bg-warning/10 p-4 text-sm transition-colors hover:bg-warning/20"
  >
    <span className="flex min-w-0 items-start gap-2">
      <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
      <span className="min-w-0">
        <strong className="block font-bold text-secondary">{titulo}</strong>
        <span className="block truncate opacity-70">{detalhe}</span>
      </span>
    </span>
    <ChevronRightIcon className="h-5 w-5 shrink-0 opacity-50" />
  </Link>
);

const Numero = ({ rotulo, valor }: { rotulo: string; valor: number }) => (
  <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
    <span className="block text-xs font-bold uppercase tracking-wide opacity-70">{rotulo}</span>
    <span className="mt-1 block font-mono text-2xl font-black leading-none text-secondary">{valor}</span>
  </div>
);
