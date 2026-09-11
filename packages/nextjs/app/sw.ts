import { defaultCache } from "@serwist/next/worker";
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  type PrecacheEntry,
  Serwist,
  type SerwistGlobalConfig,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * O service worker do Chorinho.
 *
 * Ele existe por um motivo concreto: o tablet do balcão em rede de bairro. A
 * interface precisa abrir mesmo sem internet para o atendente conseguir
 * registrar a venda na fila — se a tela não carrega, não há fila que salve.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  runtimeCaching: [
    /**
     * Nada de API em cache.
     *
     * Toda rota `/api` ou é escrita, ou devolve dado ligado à sessão de quem
     * pediu. Servir uma resposta guardada aqui é, na melhor hipótese, mostrar
     * saldo velho — e na pior, mostrar o saldo de outra pessoa no mesmo
     * aparelho.
     */
    {
      matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    /**
     * Ladrilhos do mapa em cache longo.
     *
     * A política de uso do OpenStreetMap pede cache explícito, e o bairro do
     * usuário não muda de forma: os mesmos ladrilhos voltam a cada abertura
     * do aplicativo.
     */
    {
      matcher: ({ url }) => /(?:tile\.openstreetmap|basemaps|\.pmtiles)/.test(url.href),
      handler: new CacheFirst({
        cacheName: "chorinho-mapa",
        plugins: [new ExpirationPlugin({ maxEntries: 600, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/sem-conexao",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();
