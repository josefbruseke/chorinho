import React from "react";
import Link from "next/link";
import { useFetchNativeCurrencyPrice } from "@scaffold-ui/hooks";
import { hardhat } from "viem/chains";
import { CurrencyDollarIcon, HeartIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { SwitchTheme } from "~~/components/SwitchTheme";
import { Faucet } from "~~/components/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/**
 * Site footer
 */
export const Footer = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;
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
          </div>
          <SwitchTheme className={`pointer-events-auto ${isLocalNetwork ? "self-end md:self-auto" : ""}`} />
        </div>
      </div>
      <div className="w-full max-w-5xl mx-auto px-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm border-t border-base-300 pt-5">
          <div className="flex items-center gap-2">
            <BrandLogo className="w-6 h-6" />
            <span className="font-bold">Floripa em Dobro</span>
          </div>
          <p className="m-0 flex items-center gap-1 opacity-70">
            Feito com <HeartIcon className="inline-block h-4 w-4" /> em Florianópolis
          </p>
          <Link href="/parceiro" className="link font-semibold">
            Quero cadastrar meu restaurante
          </Link>
        </div>
      </div>
    </div>
  );
};
