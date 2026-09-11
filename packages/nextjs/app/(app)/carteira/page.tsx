"use client";

import Link from "next/link";
import type { NextPage } from "next";
import { TicketIcon } from "@heroicons/react/24/solid";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { Countdown } from "~~/components/vitrine/Countdown";
import { CouponTicket } from "~~/components/vitrine/CouponTicket";
import { useMyCoupons } from "~~/hooks/vitrine/useMyCoupons";
import { useRedeemedCoupons } from "~~/hooks/vitrine/useRedeemedCoupons";
import { nowSeconds } from "~~/utils/vitrine";

const MyCoupons: NextPage = () => {
  const { coupons, isConnected, isLoading } = useMyCoupons();
  const { redeemed } = useRedeemedCoupons();

  return (
    <div className="max-w-5xl w-full mx-auto px-5 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-extrabold m-0 flex items-center gap-2">
          <TicketIcon className="h-8 w-8 text-primary" />
          Meus Passes & Chorinhos
        </h1>
        <p className="opacity-70 mt-2 mb-0">
          Toque num passe para abrir o QR code e apresentar no balcão ou caixa do estabelecimento.
        </p>
      </div>

      {!isConnected ? (
        <div className="flex flex-col items-start gap-3 py-10">
          <p className="m-0 opacity-70">Entre para ver seus passes e chorinhos:</p>
          <RainbowKitCustomConnectButton />
        </div>
      ) : isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : coupons.length === 0 && redeemed.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-4 border border-dashed border-base-300 rounded-xl p-8">
          <p className="text-lg opacity-70 m-0">Você ainda não possui nenhum passe ou chorinho.</p>
          <Link href="/" className="btn btn-primary">
            Explorar estabelecimentos participantes
          </Link>
        </div>
      ) : (
        <>
          {coupons.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center gap-4">
              <p className="opacity-70 m-0">Nenhum passe disponível para usar agora.</p>
              <Link href="/" className="btn btn-primary btn-sm">
                Explorar comércios parceiros
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {coupons.map(({ campaign, balance }) => {
                // A coupon's validity mirrors the campaign window: no endTime
                // means it does not expire; a past endTime means the
                // establishment may no longer accept it.
                const expired = campaign.endTime > 0n && BigInt(nowSeconds()) > campaign.endTime;
                return (
                  <Link key={campaign.id.toString()} href={`/meus-cupons/${campaign.id.toString()}`}>
                    <CouponTicket
                      campaign={campaign}
                      quantity={balance}
                      status={expired ? "expired" : "valid"}
                      footer={
                        !expired && campaign.endTime > 0n ? (
                          <span className="text-xs opacity-60">
                            expira em <Countdown target={campaign.endTime} />
                          </span>
                        ) : undefined
                      }
                    />
                  </Link>
                );
              })}
            </div>
          )}

          {redeemed.length > 0 && (
            <section className="flex flex-col gap-4 mt-4">
              <h2 className="text-xl font-extrabold m-0 opacity-70">Já usados</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {redeemed.map(({ campaign, amount }) => (
                  <CouponTicket key={campaign.id.toString()} campaign={campaign} quantity={amount} status="used" />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default MyCoupons;
