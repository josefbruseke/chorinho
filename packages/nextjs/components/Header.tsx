"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import {
  Bars3Icon,
  BugAntIcon,
  BuildingStorefrontIcon,
  LifebuoyIcon,
  LightBulbIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { ContaDoUsuario } from "~~/components/ContaDoUsuario";
import { FaucetButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";
import { emDesenvolvimento } from "~~/utils/desenvolvimento";
import { INICIO_DO_APP } from "~~/utils/rotas";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  localOnly?: boolean;
};

/** Navegação do site institucional — o flavor público. */
export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Como funciona",
    href: "/como-funciona",
    icon: <LightBulbIcon className="h-4 w-4" />,
  },
  {
    label: "Para comerciantes",
    href: "/para-comerciantes",
    icon: <BuildingStorefrontIcon className="h-4 w-4" />,
  },
  {
    label: "Ajuda",
    href: "/ajuda",
    icon: <LifebuoyIcon className="h-4 w-4" />,
  },
  {
    label: "Abrir o app",
    href: INICIO_DO_APP,
    icon: <Squares2X2Icon className="h-4 w-4" />,
  },
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
    localOnly: true,
  },
];

export const HeaderMenuLinks = ({ links = menuLinks }: { links?: HeaderMenuLink[] }) => {
  const pathname = usePathname();
  const { targetNetwork } = useTargetNetwork();
  // Ferramenta de desenvolvimento nao depende da rede alvo: um deploy
  // apontado para o anvil por engano nao pode publicar torneira de ETH e link
  // de explorador de blocos para o mundo.
  const isLocalNetwork = emDesenvolvimento() && targetNetwork.id === hardhat.id;

  return (
    <>
      {links
        .filter(({ localOnly }) => !localOnly || isLocalNetwork)
        .map(({ label, href, icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                passHref
                className={`${
                  isActive
                    ? "bg-primary/10 text-brand-ink font-bold border border-primary/20"
                    : "text-base-content/80 hover:bg-base-200 hover:text-base-content border border-transparent"
                } rounded-xl px-4 min-h-12 text-sm font-semibold gap-2 flex items-center whitespace-nowrap transition-all`}
              >
                {icon}
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
    </>
  );
};

/**
 * Site header
 */
export const Header = ({ links = menuLinks, homeHref = "/" }: { links?: HeaderMenuLink[]; homeHref?: string }) => {
  const { targetNetwork } = useTargetNetwork();
  // Ferramenta de desenvolvimento nao depende da rede alvo: um deploy
  // apontado para o anvil por engano nao pode publicar torneira de ETH e link
  // de explorador de blocos para o mundo.
  const isLocalNetwork = emDesenvolvimento() && targetNetwork.id === hardhat.id;

  // O flavor do cliente passa `links` vazio: a navegacao dele mora na TabBar
  // de baixo. Sem isto o sanduiche continuaria no lugar, abrindo uma gaveta
  // sem nada dentro.
  const linksVisiveis = links.filter(({ localOnly }) => !localOnly || isLocalNetwork);

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100/90 backdrop-blur-sm min-h-16 shrink-0 justify-between z-20 border-b border-base-300 px-3 sm:px-6">
      <div className="navbar-start w-auto self-stretch items-center">
        {linksVisiveis.length > 0 && (
          <details className="dropdown" ref={burgerMenuRef}>
            <summary className="ml-1 btn btn-ghost lg:hidden hover:bg-transparent">
              <Bars3Icon className="h-1/2" />
            </summary>
            <ul
              className="menu menu-compact dropdown-content mt-3 p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-60 gap-1"
              onClick={() => {
                burgerMenuRef?.current?.removeAttribute("open");
              }}
            >
              <HeaderMenuLinks links={links} />
            </ul>
          </details>
        )}
        <Link href={homeHref} passHref className="flex items-center min-h-12 gap-2.5 mx-2 lg:mr-8 shrink-0 group">
          <BrandLogo className="w-9 h-9 group-hover:scale-105 transition-transform" />
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight">Chorinho</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-brand-ink">
                do bairro
              </span>
            </div>
            <span className="text-[11px] opacity-75 hidden sm:block">O agrado do seu comércio local</span>
          </div>
        </Link>
        {linksVisiveis.length > 0 && (
          <ul className="hidden lg:flex lg:flex-nowrap items-center gap-1.5 m-0 p-0 list-none">
            <HeaderMenuLinks links={links} />
          </ul>
        )}
      </div>
      <div className="navbar-end grow mr-2">
        {/* Aqui ninguem conecta carteira: a conta e e-mail ou Google, e a
            carteira nasce junto, invisivel. O botao do boilerplate so
            confundiria quem chega pela primeira vez. */}
        <ContaDoUsuario />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
