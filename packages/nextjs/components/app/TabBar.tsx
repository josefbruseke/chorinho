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
 *
 * O passe fica no centro, elevado, porque é a ação que se faz de pé no balcão
 * com uma mão só — e é a única que tem hora marcada.
 *
 * Cada alvo tem 56px de altura e ocupa a largura inteira da célula: o dedo de
 * quem está com uma sacola na outra mão não acerta alvo de 32px. A aba ativa
 * ganha fundo, não só cor — diferença de cor sozinha some sob sol no balcão e
 * desaparece para quem não distingue bem vermelho e cinza.
 */
export const TabBar = () => {
  const pathname = usePathname();
  const ativo = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const noPasse = pathname === "/passe";

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky bottom-0 z-40 border-t border-base-300 bg-base-100/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5 items-end px-1">
        {ABAS.slice(0, 2).map(aba => (
          <ItemAba key={aba.href} aba={aba} ativo={ativo(aba.href)} />
        ))}

        <li className="flex justify-center">
          <Link
            href="/passe"
            aria-label="Meu passe"
            aria-current={noPasse ? "page" : undefined}
            className="group -mt-6 flex flex-col items-center gap-1 px-3 pb-2"
          >
            <span
              className={`flex h-15 w-15 items-center justify-center rounded-2xl border-4 border-base-100 shadow-lg transition-transform group-active:scale-95 ${
                noPasse ? "bg-secondary text-secondary-content" : "bg-primary text-primary-content"
              }`}
            >
              <QrCodeIcon className="h-7 w-7 stroke-[2.2]" />
            </span>
            <span className="text-[11px] font-black text-primary">Passe</span>
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
        className={`mx-0.5 my-1 flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl transition-colors ${
          ativo ? "bg-primary/12 text-primary" : "text-base-content/60 active:bg-base-200"
        }`}
      >
        <Icone className="h-6.5 w-6.5" />
        <span className={`text-[11px] leading-none ${ativo ? "font-black" : "font-semibold"}`}>{aba.label}</span>
      </Link>
    </li>
  );
};
