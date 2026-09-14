"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircleIcon, StarIcon } from "@heroicons/react/24/outline";
import { CategoryIcon } from "~~/components/vitrine/CategoryIcon";
import { categoryInfo } from "~~/utils/vitrine";

type Item = {
  id: number | null;
  titulo: string;
  descricao: string | null;
  selos: number;
  pontos: number;
  esgotada: boolean;
  pronta: boolean;
  falta: number;
  faltamPontos: number;
  loja: { slug: string; nome: string; categoria: number; bairro: string | null };
};

/** A vitrine do bairro: tudo o que os carimbos e os pontos compram. */
export const CatalogoRecompensas = () => {
  const [dados, setDados] = useState<{ catalogo: Item[]; pontos: number; logado: boolean }>();
  const [soProntas, setSoProntas] = useState(false);

  useEffect(() => {
    fetch("/api/recompensas")
      .then(r => r.json())
      .then(setDados)
      .catch(() => setDados({ catalogo: [], pontos: 0, logado: false }));
  }, []);

  if (!dados) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  const prontas = dados.catalogo.filter(r => r.pronta && !r.esgotada);
  const lista = soProntas ? prontas : dados.catalogo;

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-serif text-2xl font-black text-secondary">Prêmios</h1>
          <p className="m-0 mt-0.5 text-sm opacity-70">
            {dados.logado ? "Troque no balcão, mostrando seu passe" : "Entre para ver o que já está ao seu alcance"}
          </p>
        </div>
        {dados.pontos > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-honey-edge bg-honey-soft px-3 py-1.5 text-sm font-bold text-honey-ink">
            <StarIcon className="h-4 w-4" />
            {dados.pontos}
          </span>
        )}
      </header>

      {prontas.length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSoProntas(false)}
            className={`btn btn-sm rounded-xl font-bold ${soProntas ? "btn-ghost" : "btn-primary"}`}
          >
            Tudo
          </button>
          <button
            type="button"
            onClick={() => setSoProntas(true)}
            className={`btn btn-sm rounded-xl font-bold ${soProntas ? "btn-primary" : "btn-ghost"}`}
          >
            Já posso pegar ({prontas.length})
          </button>
        </div>
      )}

      {lista.length === 0 ? (
        <p className="m-0 rounded-3xl border-2 border-dashed border-base-300 px-6 py-14 text-center text-sm opacity-70">
          Ainda não há prêmios cadastrados por aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map(r => {
            const info = categoryInfo(r.loja.categoria);
            return (
              <Link
                key={`${r.loja.slug}-${r.id}-${r.titulo}`}
                href={`/carteira/${r.loja.slug}`}
                className={`block rounded-2xl border p-4 no-underline transition active:scale-[0.99] ${
                  r.pronta && !r.esgotada ? "border-primary bg-primary/5" : "border-base-300 bg-base-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-base-200 text-brand-ink">
                      <CategoryIcon iconKey={info.iconKey} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="m-0 font-bold leading-tight text-secondary">{r.titulo}</h2>
                      <span className="text-xs opacity-65">
                        {r.loja.nome}
                        {r.loja.bairro ? ` · ${r.loja.bairro}` : ""}
                      </span>
                      {r.descricao && <p className="m-0 mt-1 text-xs leading-snug opacity-70">{r.descricao}</p>}
                    </div>
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-base-200 px-2.5 py-1 text-xs font-bold text-secondary">
                    {r.selos > 0 && `${r.selos}`}
                    {r.selos > 0 && r.pontos > 0 && " + "}
                    {r.pontos > 0 && (
                      <>
                        <StarIcon className="h-3.5 w-3.5" />
                        {r.pontos}
                      </>
                    )}
                  </span>
                </div>

                {dados.logado && (
                  <p className="m-0 mt-2 text-xs font-semibold">
                    {r.esgotada ? (
                      <span className="opacity-60">esgotado por enquanto</span>
                    ) : r.pronta ? (
                      <span className="inline-flex items-center gap-1 text-brand-ink">
                        <CheckCircleIcon className="h-4 w-4" />
                        pronto — peça no balcão
                      </span>
                    ) : (
                      <span className="opacity-70">
                        {r.falta > 0 && `faltam ${r.falta} ${r.falta === 1 ? "carimbo" : "carimbos"}`}
                        {r.falta > 0 && r.faltamPontos > 0 && " e "}
                        {r.faltamPontos > 0 && `faltam ${r.faltamPontos} pontos da cidade`}
                      </span>
                    )}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
