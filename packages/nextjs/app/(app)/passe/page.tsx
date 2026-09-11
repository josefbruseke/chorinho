"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { QRCodeSVG } from "qrcode.react";
import { useAccount } from "wagmi";
import { ExclamationTriangleIcon, TicketIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useMyCoupons } from "~~/hooks/vitrine/useMyCoupons";
import { campaignDisplayName, encodeCouponQr } from "~~/utils/vitrine";

/**
 * O passe que o cliente mostra no balcão. Tela dedicada em vez de modal porque
 * é a ação mais repetida do app: precisa de link direto, atalho instalável e a
 * tela inteira — QR grande escaneia mais rápido em câmera de celular barato.
 */
const Passe: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { coupons, isLoading } = useMyCoupons();

  const passeAtivo = coupons[0];

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-6 py-20 text-center grow">
        <TicketIcon className="w-12 h-12 text-primary/60" />
        <h1 className="text-2xl font-serif font-black m-0 text-secondary">Entre para abrir seu passe</h1>
        <p className="m-0 text-sm opacity-75 max-w-xs">
          É ele que o caixa escaneia para creditar seus carimbos no balcão.
        </p>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center grow py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 px-5 py-6 grow">
      <header className="text-center">
        <h1 className="text-2xl font-serif font-black m-0 text-secondary">Meu passe</h1>
        <p className="m-0 mt-1 text-sm opacity-75">Mostre esta tela ao pagar</p>
      </header>

      {/* Fundo sempre claro e contraste alto: QR escuro sobre claro é o que a
          câmera lê rápido, inclusive no tema escuro e sob luz do balcão. */}
      <div className="w-full max-w-xs rounded-3xl border-2 border-base-300 bg-qr-surface p-6 shadow-md flex flex-col items-center gap-4">
        {address && (
          <QRCodeSVG
            value={
              passeAtivo ? encodeCouponQr({ owner: address, tokenId: passeAtivo.campaign.id }) : `chorinho:${address}:0`
            }
            size={224}
            level="M"
            bgColor="#ffffff"
            fgColor="#261c14"
          />
        )}

        {passeAtivo ? (
          <div className="text-center">
            <span className="block font-serif font-extrabold text-qr-ink">
              {campaignDisplayName(passeAtivo.campaign)}
            </span>
            <span className="text-xs text-qr-muted">
              {passeAtivo.balance.toString()} {passeAtivo.balance === 1n ? "carimbo" : "carimbos"} nesta cartela
            </span>
          </div>
        ) : (
          <p className="m-0 text-center text-xs text-qr-muted">
            Você ainda não tem cartela. O caixa consegue abrir uma para você na primeira compra.
          </p>
        )}
      </div>

      <div className="w-full max-w-xs rounded-box border border-warning/40 bg-warning/10 p-3.5 flex gap-2.5">
        <ExclamationTriangleIcon className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <p className="m-0 text-xs leading-relaxed text-base-content/85">
          <strong>Este passe ainda não expira.</strong> Por enquanto ele não deve ser fotografado nem compartilhado. A
          versão com validade de dois minutos e uso único entra no M4.
        </p>
      </div>

      <Link href="/carteira" className="btn btn-ghost btn-sm rounded-xl">
        Ver minhas cartelas
      </Link>
    </div>
  );
};

export default Passe;
