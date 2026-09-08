"use client";

import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

const REGION_ID = "coupon-qr-scanner";

/**
 * Thin client-only wrapper around html5-qrcode: opens the camera into a div,
 * calls onScan with the decoded text, and guarantees the camera is stopped on
 * unmount. onError fires only for setup failures (no camera / permission
 * denied), not for frames without a QR.
 */
export const QrScanner = ({ onScan, onError }: { onScan: (text: string) => void; onError?: (e: unknown) => void }) => {
  const onScanRef = useRef(onScan);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
    onErrorRef.current = onError;
  }, [onScan, onError]);

  useEffect(() => {
    const scanner = new Html5Qrcode(REGION_ID);
    let stopped = false;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        text => onScanRef.current(text),
        // per-frame decode misses: expected, ignore
        () => undefined,
      )
      .catch(e => onErrorRef.current?.(e));

    return () => {
      if (stopped) return;
      stopped = true;
      // stop() rejects if start() never finished; nothing to clean up then
      scanner.stop().catch(() => undefined);
    };
  }, []);

  return <div id={REGION_ID} className="w-full overflow-hidden rounded-box bg-black" />;
};
