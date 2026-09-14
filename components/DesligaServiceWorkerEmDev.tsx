"use client";

import { useEffect } from "react";

/**
 * Remove, em desenvolvimento, um service worker que tenha sobrado.
 *
 * `SerwistProvider` recebe `disable` em dev, mas `disable` só impede o
 * REGISTRO — não desfaz um worker já instalado. Basta ter rodado
 * `bun run serve` uma vez em `localhost:3000` para o worker ficar ativo
 * naquela origem e continuar servindo o HTML precacheado depois, com
 * `next dev` rodando por cima.
 *
 * O sintoma não parece cache: a página volta com o texto de duas semanas
 * atrás e o React acusa divergência de hidratação, porque o HTML que chegou
 * não é o que o servidor acabou de gerar. Já custou tempo aqui.
 */
export const DesligaServiceWorkerEmDev = () => {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then(async registros => {
      if (registros.length === 0) return;
      await Promise.all(registros.map(r => r.unregister()));
      // O cache do Serwist sobrevive ao unregister e continuaria respondendo.
      if ("caches" in window) {
        const nomes = await caches.keys();
        await Promise.all(nomes.map(n => caches.delete(n)));
      }
      console.warn("[dev] service worker de uma execução de produção foi removido. Recarregue a página.");
    });
  }, []);

  return null;
};
