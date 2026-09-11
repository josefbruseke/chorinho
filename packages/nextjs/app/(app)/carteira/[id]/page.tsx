"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { NextPage } from "next";
import { QRCodeSVG } from "qrcode.react";
import { useAccount } from "wagmi";
import { ArrowLeftIcon, MinusCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { StatusPill } from "~~/components/vitrine/StatusPill";
import { VerifiedBadge } from "~~/components/vitrine/VerifiedBadge";
import { useMyCoupons } from "~~/hooks/vitrine/useMyCoupons";
import { useRedeemedCoupons } from "~~/hooks/vitrine/useRedeemedCoupons";
import { campaignDisplayName, categoryInfo, encodeCouponQr, nowSeconds } from "~~/utils/vitrine";

/**
 * Full-screen coupon: what the customer shows at the counter. The QR area is
 * always on a white card regardless of theme, so any scanner reads it.
 */
const CouponDetail: NextPage = () => {
  const params = useParams<{ id: string }>();
  const { address } = useAccount();
  const { coupons, isConnected, isLoading } = useMyCoupons();
  const { redeemed } = useRedeemedCoupons();

  const owned = useMemo(() => coupons.find(c => c.campaign.id.toString() === params.id), [coupons, params.id]);
  const used = useMemo(() => redeemed.find(r => r.campaign.id.toString() === params.id), [redeemed, params.id]);
  const campaign = owned?.campaign ?? used?.campaign;

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <p className="m-0 opacity-70">Entre para ver seu cupom:</p>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!campaign || !address) {
    return (
      <div className="text-center py-24 flex flex-col items-center gap-4">
        <p className="text-lg opacity-70 m-0">Cupom não encontrado.</p>
        <Link href="/carteira" className="btn btn-primary btn-sm">
          Meus cupons
        </Link>
      </div>
    );
  }

  const meta = campaign.metadata;
  const expired = campaign.endTime > 0n && BigInt(nowSeconds()) > campaign.endTime;
  const status = !owned ? "used" : expired ? "expired" : "valid";

  return (
    <div className="max-w-md w-full mx-auto px-5 py-8 flex flex-col items-center gap-5">
      <Link href="/carteira" className="btn btn-ghost btn-sm gap-1 self-start -ml-2">
        <ArrowLeftIcon className="h-4 w-4" />
        Meus cupons
      </Link>

      <div className="text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="font-extrabold text-lg">{meta?.establishment ?? categoryInfo(campaign.category).label}</span>
          {meta?.establishment && <VerifiedBadge compact />}
        </div>
        <h1 className="text-2xl font-extrabold mt-1 mb-0 text-balance">{campaignDisplayName(campaign)}</h1>
      </div>

      <StatusPill status={status} large />

      {/* QR area: white card no matter the theme so scanners always read it */}
      <div className="relative bg-base-100 rounded-3xl p-7 shadow-xs border border-base-300">
        <QRCodeSVG value={encodeCouponQr({ owner: address, tokenId: campaign.id })} size={260} marginSize={1} />
        {status !== "valid" && (
          <div className="absolute inset-0 rounded-3xl bg-base-100/95 flex flex-col items-center justify-center gap-2 text-center p-6">
            {status === "used" ? (
              <>
                <MinusCircleIcon className="h-14 w-14 text-neutral opacity-60" />
                <p className="m-0 font-bold text-neutral">Este passe já foi utilizado.</p>
              </>
            ) : (
              <>
                <XCircleIcon className="h-14 w-14 text-error" />
                <p className="m-0 font-bold text-error">Este passe expirou.</p>
              </>
            )}
          </div>
        )}
      </div>

      {status === "valid" ? (
        <p className="m-0 text-center opacity-70 text-sm max-w-xs">
          Apresente esta tela no balcão ou caixa do estabelecimento na hora de pedir. O atendente escaneia e valida na
          hora.
        </p>
      ) : (
        <Link href="/" className="btn btn-primary rounded-xl">
          Ver outros estabelecimentos
        </Link>
      )}

      {owned && owned.balance > 1n && status === "valid" && (
        <span className="badge badge-neutral font-semibold">
          Você tem {owned.balance.toString()} passes desta oferta — cada uso desconta um.
        </span>
      )}
    </div>
  );
};

export default CouponDetail;
