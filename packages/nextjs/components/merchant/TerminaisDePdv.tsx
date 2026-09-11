"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ClipboardDocumentIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
  SignalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type Terminal = {
  id: string;
  nome: string;
  aparelho: string | null;
  pareadoEm: string | null;
  vistoEm: string | null;
  aguardandoPareamento: boolean;
  expirado: boolean;
};

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

/**
 * Os aparelhos que carimbam nesta loja.
 *
 * O lojista cria um terminal, leva o código até o tablet e pronto: aquele
 * aparelho vira um caixa. Ninguém no balcão digita senha nunca mais — e se um
 * tablet sumir, desligar é um toque daqui.
 */
export const TerminaisDePdv = () => {
  const [dados, setDados] = useState<{ loja: { nome: string; limite: number }; terminais: Terminal[] }>();
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string>();
  const [novoCodigo, setNovoCodigo] = useState<{ nome: string; codigo: string }>();
  const [copiado, setCopiado] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/terminais");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar os terminais");
      return;
    }
    setErro(undefined);
    setDados(await r.json());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = async () => {
    setCriando(true);
    setErro(undefined);
    try {
      const r = await fetch("/api/merchant/terminais", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível criar o terminal");
        return;
      }
      setNovoCodigo({ nome: corpo.nome, codigo: corpo.codigo });
      setNome("");
      await carregar();
    } finally {
      setCriando(false);
    }
  };

  const remover = async (id: string, nomeDoTerminal: string) => {
    if (!window.confirm(`Desligar "${nomeDoTerminal}"? O aparelho para de carimbar imediatamente.`)) return;
    await fetch(`/api/merchant/terminais/${id}`, { method: "DELETE" });
    await carregar();
  };

  if (erro && !dados) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }

  if (!dados) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const ativos = dados.terminais.length;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Terminais do balcão</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          {ativos} de {dados.loja.limite} aparelhos ativos. Cada caixa, tablet ou celular que carimba é um terminal.
        </p>
      </header>

      {/* O código aparece uma vez só. Quem fechou a tela cria outro terminal —
          guardar código de pareamento para reexibir depois seria guardar uma
          chave de balcão em texto puro. */}
      {novoCodigo && (
        <section className="rounded-2xl border-2 border-primary bg-primary/5 p-5">
          <h2 className="m-0 text-sm font-bold uppercase tracking-wide opacity-70">Código de {novoCodigo.nome}</h2>
          <p className="m-0 mt-2 font-mono text-4xl font-black tracking-[0.2em] text-secondary">{novoCodigo.codigo}</p>
          <p className="m-0 mt-2 text-sm opacity-80">
            Abra <strong>chorinho.app/pdv</strong> no aparelho e digite este código. Ele vale 30 minutos e só funciona
            uma vez.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(novoCodigo.codigo);
                setCopiado(true);
              }}
              className="btn btn-primary btn-sm h-12 gap-1.5 rounded-xl font-bold"
            >
              <ClipboardDocumentIcon className="h-5 w-5" />
              {copiado ? "Copiado" : "Copiar código"}
            </button>
            <button
              type="button"
              onClick={() => {
                setNovoCodigo(undefined);
                setCopiado(false);
              }}
              className="btn btn-ghost btn-sm h-12 rounded-xl font-bold"
            >
              Já anotei
            </button>
          </div>
        </section>
      )}

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={e => {
          e.preventDefault();
          if (nome.trim().length >= 2) void criar();
        }}
      >
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          maxLength={40}
          placeholder="Nome do terminal (ex.: Caixa 1)"
          aria-label="Nome do terminal"
          className="input input-bordered h-14 flex-1 text-base"
        />
        <button
          type="submit"
          disabled={nome.trim().length < 2 || criando || ativos >= dados.loja.limite}
          className="btn btn-primary h-14 gap-1.5 rounded-2xl font-black disabled:opacity-40"
        >
          <PlusIcon className="h-5 w-5" />
          Novo terminal
        </button>
      </form>

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erro}</p>}

      {dados.terminais.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
          Nenhum aparelho ligado ainda. Crie o primeiro terminal e leve o código até o caixa.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dados.terminais.map(t => (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  t.pareadoEm ? "bg-success/15 text-success" : "bg-base-200 text-base-content/70"
                }`}
              >
                {t.pareadoEm ? <SignalIcon className="h-6 w-6" /> : <DevicePhoneMobileIcon className="h-6 w-6" />}
              </span>

              <div className="min-w-0 flex-1">
                <strong className="block truncate text-base text-secondary">{t.nome}</strong>
                <span className="block text-xs opacity-70">
                  {t.pareadoEm
                    ? `último uso ${quando(t.vistoEm)}`
                    : t.aguardandoPareamento
                      ? "esperando o código ser digitado no aparelho"
                      : "código expirou — crie outro terminal"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => void remover(t.id, t.nome)}
                aria-label={`Desligar ${t.nome}`}
                className="btn btn-ghost btn-sm h-12 w-12 rounded-xl text-error"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
