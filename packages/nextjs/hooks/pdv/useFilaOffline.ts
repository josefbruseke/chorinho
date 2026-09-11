"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type VendaNaFila,
  enfileirar,
  lerFila,
  limparFila,
  marcarFalha,
  observarFila,
  removerDaFila,
} from "~~/utils/fila";

type ResultadoSync = { saleRef: string; ok: boolean; erro?: string; duplicada?: boolean; carimbos?: number };

const INTERVALO_MS = 30_000;

/**
 * A fila offline vista pela interface.
 *
 * Tenta esvaziar quando a internet volta, quando o atendente volta para a aba
 * e a cada trinta segundos. Os três gatilhos existem porque nenhum é confiável
 * sozinho: o evento `online` mente em rede de shopping, e a aba pode ficar
 * horas em segundo plano num tablet de balcão.
 */
export const useFilaOffline = () => {
  const [fila, setFila] = useState<VendaNaFila[]>([]);
  const [sincronizando, setSincronizando] = useState(false);
  const [online, setOnline] = useState(true);
  const emVoo = useRef(false);

  const recarregar = useCallback(async () => setFila(await lerFila()), []);

  useEffect(() => {
    recarregar();
    return observarFila(recarregar);
  }, [recarregar]);

  useEffect(() => {
    const mudou = () => setOnline(navigator.onLine);
    mudou();
    window.addEventListener("online", mudou);
    window.addEventListener("offline", mudou);
    return () => {
      window.removeEventListener("online", mudou);
      window.removeEventListener("offline", mudou);
    };
  }, []);

  const sincronizar = useCallback(async (): Promise<ResultadoSync[]> => {
    if (emVoo.current || !navigator.onLine) return [];
    const pendentes = await lerFila();
    if (pendentes.length === 0) return [];

    emVoo.current = true;
    setSincronizando(true);
    try {
      const r = await fetch("/api/pos/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          vendas: pendentes.map(v => ({
            saleRef: v.saleRef,
            qr: v.qr,
            codigo: v.codigo,
            valorCentavos: v.valorCentavos,
            boostBps: v.boostBps,
          })),
        }),
      });

      if (!r.ok) return [];
      const corpo: { resultados?: ResultadoSync[] } = await r.json();
      const resultados = corpo.resultados ?? [];

      // Sai da fila só o que o servidor confirmou. Um erro de passe também sai:
      // insistir nele todo minuto até o fim dos tempos não conserta nada.
      const definitivas = resultados.filter(x => x.ok || (x.erro && !x.erro.includes("rede"))).map(x => x.saleRef);
      const reter = resultados.filter(x => !x.ok && !definitivas.includes(x.saleRef));

      if (definitivas.length > 0) await removerDaFila(definitivas);
      if (reter.length > 0) await marcarFalha(reter.map(x => ({ saleRef: x.saleRef, erro: x.erro ?? "falhou" })));

      return resultados;
    } catch {
      return [];
    } finally {
      emVoo.current = false;
      setSincronizando(false);
      await recarregar();
    }
  }, [recarregar]);

  useEffect(() => {
    const tentar = () => void sincronizar();
    window.addEventListener("online", tentar);
    window.addEventListener("focus", tentar);
    const id = setInterval(tentar, INTERVALO_MS);
    tentar();
    return () => {
      window.removeEventListener("online", tentar);
      window.removeEventListener("focus", tentar);
      clearInterval(id);
    };
  }, [sincronizar]);

  return { fila, online, sincronizando, sincronizar, enfileirar, limparFila, recarregar };
};
