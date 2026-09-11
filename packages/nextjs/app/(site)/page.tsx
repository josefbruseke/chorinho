"use client";

import { useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CheckIcon,
  MapIcon,
  QrCodeIcon,
  ShoppingBagIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { CheckBadgeIcon, SparklesIcon as SparklesSolidIcon } from "@heroicons/react/24/solid";
import { FeaturedCarousel } from "~~/components/vitrine/FeaturedCarousel";
import { VerifiedBadge } from "~~/components/vitrine/VerifiedBadge";

const PASSOS = [
  {
    passo: "01",
    Icon: ShoppingBagIcon,
    titulo: "Peça no balcão",
    texto: "Tome um café, corte o cabelo ou leve seu pão quentinho no comércio do seu bairro.",
  },
  {
    passo: "02",
    Icon: QrCodeIcon,
    titulo: "Carimbe na hora",
    texto: "Mostre o código ou QR Code no celular ao pagar e garanta seu carimbo digital instantâneo.",
  },
  {
    passo: "03",
    Icon: SparklesIcon,
    titulo: "Ganhe o chorinho",
    texto: "Completou a cartela? Resgate aquele agrado especial que só quem é de casa merece.",
  },
];

const CARTELA_DEMO = 5;

const Landing: NextPage = () => {
  const [carimbos, setCarimbos] = useState(3);
  const completa = carimbos >= CARTELA_DEMO;

  const carimbar = () => setCarimbos(atual => (atual >= CARTELA_DEMO ? 1 : atual + 1));

  return (
    <div className="flex flex-col items-center grow w-full">
      <section className="w-full bg-gradient-to-b from-base-200 via-base-100 to-base-200 border-b border-base-300 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] max-w-full bg-gradient-to-b from-primary/10 via-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />

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

          <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto">
            <Link href="/mapa" className="btn btn-primary rounded-2xl font-bold gap-2 shadow-sm">
              <MapIcon className="w-5 h-5" />
              Ver comércios perto de mim
            </Link>
            <Link href="/para-comerciantes" className="btn btn-ghost rounded-2xl font-bold gap-2">
              Tenho um comércio
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {/* Cartela interativa: deixa o visitante sentir a mecânica antes de entrar */}
          <div className="w-full max-w-xl mt-10 rounded-3xl border-2 border-base-300 bg-gradient-to-br from-base-100 via-kraft to-base-200 p-6 sm:p-7 shadow-md text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base-300/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-xs border border-primary/20 shrink-0">
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
                onClick={carimbar}
                className="btn btn-primary btn-sm rounded-xl font-bold shadow-xs self-start sm:self-auto gap-1.5 transition-transform active:scale-95"
              >
                <SparklesSolidIcon className="w-4 h-4" />
                <span>{completa ? "Reiniciar cartela" : "Carimbar balcão"}</span>
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2.5 sm:gap-3.5 my-5">
              {Array.from({ length: CARTELA_DEMO }).map((_, i) => {
                const carimbado = i < carimbos;
                const premio = i === CARTELA_DEMO - 1;
                return (
                  <div
                    key={i}
                    className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${
                      carimbado
                        ? "border-primary bg-primary text-primary-content shadow-sm scale-105 rotate-[-2deg]"
                        : premio
                          ? "border-dashed border-accent bg-accent/15 text-accent font-bold animate-pulse"
                          : "border-dashed border-base-300 bg-base-100 text-base-content/40"
                    }`}
                  >
                    {carimbado ? (
                      <CheckIcon className="w-6 h-6 text-primary-content stroke-[3]" />
                    ) : premio ? (
                      <SparklesSolidIcon className="w-6 h-6 text-accent" />
                    ) : (
                      <span className="text-xs font-bold opacity-50">{i + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {completa ? (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3.5 flex items-center gap-3 animate-fade-in">
                <CheckBadgeIcon className="w-8 h-8 text-primary shrink-0" />
                <div className="text-xs">
                  <span className="font-serif font-extrabold text-primary block text-sm">Chorinho desbloqueado!</span>
                  <span className="opacity-80">
                    Pode pedir seu pão de queijo da Canastra cortesia no balcão com um sorriso.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs opacity-75 px-1 font-medium">
                <span>
                  Faltam <strong>{CARTELA_DEMO - carimbos}</strong> pedidos para seu agrado cortesia.
                </span>
                <span className="font-bold text-primary">Cartela interativa</span>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-10 w-full max-w-3xl">
            {PASSOS.map(({ passo, Icon, titulo, texto }) => (
              <div
                key={titulo}
                className="flex flex-col items-start text-left gap-1.5 p-5 rounded-2xl border border-base-300 bg-base-100 shadow-xs hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-mono font-black text-accent">{passo}</span>
                </div>
                <h3 className="font-serif font-extrabold text-base m-0 text-secondary">{titulo}</h3>
                <p className="text-xs opacity-75 m-0 leading-relaxed font-medium">{texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FeaturedCarousel />

      <section className="w-full max-w-4xl mx-auto px-5 py-14 text-center">
        <h2 className="text-2xl sm:text-4xl font-serif font-black m-0 text-secondary text-balance">
          O bairro inteiro numa cartela só
        </h2>
        <p className="opacity-80 mt-4 mb-8 max-w-xl mx-auto text-balance leading-relaxed">
          Cada comércio tem a sua cartela, mas os pontos que você junta valem em toda a rede de parceiros da sua cidade.
          É o comércio local se ajudando em vez de competir.
        </p>
        <Link href="/mapa" className="btn btn-primary btn-lg rounded-2xl font-bold gap-2 shadow-sm">
          <MapIcon className="w-5 h-5" />
          Abrir o mapa
        </Link>
      </section>
    </div>
  );
};

export default Landing;
