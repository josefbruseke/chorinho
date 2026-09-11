"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { BuildingStorefrontIcon, MagnifyingGlassIcon, MapIcon } from "@heroicons/react/24/outline";
import { CampaignCard } from "~~/components/vitrine/CampaignCard";
import { CategoryFilter } from "~~/components/vitrine/CategoryFilter";
import { FlashSection } from "~~/components/vitrine/FlashSection";
import { QuickMintModal } from "~~/components/vitrine/QuickMintModal";
import { useCampaigns } from "~~/hooks/vitrine/useCampaigns";
import { Campaign } from "~~/utils/vitrine";

/**
 * Lista em grade dos estabelecimentos. É o caminho alternativo ao mapa, para
 * quem recusou a localização ou prefere buscar por nome — o app tem que ser
 * inteiramente usável sem GPS.
 */
const Explorar: NextPage = () => {
  const { campaigns, isLoading } = useCampaigns();
  const [categoria, setCategoria] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [paraAdquirir, setParaAdquirir] = useState<Campaign | null>(null);

  const ativas = useMemo(() => campaigns.filter(c => c.active), [campaigns]);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return ativas.filter(c => {
      if (categoria !== null && c.category !== categoria) return false;
      if (!termo) return true;
      const campos = [c.metadata?.name, c.metadata?.description, c.metadata?.establishment, c.metadata?.neighborhood];
      return campos.some(v => v?.toLowerCase().includes(termo));
    });
  }, [ativas, categoria, busca]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-5 flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-black m-0 tracking-tight text-secondary">
              Lugares do bairro
            </h1>
            <p className="text-sm opacity-70 m-0 mt-1">
              Descubra os estabelecimentos parceiros e garanta seu passe no balcão
            </p>
          </div>
          <Link href="/mapa" className="btn btn-ghost h-12 rounded-2xl gap-1.5 shrink-0" aria-label="Ver no mapa">
            <MapIcon className="w-5 h-5" />
            <span className="hidden sm:inline">Mapa</span>
          </Link>
        </div>

        {/* Campo de busca com altura de 48px: é o ponto de entrada alternativo ao mapa,
            precisa ser fácil de tocar e o texto digitado fácil de ler. */}
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
          <input
            type="search"
            placeholder="Buscar café, padaria, bairro..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input input-bordered h-12 pl-11 w-full rounded-2xl text-base bg-base-100 shadow-2xs"
          />
        </div>

        <CategoryFilter selected={categoria} onSelect={setCategoria} />
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : ativas.length === 0 ? (
        <div className="text-center py-16 rounded-3xl border-2 border-dashed border-base-300 p-8 bg-base-100">
          <BuildingStorefrontIcon className="h-12 w-12 mx-auto text-primary opacity-60 mb-2" />
          <p className="text-lg font-serif font-bold m-0 text-secondary">Nenhuma oferta por aqui ainda.</p>
          <p className="text-sm opacity-70 mt-1 mb-4">
            Em breve novos estabelecimentos do seu bairro entram no programa.
          </p>
          <Link href="/para-comerciantes" className="btn btn-primary h-12 rounded-2xl">
            Tenho um comércio
          </Link>
        </div>
      ) : (
        <>
          <FlashSection campaigns={ativas} />

          <section className="w-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider opacity-70 font-bold">
                {filtradas.length} {filtradas.length === 1 ? "estabelecimento" : "estabelecimentos"}
              </span>
              {(categoria !== null || busca) && (
                <button
                  className="btn btn-ghost h-12 text-xs rounded-xl"
                  onClick={() => {
                    setCategoria(null);
                    setBusca("");
                  }}
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {filtradas.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-base-300 bg-base-100 p-6">
                <p className="text-base font-bold opacity-70 m-0">Nenhum local com esses filtros.</p>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtradas.map(c => (
                  <CampaignCard key={c.id.toString()} campaign={c} onQuickJoin={setParaAdquirir} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      <QuickMintModal campaign={paraAdquirir} onClose={() => setParaAdquirir(null)} />
    </div>
  );
};

export default Explorar;
