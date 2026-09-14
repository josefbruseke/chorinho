"use client";

import { useEffect, useState } from "react";
import { nowSeconds } from "~~/utils/vitrine";

const format = (totalSeconds: number) => {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

/**
 * Live countdown to a unix timestamp. Renders `expiredText` once reached.
 * Mounted client-side only usage; first paint uses the current clock.
 */
export const Countdown = ({ target, expiredText = "Encerrado" }: { target: bigint; expiredText?: string }) => {
  const [now, setNow] = useState(nowSeconds);

  useEffect(() => {
    const interval = setInterval(() => setNow(nowSeconds()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = Number(target) - now;
  if (remaining <= 0) return <span>{expiredText}</span>;
  return <span className="tabular-nums">{format(remaining)}</span>;
};
