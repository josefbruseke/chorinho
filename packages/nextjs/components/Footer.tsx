"use client";

import React from "react";
import Link from "next/link";
import { useFetchNativeCurrencyPrice } from "@scaffold-ui/hooks";
import { hardhat } from "viem/chains";
import { CurrencyDollarIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { Faucet } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { emDesenvolvimento } from "~~/utils/desenvolvimento";

/**
 * Site footer
 */
export const Footer = () => {
  const { targetNetwork } = useTargetNetwork();
  // Ferramenta de desenvolvimento nao depende da rede alvo: um deploy
  // apontado para o anvil por engano nao pode publicar torneira de ETH e link
  // de explorador de blocos para o mundo.
  const isLocalNetwork = emDesenvolvimento() && targetNetwork.id === hardhat.id;
  // Em rede publica o atalho util e o explorador dela, nao o nosso. Continua
  // preso a desenvolvimento: no aplicativo do cliente nada disso faz sentido.
  const explorador = targetNetwork.blockExplorers?.default;
  const { price: nativeCurrencyPrice } = useFetchNativeCurrencyPrice();

  return (
    <div className="min-h-0 py-5 px-1 mb-11 lg:mb-0">
      <div>
        <div className="fixed flex justify-between items-center w-full z-10 p-4 bottom-0 left-0 pointer-events-none">
          <div className="flex flex-col md:flex-row gap-2 pointer-events-auto">
            {isLocalNetwork && (
              <>
                {nativeCurrencyPrice > 0 && (
                  <div>
                    <div className="btn btn-primary btn-sm font-normal gap-1 cursor-auto">
                      <CurrencyDollarIcon className="h-4 w-4" />
                      <span>{nativeCurrencyPrice.toFixed(2)}</span>
                    </div>
                  </div>
                )}
                <Faucet />
                <Link href="/blockexplorer" passHref className="btn btn-primary btn-sm font-normal gap-1">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  <span>Block Explorer</span>
                </Link>
              </>
            )}
            {!isLocalNetwork && emDesenvolvimento() && explorador && (
              <a
                href={explorador.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm gap-1 font-normal"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span>{explorador.name}</span>
              </a>
            )}
          </div>
          <SwitchTheme className={`pointer-events-auto ${isLocalNetwork ? "self-end md:self-auto" : ""}`} />
        </div>
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
};
