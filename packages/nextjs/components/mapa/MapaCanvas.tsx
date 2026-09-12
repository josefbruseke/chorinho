"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import L from "leaflet";
// O CSS do Leaflet entra aqui, e não no globals.css, para só pesar nas rotas
// que realmente mostram mapa.
import "leaflet/dist/leaflet.css";
import { renderToStaticMarkup } from "react-dom/server";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { MapPinIcon } from "@heroicons/react/24/solid";
import { CategoryIcon } from "~~/components/vitrine/CategoryIcon";
import { supabaseBrowser, supabaseConfigurado } from "~~/services/database/browser";
import type { EstabelecimentoNoMapa } from "~~/services/database/types";
import { categoryInfo } from "~~/utils/vitrine";

/** Centro padrão quando não há última posição nem permissão de localização.
    Não é o centro da cidade, e sim o centro do conjunto de comércios: eles vão
    do Sapiens Parque, no norte da ilha, ao Campeche, no sul — 27,7 km de ponta
    a ponta. Centrado na Praça XV o mapa nasceria com dois terços deles fora da
    tela. */
const CENTRO_PADRAO: [number, number] = [-27.5541, -48.5152];

/** Zoom inicial. 11 é o primeiro que cabe os 27,7 km também no celular: numa
    tela de 460px de altura ele mostra 31 km, enquanto o 12 mostra só 15,6. */
const ZOOM_PADRAO = 11;
const CHAVE_ULTIMO_CENTRO = "chorinho:mapa:centro";

const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Marcador no estilo do design system. `divIcon` em vez de `L.Icon.Default`
 * evita o 404 clássico dos ícones do Leaflet e deixa o pino seguir a paleta.
 */
const pino = (categoria: number, destaque: boolean) => {
  const info = categoryInfo(categoria);
  return L.divIcon({
    className: "",
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42],
    html: renderToStaticMarkup(
      <span
        className={`flex items-center justify-center w-9.5 h-9.5 rounded-full border-2 shadow-md ${
          destaque
            ? "bg-accent border-accent-content/20 text-accent-content"
            : "bg-primary border-white/70 text-primary-content"
        }`}
      >
        <CategoryIcon iconKey={info.iconKey} className="w-5 h-5" />
      </span>,
    ),
  });
};

/** Última posição do mapa, guardada só neste aparelho. */
const lerUltimoCentro = (): [number, number] => {
  try {
    const salvo = localStorage.getItem(CHAVE_ULTIMO_CENTRO);
    if (salvo) {
      const [lat, lng] = JSON.parse(salvo);
      if (typeof lat === "number" && typeof lng === "number") return [lat, lng];
    }
  } catch {
    // navegador anônimo ou storage bloqueado: cai no padrão
  }
  return CENTRO_PADRAO;
};

/**
 * Carrega os estabelecimentos na montagem e a cada vez que o usuário para de
 * arrastar. A carga inicial é obrigatória: `moveend` não dispara sozinho, então
 * sem ela o mapa abre vazio até alguém mexer.
 */
const CarregarLocais = ({ aoMudar }: { aoMudar: (b: L.LatLngBounds) => void }) => {
  const mapa = useMapEvents({
    moveend: () => aoMudar(mapa.getBounds()),
  });

  useEffect(() => {
    // whenReady garante que o container já tem tamanho — getBounds() antes
    // disso devolve um retângulo degenerado e a consulta volta vazia.
    mapa.whenReady(() => aoMudar(mapa.getBounds()));
  }, [mapa, aoMudar]);

  return null;
};

/** Guarda o último centro para o mapa reabrir no lugar certo — só no aparelho. */
const LembrarCentro = () => {
  const mapa = useMapEvents({
    moveend: () => {
      try {
        const c = mapa.getCenter();
        localStorage.setItem(CHAVE_ULTIMO_CENTRO, JSON.stringify([c.lat, c.lng]));
      } catch {
        // navegador anônimo ou storage bloqueado: seguir sem lembrar
      }
    },
  });
  return null;
};

const IrPara = ({ centro }: { centro: [number, number] | null }) => {
  const mapa = useMap();
  useEffect(() => {
    if (centro) mapa.flyTo(centro, 15, { duration: 0.8 });
  }, [centro, mapa]);
  return null;
};

export type MapaCanvasProps = {
  className?: string;
  /** Centraliza aqui quando o usuário aceita compartilhar a localização. */
  centroSolicitado?: [number, number] | null;
  aoCarregar?: (quantidade: number) => void;
};

export const MapaCanvas = ({ className = "", centroSolicitado = null, aoCarregar }: MapaCanvasProps) => {
  const [locais, setLocais] = useState<EstabelecimentoNoMapa[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Inicializador preguiçoso em vez de useMemo: o React Compiler não consegue
  // preservar memoização de bloco com try/catch, e aqui basta rodar uma vez.
  const [centroInicial] = useState<[number, number]>(lerUltimoCentro);

  const buscar = useCallback(
    async (bounds: L.LatLngBounds) => {
      if (!supabaseConfigurado()) {
        setErro("Supabase não configurado");
        return;
      }
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const { data, error } = await supabaseBrowser().rpc("establishments_in_bounds", {
        min_lat: sw.lat,
        min_lng: sw.lng,
        max_lat: ne.lat,
        max_lng: ne.lng,
      });
      if (error) {
        setErro(error.message);
        return;
      }
      setErro(null);
      setLocais(data ?? []);
      aoCarregar?.(data?.length ?? 0);
    },
    [aoCarregar],
  );

  return (
    <div className={`relative ${className}`}>
      <MapContainer
        center={centroInicial}
        zoom={ZOOM_PADRAO}
        scrollWheelZoom
        className="w-full h-full rounded-box z-0"
        // O Leaflet precisa saber o tamanho na montagem; sem altura explícita no
        // container pai o mapa nasce com 0px e fica cinza.
        style={{ minHeight: "100%" }}
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} maxZoom={19} />
        <CarregarLocais aoMudar={buscar} />
        <LembrarCentro />
        <IrPara centro={centroSolicitado} />

        {locais.map(local => (
          <Marker key={local.id} position={[local.lat_out, local.lng_out]} icon={pino(local.category, local.featured)}>
            <Popup>
              <div className="flex flex-col gap-1 min-w-44">
                <strong className="font-serif text-base font-black leading-tight">{local.name}</strong>
                <span className="text-xs opacity-70 flex items-center gap-1">
                  <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                  {local.neighborhood ?? local.city}
                </span>
                {local.description && <p className="m-0 text-xs opacity-80">{local.description}</p>}
                {/* Balão do Leaflet é compacto por natureza, mas o link ainda ganha uma área de
                    toque generosa em vez do texto pequeno "cru" que existia antes. */}
                <Link
                  href={`/local/${local.slug}`}
                  className="mt-1 block rounded-lg bg-primary/10 px-3 py-2 text-center text-sm font-bold text-brand-ink no-underline"
                >
                  Ver o local
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {erro && (
        <p className="absolute bottom-3 left-3 right-3 m-0 text-xs bg-error/10 text-error border border-error/30 rounded-field px-3 py-2">
          Não deu para carregar os comércios: {erro}
        </p>
      )}
    </div>
  );
};

export default MapaCanvas;
