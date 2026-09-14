"use client";

import { useCallback, useEffect, useState } from "react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type Venda = {
  ref: string;
  quando: string;
  carimbos: number | null;
  status: string;
  erro: string | null;
  cliente: string;
  terminal: string | null;
};

type Auditoria = {
  loja: { nome: string };
  periodoEmDias: number;
  resumo: {
    vendas: number;
    carimbos: number;
    pontos: number;
    clientes: number;
    falhas: number;
    travadas: number;
  };
  porTerminal: { nome: string; vendas: number; carimbos: number }[];
  vendas: Venda[];
};

const PERIODOS = [
  { dias: 1, rotulo: "Hoje" },
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

const curta = (endereco: string) => `${endereco.slice(0, 6)}…${endereco.slice(-4)}`;

/**
 * A auditoria dos carimbos.
 *
 * Um programa de fidelidade sem auditoria é um convite: o atendente carimba o
 * próprio celular no fim do turno e ninguém nota. Aqui cada carimbo diz de qual
 * terminal saiu, para qual cliente e em que venda — e o lojista lê a fita
 * inteira do período sem precisar pedir nada a ninguém.
 */
export const AuditoriaDaLoja = () => {
  const [dias, setDias] = useState(30);
  const [dados, setDados] = useState<Auditoria>();
  const [erro, setErro] = useState<string>();

  const carregar = useCallback(async () => {
    setDados(undefined);
    const r = await fetch(`/api/merchant/auditoria?dias=${dias}`);
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar a auditoria");
      return;
    }
    setErro(undefined);
    setDados(await r.json());
  }, [dias]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Auditoria dos carimbos</h1>
        <p className="m-0 mt-1 text-sm opacity-75">Cada carimbo emitido, de qual terminal saiu e para qual cliente.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {PERIODOS.map(p => (
          <button
            key={p.dias}
            type="button"
            onClick={() => setDias(p.dias)}
            className={`btn btn-sm h-12 rounded-xl px-4 font-bold ${dias === p.dias ? "btn-primary" : "btn-ghost"}`}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      {!dados ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-brand-ink" />
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Numero rotulo="Carimbos" valor={dados.resumo.carimbos} destaque />
            <Numero rotulo="Vendas" valor={dados.resumo.vendas} />
            <Numero rotulo="Clientes" valor={dados.resumo.clientes} />
          </section>

          {(dados.resumo.falhas > 0 || dados.resumo.travadas > 0) && (
            <p className="m-0 inline-flex items-start gap-2 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-honey-ink" />
              <span>
                {dados.resumo.falhas > 0 && `${dados.resumo.falhas} venda(s) não geraram carimbo. `}
                {dados.resumo.travadas > 0 &&
                  `${dados.resumo.travadas} venda(s) ficaram travadas no envio — o cliente pode ter saído sem o carimbo.`}
              </span>
            </p>
          )}

          {dados.porTerminal.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="m-0 font-serif text-lg font-black text-secondary">Por terminal</h2>
              {dados.porTerminal.map(t => (
                <div
                  key={t.nome}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
                >
                  <strong className="min-w-0 truncate text-base text-secondary">{t.nome}</strong>
                  <span className="shrink-0 text-right text-sm">
                    <span className="font-mono text-xl font-black text-secondary">{t.carimbos}</span>
                    <span className="opacity-70"> carimbos</span>
                  </span>
                </div>
              ))}
            </section>
          )}

          <section className="flex flex-col gap-2">
            <h2 className="m-0 font-serif text-lg font-black text-secondary">Últimas vendas</h2>
            {dados.vendas.length === 0 ? (
              <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
                Nenhuma venda registrada neste período.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-base-300">
                <table className="table table-sm m-0 bg-base-100">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide">
                      <th>Quando</th>
                      <th>Carimbos</th>
                      <th>Terminal</th>
                      <th>Cliente</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.vendas.map(v => (
                      <tr key={v.ref}>
                        <td className="whitespace-nowrap text-xs opacity-75">
                          {new Date(v.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="font-mono font-black text-secondary">{v.carimbos ?? "—"}</td>
                        <td className="text-xs">{v.terminal ?? "—"}</td>
                        <td className="font-mono text-xs opacity-75">{curta(v.cliente)}</td>
                        <td className="text-xs">
                          {v.erro ? <span className="font-bold text-error">{v.erro}</span> : v.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const Numero = ({
  rotulo,
  valor,
  texto,
  destaque,
}: {
  rotulo: string;
  valor?: number;
  texto?: string;
  destaque?: boolean;
}) => (
  <div className={`rounded-2xl border p-4 ${destaque ? "border-primary bg-primary/5" : "border-base-300 bg-base-100"}`}>
    <span className="block text-xs font-bold uppercase tracking-wide opacity-70">{rotulo}</span>
    <span className="mt-1 block font-mono text-3xl font-black leading-none text-secondary">{texto ?? valor}</span>
  </div>
);
