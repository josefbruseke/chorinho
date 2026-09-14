"use client";

import { useEffect } from "react";

/**
 * Mantém a tela do balcão acesa.
 *
 * O tablet do caixa apaga no meio da venda e o atendente perde o passe já
 * escaneado. A API não existe em todo navegador e o navegador pode soltar o
 * bloqueio sozinho quando a aba sai de foco — por isso religamos no
 * `visibilitychange` em vez de pedir uma vez e confiar.
 */
export const useWakeLock = (ativo = true) => {
  useEffect(() => {
    if (!ativo || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let trava: WakeLockSentinel | undefined;
    let cancelado = false;

    const pedir = async () => {
      if (cancelado || document.visibilityState !== "visible") return;
      try {
        trava = await navigator.wakeLock.request("screen");
      } catch {
        // Bateria baixa ou permissão negada: não é motivo para quebrar o PDV.
      }
    };

    const aoVoltar = () => void pedir();

    void pedir();
    document.addEventListener("visibilitychange", aoVoltar);

    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", aoVoltar);
      void trava?.release().catch(() => undefined);
    };
  }, [ativo]);
};
