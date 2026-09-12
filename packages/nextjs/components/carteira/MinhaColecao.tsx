"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { MapPinIcon, SparklesIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { beneficioEmTexto, dataCurta } from "~~/utils/colecao";

type Peca = {
  id: string;
  onchainId: number;
  titulo: string;
  descricao: string | null;
  imagem?: string;
  quantidade: number;
  nivel: number;
  tiragem: number;
  terminaEm: string | null;
  programa?: {
    nome: string;
    tipo: "percentual" | "valor";
    beneficioBase: number;
    tetoCentavos: number;
    produto: string | null;
    ativo: boolean;
  };
  valeEm: { slug: string; nome: string }[];
};

type Conquista = {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem?: string;
  loja?: { slug: string; nome: string };
  alcancado: number;
  alvo: number;
  merecida: boolean;
};

type Resposta = { carteira: string | null; pecas: Peca[]; conquistas: Conquista[]; aviso?: string };

/**
 * A coleção do cliente: o que ele tem e o que está a poucas visitas.
 *
 * A peça vale dinheiro no balcão, então tudo aqui responde a mesma pergunta na
 * ordem em que ela é feita: quanto desconta, até quando, e ONDE. O "onde" é o
 * que mais importa num programa conjunto — descobrir no caixa que a peça não
 * vale naquela loja é o pior lugar possível para descobrir.
 */
export const MinhaColecao = () => {
  const [dados, setDados] = useState<Resposta>();
  const [erro, setErro] = useState<string>();
  const [recebendo, setRecebendo] = useState<string>();
  const [recado, setRecado] = useState<string>();

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/carteira/colecao");
      if (!r.ok) {
        setErro(r.status === 401 ? "Entre na sua conta para ver sua coleção." : "Não foi possível carregar agora.");
        return;
      }
      setErro(undefined);
      setDados(await r.json());
    } catch {
      setErro("Sem conexão. Tente de novo em instantes.");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const receber = async (c: Conquista) => {
    setRecebendo(c.id);
    setRecado(undefined);
    try {
      const r = await fetch(`/api/carteira/conquistas/${c.id}`, { method: "POST" });
      const corpo = await r.json().catch(() => ({}));
      setRecado(r.ok ? `${c.titulo} é sua.` : (corpo?.erro ?? "não deu certo agora"));
      if (r.ok) await carregar();
    } catch {
      setRecado("sem conexão — tente de novo em instantes");
    } finally {
      setRecebendo(undefined);
    }
  };

  if (erro) return <p className="m-0 px-5 text-sm opacity-70">{erro}</p>;

  if (!dados) {
    return (
      <div className="flex justify-center py-10">
        <span className="loading loading-spinner loading-md text-primary" />
      </div>
    );
  }

  const aReceber = dados.conquistas.filter(c => c.merecida);
  const emAndamento = dados.conquistas.filter(c => !c.merecida);

  if (dados.pecas.length === 0 && dados.conquistas.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <header>
        <h2 className="m-0 font-serif text-xl font-black text-secondary">Minha coleção</h2>
        <p className="m-0 mt-0.5 text-sm opacity-70">Suas peças de desconto e as conquistas que estão perto.</p>
      </header>

      {recado && (
        <p className="m-0 rounded-2xl border border-honey-edge bg-honey-soft p-3 text-sm font-semibold text-honey-ink">
          {recado}
        </p>
      )}

      {aReceber.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {aReceber.map(c => (
            <li key={c.id} className="flex flex-col gap-3 rounded-2xl border-2 border-primary bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <TrophyIcon className="h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0">
                  <strong className="block text-base text-secondary">Você conquistou: {c.titulo}</strong>
                  {c.loja && <span className="text-xs opacity-70">{c.loja.nome}</span>}
                </div>
              </div>
              <button
                type="button"
                disabled={recebendo === c.id}
                onClick={() => void receber(c)}
                className="btn btn-primary h-14 rounded-2xl font-black"
              >
                {recebendo === c.id ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Recebendo…
                  </>
                ) : (
                  "Tocar para receber"
                )}
              </button>
              {recebendo === c.id && (
                <span className="text-center text-xs opacity-70">
                  A rede leva alguns segundos para confirmar. Pode deixar a tela aberta.
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {dados.pecas.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {dados.pecas.map(p => (
            <PecaCard key={p.id} peca={p} />
          ))}
        </ul>
      )}

      {emAndamento.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="m-0 text-xs font-black uppercase tracking-wide opacity-60">Quase lá</h3>
          {emAndamento.slice(0, 4).map(c => {
            const fracao = Math.min(1, c.alcancado / Math.max(1, c.alvo));
            return (
              <div key={c.id} className="flex flex-col gap-1.5 rounded-2xl border border-base-300 bg-base-100 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <strong className="truncate text-sm text-secondary">{c.titulo}</strong>
                  <span className="shrink-0 font-mono text-xs font-bold opacity-70">
                    {c.alcancado}/{c.alvo}
                  </span>
                </div>
                {c.loja && <span className="text-xs opacity-60">{c.loja.nome}</span>}
                <div className="h-2 overflow-hidden rounded-full bg-base-300">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${fracao * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

const PecaCard = ({ peca }: { peca: Peca }) => {
  const desconto = peca.programa
    ? beneficioEmTexto(peca.programa.tipo, peca.programa.beneficioBase, peca.nivel, peca.programa.tetoCentavos)
    : undefined;

  return (
    <li className="overflow-hidden rounded-2xl border border-base-300 bg-base-100">
      <div className="flex items-stretch">
        {peca.imagem ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={peca.imagem} alt="" className="h-auto w-24 shrink-0 object-cover" />
        ) : (
          <div className="flex w-24 shrink-0 items-center justify-center bg-linear-to-br from-amber-800 to-stone-900">
            <SparklesIcon className="h-8 w-8 text-white/70" />
          </div>
        )}

        <div className="min-w-0 flex-1 p-3">
          <div className="flex items-baseline justify-between gap-2">
            <strong className="truncate text-base text-secondary">{peca.titulo}</strong>
            {peca.quantidade > 1 && (
              <span className="shrink-0 rounded-full bg-base-200 px-2 py-0.5 text-xs font-black">
                ×{peca.quantidade}
              </span>
            )}
          </div>

          {desconto && (
            <p className="m-0 mt-0.5 text-sm font-black text-primary">
              {desconto} de desconto
              {peca.programa?.produto ? ` em ${peca.programa.produto}` : ""}
            </p>
          )}

          <p className="m-0 mt-1 text-xs opacity-70">
            {peca.programa?.nome}
            {peca.terminaEm && ` • até ${dataCurta(peca.terminaEm)}`}
            {peca.tiragem > 0 && ` • tiragem de ${peca.tiragem}`}
          </p>

          {peca.programa && !peca.programa.ativo && (
            <p className="m-0 mt-1 text-xs font-bold text-warning">a loja pausou este programa</p>
          )}

          {/* Onde vale. Numa peça de programa conjunto isto é a informação
              principal: a vizinha pode ter saído da pool, e é melhor descobrir
              aqui do que no caixa. */}
          {peca.valeEm.length > 0 && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <MapPinIcon className="h-3.5 w-3.5 shrink-0 opacity-60" />
              {peca.valeEm.map(l => (
                <Link
                  key={l.slug}
                  href={`/local/${l.slug}`}
                  className="rounded-full bg-base-200 px-2 py-0.5 text-xs font-semibold no-underline"
                >
                  {l.nome}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </li>
  );
};
