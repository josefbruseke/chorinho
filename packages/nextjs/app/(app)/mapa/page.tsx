import Link from "next/link";
import type { NextPage } from "next";
import { ListBulletIcon } from "@heroicons/react/24/outline";
import { Mapa } from "~~/components/mapa/Mapa";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Mapa",
  description: "Os comércios parceiros perto de você.",
});

/** Tela principal do cliente. O mapa ocupa tudo; a navegação fica na barra inferior. */
const MapaPage: NextPage = () => (
  <div className="flex flex-col flex-1 min-h-0">
    <header className="flex items-center justify-between gap-3 px-4 py-3 shrink-0">
      <div>
        <h1 className="text-xl font-serif font-black m-0 tracking-tight text-secondary">Perto de você</h1>
        <p className="m-0 text-xs opacity-70">Toque num pino para conhecer o lugar</p>
      </div>
      <Link href="/explorar" className="btn btn-ghost btn-sm rounded-xl gap-1.5" aria-label="Ver em lista">
        <ListBulletIcon className="w-4 h-4" />
        <span className="hidden xs:inline">Lista</span>
      </Link>
    </header>

    <Mapa className="flex-1 min-h-[60vh] mx-4 mb-4 rounded-box overflow-hidden border border-base-300 shadow-sm" />
  </div>
);

export default MapaPage;
