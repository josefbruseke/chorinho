"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowPathIcon, CheckCircleIcon, LinkIcon } from "@heroicons/react/24/outline";

type Assinatura = { ativa: boolean; plano: number; venceEm: number };

type Loja = {
  id: string;
  slug: string;
  nome: string;
  lugar: string | null;
  status: string;
  onchainId: number | null;
  limiteDePdv: number;
  criadaEm: string;
  temDono: boolean;
  assinatura: Assinatura | null;
};

const STATUS = [
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "ativo", rotulo: "Ativa" },
  { valor: "suspenso", rotulo: "Suspensa" },
  { valor: "rascunho", rotulo: "Rascunho" },
];

const UM_ANO = 365 * 24 * 60 * 60;

/**
 * A fila de lojas da plataforma.
 *
 * Aprovar uma loja aqui é o que destrava o balcão dela — e registrar na cadeia
 * custa gás e é irreversível. Por isso as duas ações são separadas e
 * explícitas: aprovar no banco é barato e reversível; registrar na rede, não.
 */
export const EstabelecimentosDaPlataforma = () => {
  const [lojas, setLojas] = useState<Loja[]>();
  const [erro, setErro] = useState<string>();
  const [ocupada, setOcupada] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/admin/estabelecimentos");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar");
      return;
    }
    setErro(undefined);
    setLojas((await r.json()).lojas);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alterar = async (loja: Loja, mudanca: Record<string, unknown>) => {
    setOcupada(loja.id);
    try {
      const r = await fetch(`/api/admin/estabelecimentos/${loja.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mudanca),
      });
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        setErro(corpo?.erro ?? "não foi possível gravar");
        return;
      }
      setErro(undefined);
      await carregar();
    } finally {
      setOcupada(undefined);
    }
  };

  if (erro && !lojas) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }

  if (!lojas) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  const pendentes = lojas.filter(l => l.status === "pendente").length;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Estabelecimentos</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          {lojas.length} cadastrados
          {pendentes > 0 ? ` · ${pendentes} esperando aprovação` : ""}
        </p>
      </header>

      {erro && <p className="m-0 rounded-2xl border border-error bg-error/10 p-4 text-sm font-semibold">{erro}</p>}

      <div className="flex flex-col gap-3">
        {lojas.map(loja => (
          <article key={loja.id} className="rounded-2xl border border-base-300 bg-base-100 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="m-0 text-lg font-bold leading-tight text-secondary">{loja.nome}</h2>
                <span className="text-xs opacity-70">
                  {loja.lugar ?? "sem bairro"} · {loja.slug}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {loja.onchainId !== null ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-3 py-1.5 text-xs font-bold text-success">
                    <LinkIcon className="h-3.5 w-3.5" />
                    rede #{loja.onchainId}
                  </span>
                ) : (
                  <span className="rounded-full bg-base-200 px-3 py-1.5 text-xs font-bold opacity-75">
                    fora da rede
                  </span>
                )}

                {loja.assinatura && (
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      loja.assinatura.ativa ? "bg-success/15 text-success" : "bg-warning/20 text-warning-content"
                    }`}
                  >
                    {loja.assinatura.ativa
                      ? `plano ${loja.assinatura.plano} até ${new Date(loja.assinatura.venceEm * 1000).toLocaleDateString("pt-BR")}`
                      : "assinatura vencida"}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-70">
                Status
                <select
                  value={loja.status}
                  disabled={ocupada === loja.id}
                  onChange={e => void alterar(loja, { status: e.target.value })}
                  className="select select-bordered select-sm h-12 text-sm font-semibold normal-case"
                >
                  {STATUS.map(s => (
                    <option key={s.valor} value={s.valor}>
                      {s.rotulo}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide opacity-70">
                Terminais
                <input
                  type="number"
                  min={1}
                  max={200}
                  defaultValue={loja.limiteDePdv}
                  disabled={ocupada === loja.id}
                  onBlur={e => {
                    const valor = Number(e.target.value);
                    if (valor !== loja.limiteDePdv) void alterar(loja, { limiteDePdv: valor });
                  }}
                  className="input input-bordered h-12 w-20 font-mono text-base font-bold"
                />
              </label>

              {loja.onchainId === null ? (
                <button
                  type="button"
                  disabled={ocupada === loja.id}
                  onClick={() => void alterar(loja, { registrarNaRede: true })}
                  className="btn btn-primary min-h-12 gap-1.5 rounded-2xl font-bold"
                >
                  {ocupada === loja.id ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <LinkIcon className="h-5 w-5" />
                  )}
                  Registrar na rede
                </button>
              ) : (
                <button
                  type="button"
                  disabled={ocupada === loja.id}
                  onClick={() =>
                    void alterar(loja, { assinaturaAteEm: Math.floor(Date.now() / 1000) + UM_ANO, plano: 2 })
                  }
                  className="btn btn-ghost min-h-12 gap-1.5 rounded-2xl font-bold"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  Liberar 1 ano
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
