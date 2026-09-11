"use client";

import { useMemo, useState } from "react";
import type { NextPage } from "next";
import {
  BuildingStorefrontIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  QrCodeIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon, SparklesIcon as SparklesSolidIcon } from "@heroicons/react/24/solid";
import { CampaignCard } from "~~/components/vitrine/CampaignCard";
import { CategoryFilter } from "~~/components/vitrine/CategoryFilter";
import { CouponTicket } from "~~/components/vitrine/CouponTicket";
import { CreateProgramModal } from "~~/components/vitrine/CreateProgramModal";
import { CustomerPassModal } from "~~/components/vitrine/CustomerPassModal";
import { FeaturedCarousel } from "~~/components/vitrine/FeaturedCarousel";
import { FlashSection } from "~~/components/vitrine/FlashSection";
import { MerchantTerminal } from "~~/components/vitrine/MerchantTerminal";
import { QuickMintModal } from "~~/components/vitrine/QuickMintModal";
import { VerifiedBadge } from "~~/components/vitrine/VerifiedBadge";
import { useCampaigns } from "~~/hooks/vitrine/useCampaigns";
import { useMyCoupons } from "~~/hooks/vitrine/useMyCoupons";
import { useRedeemedCoupons } from "~~/hooks/vitrine/useRedeemedCoupons";
import { Campaign } from "~~/utils/vitrine";

const HERO_STEPS = [
  {
    step: "01",
    Icon: ShoppingBagIcon,
    title: "Peça no balcão",
    text: "Tome um café, corte o cabelo ou leve seu pão quentinho no comércio do seu bairro.",
  },
  {
    step: "02",
    Icon: QrCodeIcon,
    title: "Carimbe na hora",
    text: "Mostre o código ou QR Code no celular ao pagar e garanta seu carimbo digital instantâneo.",
  },
  {
    step: "03",
    Icon: SparklesIcon,
    title: "Ganhe o chorinho",
    text: "Completou a cartela? Resgate aquele agrado especial que só quem é de casa merece.",
  },
];

const Home: NextPage = () => {
  const { campaigns, isLoading } = useCampaigns();
  const { coupons } = useMyCoupons();
  const { redeemed } = useRedeemedCoupons();

  // App Navigation Tab: "store" | "wallet" | "terminal"
  const [activeTab, setActiveTab] = useState<"store" | "wallet" | "terminal">("store");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [selectedCampaignForMint, setSelectedCampaignForMint] = useState<Campaign | null>(null);
  const [isCreateProgramOpen, setIsCreateProgramOpen] = useState(false);

  // Interactive demo for the hero punch card
  const [demoStamps, setDemoStamps] = useState(3);
  const demoMax = 5;

  const handleDemoStamp = () => {
    if (demoStamps >= demoMax) {
      setDemoStamps(1);
    } else {
      setDemoStamps(prev => prev + 1);
    }
  };

  const visible = useMemo(() => campaigns.filter(c => c.active), [campaigns]);

  const filtered = useMemo(() => {
    return visible.filter(c => {
      const matchCat = selectedCategory === null || c.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = c.metadata?.name?.toLowerCase() ?? "";
      const desc = c.metadata?.description?.toLowerCase() ?? "";
      const establishment = c.metadata?.establishment?.toLowerCase() ?? "";
      const neighborhood = c.metadata?.neighborhood?.toLowerCase() ?? "";

      return (
        name.includes(query) || desc.includes(query) || establishment.includes(query) || neighborhood.includes(query)
      );
    });
  }, [visible, selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col items-center grow w-full pb-16">
      {/* Barra Superior de Modo do Aplicativo (App Navigation Control) */}
      <div className="sticky top-16 z-30 w-full bg-base-100/95 backdrop-blur-md border-b border-base-300 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Seletor de Abas Principais do App */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-base-200 border border-base-300 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab("store")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "store"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-secondary/70 hover:text-secondary"
              }`}
            >
              <BuildingStorefrontIcon className="w-4 h-4" />
              <span>Explorar Balcões</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("wallet")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "wallet"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-secondary/70 hover:text-secondary"
              }`}
            >
              <TicketIcon className="w-4 h-4" />
              <span>Minhas Cartelas</span>
              {coupons.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-md bg-accent text-secondary text-[10px] font-black">
                  {coupons.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("terminal")}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                activeTab === "terminal"
                  ? "bg-primary text-primary-content shadow-xs"
                  : "text-secondary/70 hover:text-secondary"
              }`}
            >
              <QrCodeIcon className="w-4 h-4" />
              <span>Terminal Lojista (PDV)</span>
            </button>
          </div>

          {/* Botão de Criação de Campanha (Para Comerciantes) */}
          <button
            type="button"
            onClick={() => setIsCreateProgramOpen(true)}
            className="btn btn-outline btn-secondary btn-sm rounded-xl font-bold gap-1.5 text-xs self-stretch sm:self-auto"
          >
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            <span>Criar Cartela para Meu Comércio</span>
          </button>
        </div>
      </div>

      {/* ABA 1: VITRINE & EXPLORAÇÃO DE BALCÕES */}
      {activeTab === "store" && (
        <>
          {/* Warm, Visual & Humanist Hero */}
          <section className="w-full bg-gradient-to-b from-base-200 via-base-100 to-base-200 border-b border-base-300 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-primary/10 via-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-5xl mx-auto px-5 pt-10 pb-14 text-center flex flex-col items-center relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-wide mb-6 shadow-xs">
                <SparklesSolidIcon className="w-4 h-4 text-primary" />
                <span>Aquele agrado no final da conta que você só tem no bairro</span>
              </div>

              <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black m-0 tracking-tight max-w-3xl leading-[1.12] text-balance text-secondary">
                O carinho do comércio local, <br className="hidden sm:inline" />
                direto no seu{" "}
                <span className="text-primary italic underline decoration-accent/40 underline-offset-8">celular</span>.
              </h1>

              <p className="text-base sm:text-xl opacity-80 mt-6 mb-0 max-w-2xl text-balance leading-relaxed">
                Sabe aquele chorinho a mais no café, a fatia cortesia de bolo na padaria ou a toalha quente na barba?
                Acumule carimbos digitais no balcão e ganhe recompensas reais nos seus lugares favoritos.
              </p>

              {/* Interactive Hero Stamp Card Showcase */}
              <div className="w-full max-w-xl mt-10 rounded-3xl border-2 border-base-300 bg-gradient-to-br from-base-100 via-kraft to-base-200 p-6 sm:p-7 shadow-md text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base-300/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs border border-primary/20">
                      <BuildingStorefrontIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif font-extrabold text-lg text-secondary">Café do Bairro</span>
                        <VerifiedBadge compact />
                      </div>
                      <span className="text-xs opacity-75 font-medium">
                        A cada 5 cafés no balcão, o 6º vem com pão de queijo quentinho
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleDemoStamp}
                    className="btn btn-primary btn-sm rounded-xl font-bold shadow-xs self-start sm:self-auto gap-1.5 transition-transform active:scale-95"
                  >
                    <SparklesSolidIcon className="w-4 h-4" />
                    <span>{demoStamps >= demoMax ? "Reiniciar Cartela" : "Carimbar Balcão"}</span>
                  </button>
                </div>

                {/* Stamp Slots */}
                <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 my-5">
                  {Array.from({ length: demoMax }).map((_, i) => {
                    const isStamped = i < demoStamps;
                    const isFinalReward = i === demoMax - 1;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                          isStamped
                            ? "border-primary bg-primary text-primary-content shadow-sm scale-105 rotate-[-2deg]"
                            : isFinalReward
                              ? "border-dashed border-accent bg-accent/15 text-accent font-bold animate-pulse"
                              : "border-dashed border-base-300 bg-base-100 text-base-content/40"
                        }`}
                      >
                        {isStamped ? (
                          <CheckIcon className="w-6 h-6 text-primary-content stroke-[3]" />
                        ) : isFinalReward ? (
                          <SparklesSolidIcon className="w-6 h-6 text-accent" />
                        ) : (
                          <span className="text-xs font-bold opacity-50">{i + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reward State Alert */}
                {demoStamps >= demoMax ? (
                  <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 flex items-center gap-3 animate-fade-in">
                    <CheckBadgeIcon className="w-8 h-8 text-primary shrink-0" />
                    <div className="text-xs">
                      <span className="font-serif font-extrabold text-primary block text-sm">
                        Chorinho Desbloqueado!
                      </span>
                      <span className="opacity-80">
                        Pode pedir seu pão de queijo da Canastra cortesia no balcão com um sorriso.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs opacity-75 px-1 font-medium">
                    <span>
                      Faltam <strong>{demoMax - demoStamps}</strong> pedidos para seu agrado cortesia.
                    </span>
                    <span className="font-bold text-primary">Cartela Interativa</span>
                  </div>
                )}
              </div>

              {/* A barra de numeros foi removida: exibia 40+ comercios, 1.840+ carimbos
                  e 980+ vizinhos com valores fixos no codigo, enquanto o numero real e
                  zero. Volta como dado de verdade quando /api/stats existir (M5). */}

              {/* 3 Steps Ribbon */}
              <div className="grid sm:grid-cols-3 gap-4 mt-10 w-full max-w-3xl">
                {HERO_STEPS.map(({ step, Icon, title, text }) => (
                  <div
                    key={title}
                    className="flex flex-col items-start text-left gap-1.5 p-5 rounded-2xl border border-base-300 bg-base-100 shadow-xs hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-mono font-black text-accent">{step}</span>
                    </div>
                    <h3 className="font-serif font-extrabold text-base m-0 text-secondary">{title}</h3>
                    <p className="text-xs opacity-75 m-0 leading-relaxed font-medium">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Featured Carousel Section */}
          <FeaturedCarousel />

          {/* Main Storefront Area */}
          <section className="max-w-6xl w-full mx-auto px-5 py-8 flex flex-col gap-8">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-base-300 pb-6">
              <div className="flex flex-col gap-1">
                <h2 className="text-2xl sm:text-3xl font-serif font-black m-0 tracking-tight flex items-center gap-2.5 text-secondary">
                  <BuildingStorefrontIcon className="h-7 w-7 text-primary" />
                  Lugares & Chorinhos da Casa
                </h2>
                <p className="text-xs sm:text-sm opacity-70 m-0">
                  Descubra os estabelecimentos participantes e garanta seu passe direto no balcão
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    placeholder="Buscar café, padaria, bairro..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input input-bordered input-sm pl-10 w-full sm:w-72 rounded-2xl text-xs bg-base-100 shadow-2xs"
                  />
                </div>
              </div>
            </div>

            {/* Category Pills */}
            <div className="-mt-3">
              <CategoryFilter selected={selectedCategory} onSelect={setSelectedCategory} />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            ) : visible.length === 0 ? (
              <div className="text-center py-20 rounded-3xl border-2 border-dashed border-base-300 p-8 bg-base-100">
                <BuildingStorefrontIcon className="h-12 w-12 mx-auto text-primary opacity-60 mb-2" />
                <p className="text-lg font-serif font-bold m-0 text-secondary">Nenhuma oferta cadastrada no momento.</p>
                <p className="text-sm opacity-60 mt-1 mb-4">
                  Em breve novos estabelecimentos do seu bairro entrarão no programa.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateProgramOpen(true)}
                  className="btn btn-primary btn-sm rounded-xl"
                >
                  Cadastrar meu estabelecimento
                </button>
              </div>
            ) : (
              <>
                <FlashSection campaigns={visible} />

                <section className="w-full flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-wider opacity-60 font-bold">
                      {filtered.length}{" "}
                      {filtered.length === 1 ? "estabelecimento encontrado" : "estabelecimentos encontrados"}
                    </span>
                    {selectedCategory !== null && (
                      <button
                        className="btn btn-ghost btn-xs text-xs rounded-lg"
                        onClick={() => setSelectedCategory(null)}
                      >
                        Limpar filtro
                      </button>
                    )}
                  </div>

                  {filtered.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl border border-base-300 bg-base-100 p-6">
                      <p className="text-base font-bold opacity-70 m-0">Nenhum local encontrado com esses filtros.</p>
                      <button
                        className="btn btn-ghost btn-sm mt-3 rounded-xl"
                        onClick={() => {
                          setSelectedCategory(null);
                          setSearchQuery("");
                        }}
                      >
                        Ver todos os estabelecimentos
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {filtered.map(c => (
                        <CampaignCard
                          key={c.id.toString()}
                          campaign={c}
                          onQuickJoin={campaign => setSelectedCampaignForMint(campaign)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}
          </section>
        </>
      )}

      {/* ABA 2: MINHAS CARTELAS & CARTEIRA DE FIDELIDADE */}
      {activeTab === "wallet" && (
        <section className="max-w-5xl w-full mx-auto px-5 py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-5">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-primary">Minha Carteira</span>
              <h2 className="text-3xl font-serif font-black text-secondary m-0">
                Minhas Cartelas & Recompensas Ativas
              </h2>
              <p className="text-sm opacity-75 mt-1 mb-0">
                Toque numa cartela para abrir o QR code e apresentar no balcão ao atendente.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("store")}
              className="btn btn-primary btn-sm rounded-xl font-bold self-start sm:self-auto gap-1.5"
            >
              <PlusIcon className="w-4 h-4 stroke-[2.5]" />
              <span>Adicionar Mais Balcões</span>
            </button>
          </div>

          {coupons.length === 0 ? (
            <div className="text-center py-16 p-8 rounded-3xl border-2 border-dashed border-base-300 bg-base-100 space-y-3">
              <TicketIcon className="w-12 h-12 text-primary/60 mx-auto" />
              <h3 className="font-serif font-bold text-xl text-secondary m-0">Você ainda não possui cartelas ativas</h3>
              <p className="text-xs text-secondary/70 max-w-sm mx-auto">
                Explore os comércios do seu bairro e garanta seu passe para começar a acumular carimbos.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("store")}
                className="btn btn-primary rounded-2xl font-bold btn-sm mt-2"
              >
                Explorar Locais do Bairro
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {coupons.map(({ campaign, balance }) => (
                <div
                  key={campaign.id.toString()}
                  className="cursor-pointer transition-transform hover:-translate-y-1"
                  onClick={() => setSelectedCampaignForMint(campaign)}
                >
                  <CouponTicket campaign={campaign} quantity={balance} status="valid" />
                </div>
              ))}
            </div>
          )}

          {redeemed.length > 0 && (
            <div className="pt-6 border-t border-base-300 space-y-3">
              <h3 className="font-serif font-extrabold text-xl text-secondary m-0">
                Chorinhos Já Resgatados no Balcão
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {redeemed.map(({ campaign, amount }) => (
                  <CouponTicket key={campaign.id.toString()} campaign={campaign} quantity={amount} status="used" />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ABA 3: TERMINAL DO BALCÃO (CAIXA / PDV) */}
      {activeTab === "terminal" && <MerchantTerminal />}

      {/* Modal Rápido de Aquisição de Cartela */}
      <QuickMintModal campaign={selectedCampaignForMint} onClose={() => setSelectedCampaignForMint(null)} />

      {/* Modal de Criação de Novo Programa (Para Lojistas) */}
      <CreateProgramModal isOpen={isCreateProgramOpen} onClose={() => setIsCreateProgramOpen(false)} />

      {/* Botão Flutuante Permanente: Meu Passe de Balcão (QR Code) */}
      <CustomerPassModal />
    </div>
  );
};

export default Home;
