"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hardhat } from "viem/chains";
import { Bars3Icon, BugAntIcon, BuildingStorefrontIcon, QrCodeIcon, TicketIcon } from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { FaucetButton, RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useOutsideClick, useTargetNetwork } from "~~/hooks/scaffold-eth";

type HeaderMenuLink = {
  label: string;
  href: string;
  icon?: React.ReactNode;
  localOnly?: boolean;
};

export const menuLinks: HeaderMenuLink[] = [
  {
    label: "Explorar Locais",
    href: "/",
    icon: <BuildingStorefrontIcon className="h-4 w-4" />,
  },
  {
    label: "Meus Passes & Carimbos",
    href: "/meus-cupons",
    icon: <TicketIcon className="h-4 w-4" />,
  },
  {
    label: "Área do Lojista",
    href: "/parceiro",
    icon: <QrCodeIcon className="h-4 w-4" />,
  },
  {
    label: "Debug Contracts",
    href: "/debug",
    icon: <BugAntIcon className="h-4 w-4" />,
    localOnly: true,
  },
];

export const HeaderMenuLinks = () => {
  const pathname = usePathname();
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  return (
    <>
      {menuLinks
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
                    ? "bg-primary/10 text-primary font-bold border border-primary/20"
                    : "text-base-content/80 hover:bg-base-200 hover:text-base-content border border-transparent"
                } rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-medium gap-2 flex items-center whitespace-nowrap transition-all`}
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
export const Header = () => {
  const { targetNetwork } = useTargetNetwork();
  const isLocalNetwork = targetNetwork.id === hardhat.id;

  const burgerMenuRef = useRef<HTMLDetailsElement>(null);
  useOutsideClick(burgerMenuRef, () => {
    burgerMenuRef?.current?.removeAttribute("open");
  });

  return (
    <div className="sticky lg:static top-0 navbar bg-base-100/90 backdrop-blur-sm min-h-16 shrink-0 justify-between z-20 border-b border-base-300 px-3 sm:px-6">
      <div className="navbar-start w-auto self-stretch items-center">
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
            <HeaderMenuLinks />
          </ul>
        </details>
        <Link href="/" passHref className="flex items-center gap-2.5 mx-2 lg:mr-8 shrink-0 group">
          <BrandLogo className="w-9 h-9 group-hover:scale-105 transition-transform" />
          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg tracking-tight">Chorinho</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                do bairro
              </span>
            </div>
            <span className="text-[11px] opacity-65 hidden sm:block">O agrado do seu comércio local</span>
          </div>
        </Link>
        <ul className="hidden lg:flex lg:flex-nowrap items-center gap-1.5 m-0 p-0 list-none">
          <HeaderMenuLinks />
        </ul>
      </div>
      <div className="navbar-end grow mr-2">
        <RainbowKitCustomConnectButton />
        {isLocalNetwork && <FaucetButton />}
      </div>
    </div>
  );
};
