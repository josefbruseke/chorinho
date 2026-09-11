"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  SignalIcon,
  SparklesIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { BrandLogo } from "~~/components/BrandLogo";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

const ITENS = [
  { href: "/admin", label: "Visão geral", Icon: Squares2X2Icon },
  { href: "/admin/estabelecimentos", label: "Estabelecimentos", Icon: BuildingStorefrontIcon },
  { href: "/admin/pontos", label: "Tipos de ponto", Icon: SparklesIcon },
  { href: "/admin/conteudo", label: "Conteúdo", Icon: DocumentTextIcon },
  { href: "/admin/relayer", label: "Relayer", Icon: SignalIcon },
  { href: "/admin/auditoria", label: "Auditoria", Icon: ClipboardDocumentListIcon },
];

export const AdminNav = () => {
  const pathname = usePathname();

  return (
    <header className="border-b border-base-300 bg-base-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/admin" className="flex items-center gap-2.5 group shrink-0">
            <BrandLogo className="w-8 h-8 group-hover:scale-105 transition-transform" />
            <span className="font-black tracking-tight">
              Chorinho <span className="font-medium text-base-content/60">Plataforma</span>
            </span>
          </Link>
          <RainbowKitCustomConnectButton />
        </div>

        <nav aria-label="Administração" className="-mx-4 px-4 overflow-x-auto">
          <ul className="flex gap-1 pb-2 w-max min-w-full">
            {ITENS.map(({ href, label, Icon }) => {
              const ativo = pathname === href;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-field text-sm whitespace-nowrap transition-colors ${
                      ativo
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-base-content/70 hover:bg-base-200 hover:text-base-content"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
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
