"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BanknotesIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  DevicePhoneMobileIcon,
  GiftIcon,
  ScaleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { ContaDoUsuario } from "~~/components/ContaDoUsuario";

const ITENS = [
  { href: "/painel", label: "Visão geral", Icon: ChartBarIcon },
  { href: "/painel/loja", label: "Minha loja", Icon: BuildingStorefrontIcon },
  { href: "/painel/regras", label: "Regra de carimbo", Icon: ScaleIcon },
  { href: "/painel/recompensas", label: "Recompensas", Icon: GiftIcon },
  { href: "/painel/pdv", label: "Terminais", Icon: DevicePhoneMobileIcon },
  { href: "/painel/auditoria", label: "Auditoria", Icon: ClipboardDocumentCheckIcon },
  { href: "/painel/equipe", label: "Equipe", Icon: UsersIcon },
  { href: "/painel/assinatura", label: "Assinatura", Icon: BanknotesIcon },
];

export const PainelNav = () => {
  const pathname = usePathname();

  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/painel" className="flex items-center gap-2.5 group shrink-0">
            <BrandLogo className="w-8 h-8 group-hover:scale-105 transition-transform" />
            <span className="font-black tracking-tight">
              Chorinho <span className="font-medium text-base-content/60">Lojista</span>
            </span>
          </Link>
          <ContaDoUsuario entrarEm="/entrar?proximo=/painel" />
        </div>

        {/* Rola na horizontal no celular em vez de quebrar em duas linhas.
            Cada aba tem 48px de altura mínima — é o painel que o lojista
            toca com o polegar atrás do balcão, entre um cliente e outro. */}
        <nav aria-label="Painel do lojista" className="-mx-4 px-4 overflow-x-auto">
          <ul className="flex gap-1.5 pb-2.5 w-max min-w-full">
            {ITENS.map(({ href, label, Icon }) => {
              const ativo = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-2 px-4 min-h-12 rounded-2xl text-sm whitespace-nowrap transition-colors ${
                      ativo
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-base-content/70 font-semibold hover:bg-base-200 hover:text-base-content"
                    }`}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};
