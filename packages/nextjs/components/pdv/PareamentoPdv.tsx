"use client";

import { useState } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";

/**
 * A instalação do balcão, feita uma vez.
 *
 * O lojista cria o terminal no painel, recebe um código de oito letras e traz
 * até aqui. Depois disso o atendente nunca mais digita nada para começar o
 * turno — que é a diferença entre o programa de fidelidade ser usado ou virar
 * "o tablet que ninguém sabe a senha".
 */
export const PareamentoPdv = ({ aoParear }: { aoParear: () => void }) => {
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string>();
  const [enviando, setEnviando] = useState(false);
  const [pronto, setPronto] = useState<string>();

  const parear = async () => {
    setEnviando(true);
    setErro(undefined);
    try {
      const r = await fetch("/api/pos/parear", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo, aparelho: navigator.userAgent.slice(0, 60) }),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível parear este aparelho");
        return;
      }
      setPronto(corpo.loja);
      // Um instante para o atendente ler o nome da loja e ter certeza de que
      // pareou no lugar certo antes da tela trocar.
      setTimeout(aoParear, 1200);
    } catch {
      setErro("Sem internet. O pareamento precisa de conexão — só desta vez.");
    } finally {
      setEnviando(false);
    }
  };

  if (pronto) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <CheckCircleIcon className="h-20 w-20 text-success" />
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Balcão pronto</h1>
        <p className="m-0 text-base opacity-80">{pronto}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <BrandLogo className="h-10" />

      <div className="text-center">
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Ligar este aparelho ao balcão</h1>
        <p className="m-0 mt-1.5 max-w-xs text-sm leading-relaxed opacity-75">
          No painel da loja, crie um terminal e digite aqui o código de oito letras. Só precisa fazer isso uma vez neste
          aparelho.
        </p>
      </div>

      <form
        className="flex w-full max-w-xs flex-col gap-3"
        onSubmit={e => {
          e.preventDefault();
          if (codigo.length === 8) void parear();
        }}
      >
        <input
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={8}
          value={codigo}
          onChange={e => setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          placeholder="ABCD2345"
          aria-label="Código do terminal"
          className="input input-bordered h-20 w-full text-center font-mono text-3xl font-black tracking-[0.25em]"
        />

        {erro && (
          <p className="m-0 inline-flex items-start gap-2 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={codigo.length !== 8 || enviando}
          className="btn btn-primary btn-block h-14 rounded-2xl text-lg font-black disabled:opacity-40"
        >
          {enviando ? <span className="loading loading-spinner loading-sm" /> : "Ligar ao balcão"}
        </button>
      </form>

      <p className="m-0 max-w-xs text-center text-xs leading-relaxed opacity-65">
        Perdeu o aparelho? O lojista desliga este terminal pelo painel e ele para de carimbar na hora.
      </p>
    </div>
  );
};
