"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GiftIcon, MapIcon, QrCodeIcon, TicketIcon, UserIcon } from "@heroicons/react/24/outline";
import {
  GiftIcon as GiftSolid,
  MapIcon as MapSolid,
  TicketIcon as TicketSolid,
  UserIcon as UserSolid,
} from "@heroicons/react/24/solid";

type Aba = {
  href: string;
  label: string;
  Icon: typeof MapIcon;
  IconAtivo: typeof MapIcon;
};

const ABAS: Aba[] = [
  { href: "/mapa", label: "Mapa", Icon: MapIcon, IconAtivo: MapSolid },
  { href: "/carteira", label: "Carteira", Icon: TicketIcon, IconAtivo: TicketSolid },
  { href: "/recompensas", label: "Prêmios", Icon: GiftIcon, IconAtivo: GiftSolid },
  { href: "/perfil", label: "Perfil", Icon: UserIcon, IconAtivo: UserSolid },
];

/**
 * Navegação principal do cliente: barra inferior, ao alcance do polegar.
 * O passe fica no centro, elevado, porque é a ação que se faz de pé no balcão
 * com uma mão só — e é a única que tem hora marcada.
 */
export const TabBar = () => {
  const pathname = usePathname();
  const ativo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-40 border-t border-base-300 bg-base-100/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5 items-end max-w-lg mx-auto">
        {ABAS.slice(0, 2).map(aba => (
          <ItemAba key={aba.href} aba={aba} ativo={ativo(aba.href)} />
        ))}

        <li className="flex justify-center">
          <Link
            href="/passe"
            aria-label="Meu passe"
            className="flex flex-col items-center gap-1 -mt-5 px-3 pb-1.5 group"
          >
            <span className="w-13 h-13 rounded-2xl bg-primary text-primary-content flex items-center justify-center shadow-lg border-4 border-base-100 group-active:scale-95 transition-transform">
              <QrCodeIcon className="w-6 h-6 stroke-[2.2]" />
            </span>
            <span className="text-[10px] font-bold text-primary">Passe</span>
          </Link>
        </li>

        {ABAS.slice(2).map(aba => (
          <ItemAba key={aba.href} aba={aba} ativo={ativo(aba.href)} />
        ))}
      </ul>
    </nav>
  );
};

const ItemAba = ({ aba, ativo }: { aba: Aba; ativo: boolean }) => {
  const Icone = ativo ? aba.IconAtivo : aba.Icon;
  return (
    <li>
      <Link
        href={aba.href}
        aria-current={ativo ? "page" : undefined}
        className={`flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
          ativo ? "text-primary" : "text-base-content/55 hover:text-base-content"
        }`}
      >
        <Icone className="w-6 h-6" />
        <span className={`text-[10px] ${ativo ? "font-bold" : "font-medium"}`}>{aba.label}</span>
      </Link>
    </li>
  );
};
