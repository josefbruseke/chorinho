"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  FireIcon,
  QrCodeIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { CategoryIcon } from "~~/components/vitrine/CategoryIcon";
import { supabaseBrowser, supabaseConfigurado } from "~~/services/database/browser";
import { categoryInfo } from "~~/utils/vitrine";

type Recompensa = {
  id: number | null;
  titulo: string;
  descricao: string | null;
  selos: number;
  pontos: number;
  esgotada: boolean;
  pronta: boolean;
};

type Resposta = {
  loja: { slug: string; nome: string; categoria: number; bairro: string | null; cidade: string | null };
  cartela: { saldo: number; total: number; sequencia: number; melhorSequencia: number; ultimaVisita: string | null };
  pontos: number;
  recompensas: Recompensa[];
};

/** Uma cartela em detalhe: o saldo, a sequência e tudo o que dá para trocar. */
export const CartelaDaLoja = ({ slug }: { slug: string }) => {
  const [dados, setDados] = useState<Resposta>();
  const [erro, setErro] = useState<string>();

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/carteira/loja/${slug}`);
      if (!r.ok) {
        setErro(r.status === 401 ? "Entre na sua conta para ver esta cartela." : "Não encontramos esta loja.");
        return;
      }
      setErro(undefined);
      setDados(await r.json());
    } catch {
      setErro("Sem conexão. Tente de novo em instantes.");
    }
  }, [slug]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (!dados || !supabaseConfigurado()) return;
    const canal = supabaseBrowser()
      .channel(`cartela:${slug}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stamp_balances_cache" }, () => void carregar())
      .subscribe();
    return () => {
      void supabaseBrowser().removeChannel(canal);
    };
  }, [dados, slug, carregar]);

  if (erro) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="m-0 max-w-xs text-sm opacity-75">{erro}</p>
        <Link href="/carteira" className="btn btn-primary rounded-2xl font-bold">
          Voltar às cartelas
        </Link>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  const info = categoryInfo(dados.loja.categoria);
  const prontas = dados.recompensas.filter(r => r.pronta && !r.esgotada).length;

  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <Link href="/carteira" className="btn btn-ghost btn-sm self-start gap-1 rounded-xl font-bold">
        <ArrowLeftIcon className="h-4 w-4" />
        Cartelas
      </Link>

      <header className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-brand-ink">
          <CategoryIcon iconKey={info.iconKey} className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="m-0 font-serif text-2xl font-black leading-tight text-secondary">{dados.loja.nome}</h1>
          <span className="text-sm opacity-65">{dados.loja.bairro ?? dados.loja.cidade ?? info.label}</span>
        </div>
      </header>

      <section className="rounded-3xl border-2 border-dashed border-kraft-edge bg-gradient-to-br from-base-200 via-kraft to-craft p-5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-5xl font-black leading-none text-secondary">{dados.cartela.saldo}</span>
          <span className="text-sm font-bold opacity-70">
            {dados.cartela.saldo === 1 ? "carimbo disponível" : "carimbos disponíveis"}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-kraft-edge pt-3 text-center">
          <div>
            <dt className="m-0 text-[11px] font-bold uppercase tracking-wide opacity-60">Sequência</dt>
            <dd className="m-0 inline-flex items-center gap-1 font-mono text-lg font-black text-secondary">
              {dados.cartela.sequencia > 1 && <FireIcon className="h-4 w-4 text-honey-ink" />}
              {dados.cartela.sequencia}
            </dd>
          </div>
          <div>
            <dt className="m-0 text-[11px] font-bold uppercase tracking-wide opacity-60">Recorde</dt>
            <dd className="m-0 font-mono text-lg font-black text-secondary">{dados.cartela.melhorSequencia}</dd>
          </div>
          <div>
            <dt className="m-0 text-[11px] font-bold uppercase tracking-wide opacity-60">De sempre</dt>
            <dd className="m-0 font-mono text-lg font-black text-secondary">{dados.cartela.total}</dd>
          </div>
        </dl>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="m-0 font-serif text-lg font-black text-secondary">O que dá para trocar</h2>
          {prontas > 0 && (
            <span className="text-xs font-bold text-brand-ink">
              {prontas === 1 ? "1 pronto" : `${prontas} prontos`}
            </span>
          )}
        </div>

        {dados.recompensas.length === 0 ? (
          <p className="m-0 rounded-2xl border border-dashed border-base-300 p-5 text-center text-sm opacity-70">
            Esta loja ainda não cadastrou prêmios. Seus carimbos continuam guardados.
          </p>
        ) : (
          dados.recompensas.map(r => {
            const falta = Math.max(0, r.selos - dados.cartela.saldo);
            const faltamPontos = Math.max(0, r.pontos - dados.pontos);
            return (
              <article
                key={`${r.id}-${r.titulo}`}
                className={`rounded-2xl border p-4 ${
                  r.pronta && !r.esgotada ? "border-primary bg-primary/5" : "border-base-300 bg-base-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="m-0 font-bold leading-tight text-secondary">{r.titulo}</h3>
                    {r.descricao && <p className="m-0 mt-0.5 text-xs leading-snug opacity-70">{r.descricao}</p>}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-base-200 px-2.5 py-1 text-xs font-bold text-secondary">
                    {r.selos > 0 && `${r.selos} ${r.selos === 1 ? "carimbo" : "carimbos"}`}
                    {r.selos > 0 && r.pontos > 0 && " + "}
                    {r.pontos > 0 && (
                      <>
                        <StarIcon className="h-3.5 w-3.5" />
                        {r.pontos}
                      </>
                    )}
                  </span>
                </div>

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
                      {falta > 0 && `faltam ${falta} ${falta === 1 ? "carimbo" : "carimbos"}`}
                      {falta > 0 && faltamPontos > 0 && " e "}
                      {faltamPontos > 0 && `faltam ${faltamPontos} pontos`}
                    </span>
                  )}
                </p>
              </article>
            );
          })
        )}
      </section>

      <div className="flex flex-col gap-2">
        <Link href="/passe" className="btn btn-primary h-14 gap-2 rounded-2xl font-black">
          <QrCodeIcon className="h-5 w-5" />
          Mostrar meu passe
        </Link>
        <Link href={`/local/${dados.loja.slug}`} className="btn btn-ghost btn-sm gap-1.5 rounded-xl">
          <BuildingStorefrontIcon className="h-4 w-4" />
          Ver a loja
        </Link>
      </div>
    </div>
  );
};
