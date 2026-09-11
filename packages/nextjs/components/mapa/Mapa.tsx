"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { MapPinIcon, XMarkIcon } from "@heroicons/react/24/outline";

// `ssr: false` não é permitido dentro de um Server Component no App Router —
// por isso o dynamic mora aqui, num componente de cliente, e a página server
// renderiza este wrapper. O Leaflet toca em `window` na importação.
const MapaCanvas = dynamic(() => import("./MapaCanvas").then(m => m.MapaCanvas), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-box bg-base-300/40 flex items-center justify-center">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  ),
});

/**
 * Mapa com pedido de localização educado.
 *
 * O prompt do navegador NUNCA dispara sozinho: primeiro explicamos por que
 * queremos a posição, e só o clique do usuário aciona o diálogo do sistema.
 * Recusa aqui não é permanente — o usuário nem chegou a ver o diálogo nativo,
 * então pode mudar de ideia depois sem mexer em configuração do navegador.
 */
export const Mapa = ({ className = "" }: { className?: string }) => {
  const [centro, setCentro] = useState<[number, number] | null>(null);
  const [convite, setConvite] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [recusado, setRecusado] = useState(false);

  const pedirLocalizacao = () => {
    setBuscando(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCentro([pos.coords.latitude, pos.coords.longitude]);
        setConvite(false);
        setBuscando(false);
      },
      () => {
        setRecusado(true);
        setConvite(false);
        setBuscando(false);
      },
      // Precisão de bairro basta e é bem mais rápida que GPS fino — além de
      // gastar muito menos bateria.
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 8_000 },
    );
  };

  return (
    <div className={`relative ${className}`}>
      <MapaCanvas className="w-full h-full" centroSolicitado={centro} />

      {convite && (
        <div className="absolute inset-x-3 bottom-3 z-10 rounded-box border border-base-300 bg-base-100/95 backdrop-blur-md p-4 shadow-lg flex flex-col gap-2.5 sm:max-w-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <MapPinIcon className="w-5 h-5" />
              </span>
              <div>
                <strong className="font-serif font-extrabold text-secondary block leading-tight">
                  Ver os comércios perto de você?
                </strong>
                <span className="text-xs opacity-75 leading-snug block mt-0.5">
                  Usamos sua localização só para ordenar o mapa. Nada fica salvo nos nossos servidores.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setConvite(false)}
              aria-label="Agora não"
              className="btn btn-ghost btn-xs btn-circle shrink-0"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={pedirLocalizacao}
              disabled={buscando}
              className="btn btn-primary btn-sm rounded-xl font-bold flex-1"
            >
              {buscando ? <span className="loading loading-spinner loading-xs" /> : "Usar minha localização"}
            </button>
            <button type="button" onClick={() => setConvite(false)} className="btn btn-ghost btn-sm rounded-xl">
              Agora não
            </button>
          </div>
        </div>
      )}

      {recusado && (
        <p className="absolute inset-x-3 bottom-3 z-10 m-0 rounded-box border border-base-300 bg-base-100/95 backdrop-blur-md px-4 py-3 text-xs shadow-lg sm:max-w-sm">
          Tudo bem — arraste o mapa até o seu bairro. O Chorinho funciona inteiro sem localização.
        </p>
      )}
    </div>
  );
};
