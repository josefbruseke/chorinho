"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { CategoryIcon } from "./CategoryIcon";
import { VerifiedBadge } from "./VerifiedBadge";
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, SparklesIcon, TicketIcon } from "@heroicons/react/24/outline";

export interface FeaturedItem {
  id: string;
  title: string;
  establishment: string;
  neighborhood: string;
  categoryKey: string;
  categoryLabel: string;
  reward: string;
  stampsNeeded: number;
  highlightTag: string;
  accentBg: string;
  image?: string;
  link: string;
}

const FEATURED_ITEMS: FeaturedItem[] = [
  {
    id: "1",
    title: "Café Especial & Pão de Queijo",
    establishment: "Café do Bairro",
    neighborhood: "Centro Histórico",
    categoryKey: "cafe",
    categoryLabel: "Cafés & Gastronomia",
    reward: "1 Pão de Queijo da Canastra Quentinho",
    stampsNeeded: 5,
    highlightTag: "Mais Querido da Semana",
    accentBg: "from-amber-900/90 via-stone-900 to-amber-950",
    link: "/campanha/0",
  },
  {
    id: "2",
    title: "Corte Clássico & Toalha Quente",
    establishment: "Barbearia Navalha de Ouro",
    neighborhood: "Santa Mônica",
    categoryKey: "barbearia",
    categoryLabel: "Barbearias & Estética",
    reward: "Alinhamento de Barba com Toalha Quente",
    stampsNeeded: 4,
    highlightTag: "Tradição no Bairro",
    accentBg: "from-stone-900 via-neutral-950 to-stone-900",
    link: "/campanha/1",
  },
  {
    id: "3",
    title: "Fornada da Manhã & Broa Artesanal",
    establishment: "Padaria Trigo Santo",
    neighborhood: "Lagoa",
    categoryKey: "cafe",
    categoryLabel: "Cafés & Gastronomia",
    reward: "Broa de Milho Recheada da Casa",
    stampsNeeded: 8,
    highlightTag: "Fornada Quente às 16h",
    accentBg: "from-orange-950 via-stone-900 to-amber-900",
    link: "/campanha/2",
  },
  {
    id: "4",
    title: "Gelato Puro de Pistache & Avelã",
    establishment: "Gelato da Praça",
    neighborhood: "Praça Central",
    categoryKey: "lazer",
    categoryLabel: "Lazer & Experiências",
    reward: "Cascão Duplo com Calda Quente",
    stampsNeeded: 5,
    highlightTag: "Artesanal 100% Puro",
    accentBg: "from-amber-900 via-stone-900 to-stone-950",
    link: "/campanha/3",
  },
  {
    id: "5",
    title: "Queijos, Vinhos & Geleias",
    establishment: "Empório da Terra",
    neighborhood: "Córrego Grande",
    categoryKey: "mercado",
    categoryLabel: "Mercados & Lojas",
    reward: "Pote de Geleia Artesanal de Amoras",
    stampsNeeded: 3,
    highlightTag: "Produtores Regionais",
    accentBg: "from-stone-900 via-amber-950 to-stone-950",
    link: "/campanha/4",
  },
];

export const FeaturedCarousel: React.FC = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = 340;
    const scrollAmount = direction === "left" ? -cardWidth : cardWidth;
    scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const cardWidth = 340;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveIndex(Math.min(Math.max(newIndex, 0), FEATURED_ITEMS.length - 1));
  };

  return (
    <section className="w-full py-10 px-4 max-w-6xl mx-auto">
      {/* Header do Carrossel */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-accent text-xs font-black uppercase tracking-wider mb-2">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Chorinhos em Destaque</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-serif font-black tracking-tight text-secondary">
            O que está acontecendo no bairro
          </h2>
          <p className="text-sm sm:text-base opacity-75 mt-1 max-w-xl">
            Descubra os agrados mais disputados dos balcões locais pertinho de você.
          </p>
        </div>

        {/* Controles de Navegação */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Item anterior"
            className="w-10 h-10 rounded-2xl border border-base-300 bg-base-100 hover:bg-base-200 text-secondary flex items-center justify-center transition-all active:scale-95 shadow-xs"
          >
            <ChevronLeftIcon className="w-5 h-5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Próximo item"
            className="w-10 h-10 rounded-2xl border border-base-300 bg-base-100 hover:bg-base-200 text-secondary flex items-center justify-center transition-all active:scale-95 shadow-xs"
          >
            <ChevronRightIcon className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Contêiner de Scroll Suave com Snap */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-5 overflow-x-auto pb-6 pt-2 px-1 snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {FEATURED_ITEMS.map(item => (
          <div
            key={item.id}
            className="w-[300px] sm:w-[340px] shrink-0 snap-start flex flex-col rounded-3xl border border-base-300 bg-base-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
          >
            {/* Imagem / Fundo Visual Quente */}
            <div
              className={`relative h-44 bg-gradient-to-br ${item.accentBg} p-5 flex flex-col justify-between overflow-hidden`}
            >
              {/* Textura sutil */}
              <div className="absolute inset-0 bg-black/20 pointer-events-none" />

              {/* Tags superiores */}
              <div className="relative z-10 flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-xs font-bold border border-white/15">
                  <CategoryIcon iconKey={item.categoryKey} className="w-3.5 h-3.5" />
                  <span>{item.categoryLabel}</span>
                </span>

                <span className="text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary text-primary-content shadow-xs">
                  {item.highlightTag}
                </span>
              </div>

              {/* Ícone de Destaque da Categoria */}
              <div className="relative z-10 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-white/90 text-xs font-semibold">
                    <MapPinIcon className="w-3.5 h-3.5" />
                    <span>{item.neighborhood}</span>
                  </div>
                  <h3 className="text-xl font-serif font-black text-white leading-tight mt-0.5 group-hover:text-amber-200 transition-colors">
                    {item.establishment}
                  </h3>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center">
                  <CategoryIcon iconKey={item.categoryKey} className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Corpo do Card */}
            <div className="p-5 flex flex-col justify-between grow space-y-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <VerifiedBadge compact />
                  <span className="text-xs text-secondary font-bold opacity-70">Balcão Oficial</span>
                </div>

                <h4 className="text-base font-bold text-secondary leading-snug">{item.title}</h4>

                {/* Destaque do Chorinho */}
                <div className="mt-3 p-3 rounded-2xl bg-base-200/70 border border-base-300">
                  <div className="flex items-center justify-between text-xs font-bold text-primary mb-1">
                    <span className="flex items-center gap-1">
                      <SparklesIcon className="w-3.5 h-3.5 text-accent" />O Chorinho da Casa:
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-accent/20 text-accent font-extrabold text-[11px]">
                      {item.stampsNeeded} carimbos
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-secondary leading-relaxed">{item.reward}</p>
                </div>
              </div>

              {/* Botão de Ação */}
              <Link
                href={item.link}
                className="btn btn-outline btn-primary rounded-2xl w-full font-bold text-xs gap-2 group-hover:btn-primary group-hover:text-primary-content transition-all"
              >
                <TicketIcon className="w-4 h-4" />
                <span>Ver Balcão & Carimbar</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Indicadores de Posição (Bolinhas) */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        {FEATURED_ITEMS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              if (!scrollRef.current) return;
              scrollRef.current.scrollTo({ left: i * 340, behavior: "smooth" });
            }}
            aria-label={`Ir para o slide ${i + 1}`}
            className={`h-2 rounded-full transition-all duration-200 ${
              activeIndex === i ? "w-7 bg-primary" : "w-2 bg-base-300 hover:bg-base-content/30"
            }`}
          />
        ))}
      </div>
    </section>
  );
};
