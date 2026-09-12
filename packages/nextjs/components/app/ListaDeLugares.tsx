"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRightIcon, MagnifyingGlassIcon, MapIcon } from "@heroicons/react/24/outline";
import { CategoryFilter } from "~~/components/vitrine/CategoryFilter";
import { CategoryIcon } from "~~/components/vitrine/CategoryIcon";
import { supabaseBrowser, supabaseConfigurado } from "~~/services/database/browser";
import { categoryInfo } from "~~/utils/vitrine";

type Lugar = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: number;
  neighborhood: string | null;
  city: string | null;
};

/**
 * Os comércios do bairro em lista.
 *
 * É o caminho alternativo ao mapa — para quem recusou a localização, para quem
 * prefere procurar pelo nome, e para quem está num aparelho onde o mapa pesa.
 * O aplicativo precisa ser inteiro utilizável sem GPS.
 *
 * A lista vem do Supabase, a mesma fonte do mapa. A versão anterior listava
 * campanhas do contrato de cupom, o que fazia a tela dizer "estabelecimentos
 * parceiros" e mostrar outra coisa.
 */
export const ListaDeLugares = () => {
  const [lugares, setLugares] = useState<Lugar[]>();
  const [erro, setErro] = useState<string>();
  const [categoria, setCategoria] = useState<number | null>(null);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    if (!supabaseConfigurado()) {
      setErro("Não foi possível carregar os comércios agora.");
      return;
    }
    supabaseBrowser()
      .from("establishments")
      .select("id, slug, name, description, category, neighborhood, city")
      .eq("status", "ativo")
      .order("featured", { ascending: false })
      .order("name")
      .limit(200)
      .then(({ data, error }) => {
        if (error) setErro("Não foi possível carregar os comércios agora.");
        else setLugares(data ?? []);
      });
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lugares ?? []).filter(l => {
      if (categoria !== null && l.category !== categoria) return false;
      if (!termo) return true;
      return [l.name, l.description, l.neighborhood, l.city].some(v => v?.toLowerCase().includes(termo));
    });
  }, [lugares, categoria, busca]);

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="m-0 font-serif text-2xl font-black tracking-tight text-secondary">Lugares do bairro</h1>
            <p className="m-0 mt-1 text-sm opacity-75">
              Os comércios que participam. Mostre seu passe no balcão de qualquer um deles.
            </p>
          </div>
          {/* Ação de igual peso, não um enfeite: esta é a porta do mapa agora que
              a grade é a tela inicial, e um ícone mudo no canto não é porta. */}
          <Link href="/mapa" className="btn btn-outline h-12 shrink-0 gap-1.5 rounded-2xl font-bold">
            <MapIcon className="h-5 w-5" />
            Mapa
          </Link>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 opacity-60" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar café, padaria, bairro…"
            aria-label="Buscar comércio"
            className="input input-bordered h-12 w-full pl-12 text-base"
          />
        </div>

        <CategoryFilter selected={categoria} onSelect={setCategoria} />
      </header>

      {erro ? (
        <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>
      ) : !lugares ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-base-300 px-6 py-14 text-center">
          <p className="m-0 max-w-xs text-sm opacity-75">
            {busca || categoria !== null
              ? "Nada por aqui com esse filtro. Tente outro termo ou veja todas as categorias."
              : "Ainda não há comércios cadastrados nesta região."}
          </p>
          {(busca || categoria !== null) && (
            <button
              type="button"
              onClick={() => {
                setBusca("");
                setCategoria(null);
              }}
              className="btn btn-primary h-12 rounded-2xl font-bold"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {filtrados.map(lugar => {
            const info = categoryInfo(lugar.category);
            return (
              <li key={lugar.id}>
                <Link
                  href={`/local/${lugar.slug}`}
                  className="flex min-h-16 items-center gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 no-underline transition active:scale-[0.99]"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                    <CategoryIcon iconKey={info.iconKey} className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-lg leading-tight text-secondary">{lugar.name}</strong>
                    <span className="block truncate text-sm opacity-75">
                      {lugar.neighborhood ?? lugar.city ?? info.label}
                    </span>
                  </span>
                  <ChevronRightIcon className="h-5 w-5 shrink-0 opacity-40" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
