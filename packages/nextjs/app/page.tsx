"use client";

import { useMemo, useState } from "react";
import type { NextPage } from "next";
import { QrCodeIcon, ShoppingBagIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { CampaignCard } from "~~/components/vitrine/CampaignCard";
import { CategoryFilter } from "~~/components/vitrine/CategoryFilter";
import { FlashSection } from "~~/components/vitrine/FlashSection";
import { useCampaigns } from "~~/hooks/vitrine/useCampaigns";

const GASTRONOMY = 0;
const OTHER_CATEGORIES = [1, 2, 3, 4] as const;

const HERO_STEPS = [
  { Icon: ShoppingBagIcon, text: "Compre o cupom do restaurante" },
  { Icon: QrCodeIcon, text: "Mostre o QR code no caixa" },
  { Icon: SparklesIcon, text: "Aproveite o pedido em dobro" },
];

const Home: NextPage = () => {
  const { campaigns, isLoading } = useCampaigns();
  const [otherCategory, setOtherCategory] = useState<number | null>(null);

  // Paused campaigns are an admin state, not something shoppers should see.
  const visible = useMemo(() => campaigns.filter(c => c.active), [campaigns]);
  const restaurants = useMemo(() => visible.filter(c => c.category === GASTRONOMY), [visible]);
  const others = useMemo(
    () => visible.filter(c => c.category !== GASTRONOMY && (otherCategory === null || c.category === otherCategory)),
    [visible, otherCategory],
  );
  const hasOthers = useMemo(() => visible.some(c => c.category !== GASTRONOMY), [visible]);

  return (
    <div className="flex flex-col items-center grow w-full">
      {/* Hero */}
      <div className="w-full bg-linear-to-br from-primary/10 via-base-200 to-secondary/20 border-b border-base-300">
        <div className="max-w-5xl mx-auto px-5 py-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-black m-0 text-balance">
            Peça 1, <span className="text-primary">leve 2</span> nos restaurantes de Floripa
          </h1>
          <p className="text-lg opacity-70 mt-4 mb-0 max-w-2xl mx-auto">
            Cupons de dobro nos melhores restaurantes da ilha. Compre aqui, mostre na hora de pedir e pronto.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-8 mt-7">
            {HERO_STEPS.map(({ Icon, text }, i) => (
              <div key={text} className="flex items-center justify-center gap-2 text-sm font-semibold">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-content flex items-center justify-center text-xs font-black shrink-0">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5 text-primary shrink-0" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl w-full mx-auto px-5 py-8 flex flex-col gap-10">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <span className="loading loading-spinner loading-lg" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20 opacity-60">
            <p className="text-lg">Nenhuma oferta disponível no momento.</p>
            <p className="text-sm">Volte em breve — novos restaurantes entram toda semana.</p>
          </div>
        ) : (
          <>
            <FlashSection campaigns={visible} />

            <section className="w-full flex flex-col gap-4">
              <h2 className="text-2xl font-extrabold m-0">Restaurantes participantes</h2>
              {restaurants.length === 0 ? (
                <p className="opacity-60 py-8 text-center">Nenhum restaurante com oferta ativa agora.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {restaurants.map(c => (
                    <CampaignCard key={c.id.toString()} campaign={c} />
                  ))}
                </div>
              )}
            </section>

            {hasOthers && (
              <section className="w-full flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h2 className="text-xl font-extrabold m-0">Outras experiências</h2>
                  <CategoryFilter selected={otherCategory} onSelect={setOtherCategory} only={OTHER_CATEGORIES} />
                </div>
                {others.length === 0 ? (
                  <p className="opacity-60 py-8 text-center">Nada nesta categoria por enquanto.</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {others.map(c => (
                      <CampaignCard key={c.id.toString()} campaign={c} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
