"use client";

import { useCallback, useEffect, useState } from "react";

type Loja = {
  id: string;
  slug: string;
  nome: string;
  lugar: string | null;
  status: string;
  limiteDePdv: number;
  criadaEm: string;
  temDono: boolean;
};

const STATUS = [
  { valor: "pendente", rotulo: "Pendente" },
  { valor: "ativo", rotulo: "Ativa" },
  { valor: "suspenso", rotulo: "Suspensa" },
  { valor: "rascunho", rotulo: "Rascunho" },
];

/**
 * A fila de lojas da plataforma.
 *
 * Duas decisões, e as duas são reversíveis: o status, que destrava o balcão da
 * loja, e quantos terminais ela pode ter no caixa. Nenhuma das duas custa
 * dinheiro nem depende de pagamento — a cobrança ainda não existe, e por isso
 * não há aqui nada para renovar, liberar ou cortar por atraso.
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
        <p className="m-0 mt-1 text-xs opacity-60">
          Assinatura ainda não aparece nesta lista: a cobrança não entrou no ar, então nenhuma loja está pagando nem
          devendo. Aprovar é o que libera o balcão.
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
                {/* Loja sem dono é a que não tem quem entre no painel: aprovar
                    uma dessas destrava um balcão que ninguém vai abrir. */}
                {!loja.temDono && (
                  <span className="rounded-full bg-warning/20 px-3 py-1.5 text-xs font-bold text-honey-ink">
                    sem dono
                  </span>
                )}
                <span className="rounded-full bg-base-200 px-3 py-1.5 text-xs font-bold opacity-75">
                  cadastrada em {new Date(loja.criadaEm).toLocaleDateString("pt-BR")}
                </span>
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
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
