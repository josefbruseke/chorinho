"use client";

import { useCallback, useEffect, useState } from "react";
import { HashDaTransacao } from "~~/components/HashDaTransacao";
import { formatarCentavos } from "~~/utils/dinheiro";

type Venda = {
  ref: string;
  loja: string;
  quando: string;
  centavos: number;
  carimbos: number | null;
  status: string;
  erro: string | null;
  tx: string | null;
  carteira: string;
};

type Auditoria = {
  periodoEmDias: number;
  statusFiltro: string;
  resumo: { vendas: number; carimbos: number; centavos: number; falhas: number };
  vendas: Venda[];
};

const PERIODOS = [
  { dias: 1, rotulo: "Hoje" },
  { dias: 7, rotulo: "7 dias" },
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "90 dias" },
];

const STATUS = [
  { valor: "", rotulo: "Todas" },
  { valor: "na_fila", rotulo: "Na fila" },
  { valor: "enviada", rotulo: "Enviada" },
  { valor: "confirmada", rotulo: "Confirmada" },
  { valor: "falhou", rotulo: "Falhou" },
];

/**
 * A auditoria da plataforma inteira: as últimas 200 vendas de todas as lojas,
 * com a mesma lógica da auditoria do lojista, sem o filtro de estabelecimento.
 */
export const AuditoriaDaPlataforma = () => {
  const [dias, setDias] = useState(30);
  const [status, setStatus] = useState("");
  const [dados, setDados] = useState<Auditoria>();
  const [erro, setErro] = useState<string>();

  const carregar = useCallback(async () => {
    setDados(undefined);
    const parametros = new URLSearchParams({ dias: String(dias) });
    if (status) parametros.set("status", status);
    const r = await fetch(`/api/admin/auditoria?${parametros.toString()}`);
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar a auditoria");
      return;
    }
    setErro(undefined);
    setDados(await r.json());
  }, [dias, status]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (erro) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Auditoria da plataforma</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          As últimas 200 vendas de todas as lojas, com o hash da transação que registrou cada carimbo na rede.
        </p>
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

      <div className="flex flex-wrap gap-2">
        {STATUS.map(s => (
          <button
            key={s.valor}
            type="button"
            onClick={() => setStatus(s.valor)}
            className={`btn btn-sm h-12 rounded-xl px-4 font-bold ${status === s.valor ? "btn-secondary" : "btn-ghost"}`}
          >
            {s.rotulo}
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
            <Numero rotulo="Vendas" valor={dados.resumo.vendas} />
            <Numero rotulo="Carimbos" valor={dados.resumo.carimbos} />
            <Numero rotulo="Faturado" texto={formatarCentavos(dados.resumo.centavos)} />
            <Numero rotulo="Falhas" valor={dados.resumo.falhas} />
          </section>

          <section className="flex flex-col gap-2">
            {dados.vendas.length === 0 ? (
              <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
                Nenhuma venda encontrada neste período.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-base-300">
                <table className="table table-sm m-0 bg-base-100">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide">
                      <th>Quando</th>
                      <th>Loja</th>
                      <th>Valor</th>
                      <th>Carimbos</th>
                      <th>Status</th>
                      <th>Registro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.vendas.map(v => (
                      <tr key={v.ref}>
                        <td className="whitespace-nowrap text-xs opacity-75">
                          {new Date(v.quando).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="max-w-40 truncate text-xs font-bold">{v.loja}</td>
                        <td className="whitespace-nowrap font-mono font-bold">{formatarCentavos(v.centavos)}</td>
                        <td className="font-mono font-black text-secondary">{v.carimbos ?? "—"}</td>
                        <td className="text-xs">
                          <span className={v.status === "falhou" ? "font-bold text-error" : "opacity-75"}>
                            {v.status}
                          </span>
                        </td>
                        <td className="text-xs">
                          {v.tx ? (
                            <HashDaTransacao hash={v.tx} />
                          ) : (
                            <span className="font-bold text-error">{v.erro ?? "sem registro"}</span>
                          )}
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

const Numero = ({ rotulo, valor, texto }: { rotulo: string; valor?: number; texto?: string }) => (
  <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
    <span className="block text-xs font-bold uppercase tracking-wide opacity-70">{rotulo}</span>
    <span className="mt-1 block font-mono text-3xl font-black leading-none text-secondary">{texto ?? valor}</span>
  </div>
);
