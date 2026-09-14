import Link from "next/link";
import type { NextPage } from "next";
import { ListBulletIcon } from "@heroicons/react/24/outline";
import { Mapa } from "~~/components/mapa/Mapa";
import { getMetadata } from "~~/utils/metadata";
import { INICIO_DO_APP } from "~~/utils/rotas";

export const metadata = getMetadata({
  title: "Mapa",
  description: "Os comércios parceiros perto de você.",
});

/** O mapa, aberto a partir da grade de lugares. Ocupa tudo o que resta da tela. */
const MapaPage: NextPage = () => (
  <div className="flex flex-col flex-1 min-h-0">
    <header className="flex items-center justify-between gap-3 px-4 py-3 shrink-0">
      <div>
        <h1 className="text-2xl font-serif font-black m-0 tracking-tight text-secondary">Perto de você</h1>
        <p className="m-0 text-sm opacity-70">Toque num pino para conhecer o lugar</p>
      </div>
      {/* Alvo de toque de 48px mesmo sendo ação secundária desta tela — o mapa é o protagonista. */}
      <Link
        href={INICIO_DO_APP}
        className="btn btn-ghost h-12 rounded-2xl gap-1.5 shrink-0"
        aria-label="Ver os lugares"
      >
        <ListBulletIcon className="w-5 h-5" />
        <span className="hidden xs:inline">Lugares</span>
      </Link>
    </header>

    <Mapa className="flex-1 min-h-[60vh] mx-4 mb-4 rounded-box overflow-hidden border border-base-300 shadow-sm" />
  </div>
);

export default MapaPage;
