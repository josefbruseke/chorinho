"use client";

import React from "react";
import Link from "next/link";
import { BrandLogo } from "~~/components/BrandLogo";
import { SwitchTheme } from "~~/components/SwitchTheme";

/**
 * Rodapé do site institucional.
 *
 * A barra fixa de baixo já abrigou torneira de ETH, preço da moeda nativa e
 * atalho para o explorador de blocos. Sobrou o seletor de tema — e como ele
 * agora está sozinho, fica preso à direita em vez de dividir a linha.
 */
export const Footer = () => (
  <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
    <div className="fixed flex justify-end items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
      <SwitchTheme className="pointer-events-auto" />
    </div>
    <div className="w-full max-w-5xl mx-auto px-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm border-t border-base-300 pt-6">
        <div className="flex items-center gap-2.5">
          <BrandLogo className="w-6 h-6" />
          <div className="flex flex-col">
            <span className="font-extrabold tracking-tight">Chorinho</span>
            <span className="text-[11px] opacity-75">Aquele agrado que só o comércio de bairro sabe dar</span>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/cadastro"
            className="flex items-center min-h-12 px-3 rounded-xl font-semibold hover:bg-base-200 hover:text-brand-ink transition-colors"
          >
            Cadastrar meu estabelecimento
          </Link>
        </div>
      </div>
    </div>
  </div>
);
