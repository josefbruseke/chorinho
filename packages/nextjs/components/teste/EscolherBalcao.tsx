"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type Loja = {
  id: string;
  name: string;
  slug: string;
  status: string;
  onchain_id: number | null;
  neighborhood: string | null;
};

/**
 * Por que esta loja não carimbaria, em uma frase.
 *
 * A ordem é a mesma que `services/pdv/emitir.ts` aplica, e de propósito: se as
 * duas divergirem, esta tela vira uma segunda verdade sobre o mesmo assunto — e
 * a que o caixa vê é sempre a do servidor.
 */
const impedimento = (l: Loja) => {
  if (l.status !== "ativo") return `status ${l.status}`;
  if (l.onchain_id === null) return "fora da cadeia";
  return null;
};

export const EscolherBalcao = ({ lojas }: { lojas: Loja[] }) => {
  const router = useRouter();
  const [abrindo, setAbrindo] = useState<string>();
  const [erro, setErro] = useState<string>();

  const abrir = async (l: Loja, onde: "balcao" | "painel") => {
    setAbrindo(`${l.id}:${onde}`);
    setErro(undefined);
    try {
      const r = await fetch(`/api/teste/${onde}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lojaId: l.id }),
      });
      if (!r.ok) {
        setErro((await r.json().catch(() => ({})))?.erro ?? "não foi possível abrir");
        setAbrindo(undefined);
        return;
      }
      router.push(onde === "balcao" ? "/pdv" : "/painel");
      router.refresh();
    } catch {
      setErro("sem conexão");
      setAbrindo(undefined);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Modo de teste</h1>
        <p className="m-0 flex gap-2 rounded-2xl border border-warning/40 bg-warning/10 p-3 text-sm">
          <ExclamationTriangleIcon className="h-5 w-5 shrink-0" />
          <span>
            Qualquer pessoa com este endereço abre o balcão de qualquer loja e emite carimbo. Não deixe ligado no
            endereço que você divulga.
          </span>
        </p>
      </header>

      {erro && (
        <p className="m-0 rounded-2xl border border-error/30 bg-error/10 px-3.5 py-2.5 text-sm text-error">{erro}</p>
      )}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {lojas.map(l => {
          const trava = impedimento(l);
          return (
            <li key={l.id} className="flex flex-col gap-2 rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <strong className="block truncate text-base text-secondary">{l.name}</strong>
                  <span className="text-xs opacity-60">
                    {l.neighborhood ?? l.slug}
                    {l.onchain_id !== null && ` · id ${l.onchain_id}`}
                  </span>
                </span>
                {/* O impedimento vale para o balcão, não para o painel: uma loja
                    suspensa ainda precisa ser configurada — é por lá que se
                    conserta. */}
                {trava && <span className="shrink-0 text-xs font-bold text-warning">{trava}</span>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void abrir(l, "balcao")}
                  disabled={Boolean(abrindo)}
                  className="btn btn-sm flex-1 rounded-xl font-bold"
                >
                  {abrindo === `${l.id}:balcao` ? <span className="loading loading-spinner loading-xs" /> : "Balcão"}
                </button>
                <button
                  type="button"
                  onClick={() => void abrir(l, "painel")}
                  disabled={Boolean(abrindo)}
                  className="btn btn-sm flex-1 rounded-xl font-bold"
                >
                  {abrindo === `${l.id}:painel` ? <span className="loading loading-spinner loading-xs" /> : "Painel"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="m-0 text-xs leading-relaxed opacity-70">
        Abrir o balcão aqui cria um terminal de verdade e entrega o mesmo cookie do pareamento. Tudo o que vem depois é
        o caminho normal — loja suspensa, fora da cadeia ou com assinatura vencida continua sendo recusada no caixa.
      </p>
    </div>
  );
};
