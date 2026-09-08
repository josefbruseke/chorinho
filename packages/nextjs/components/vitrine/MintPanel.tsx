"use client";

import { useState } from "react";
import Link from "next/link";
import { Countdown } from "./Countdown";
import { useAccount } from "wagmi";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Campaign, formatPrice, getCampaignStatus, nowSeconds, remainingSupply } from "~~/utils/vitrine";

/**
 * The buy box. All the states a non-crypto-native user needs spelled out in
 * plain language: connect wallet, not started yet (with countdown), ended,
 * sold out, per-person limit reached — and only then an enabled buy button.
 */
export const MintPanel = ({ campaign }: { campaign: Campaign }) => {
  const { address } = useAccount();
  const [quantity, setQuantity] = useState(1);
  const [justBought, setJustBought] = useState(false);

  const { data: alreadyMinted } = useScaffoldReadContract({
    contractName: "DiscountNFT",
    functionName: "mintedBy",
    args: [campaign.id, address],
    watch: true,
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "DiscountNFT" });

  const status = getCampaignStatus(campaign, nowSeconds());
  const remaining = remainingSupply(campaign);
  const walletRemaining = campaign.maxPerWallet === 0n ? null : campaign.maxPerWallet - (alreadyMinted ?? 0n);

  // Largest quantity the user could buy right now, for the stepper bounds.
  const caps = [remaining, walletRemaining].filter((v): v is bigint => v !== null);
  const maxQuantity = caps.length > 0 ? Number(caps.reduce((a, b) => (a < b ? a : b))) : 10;

  const totalPrice = campaign.price * BigInt(quantity);

  const handleBuy = async () => {
    try {
      await writeContractAsync({
        functionName: "mint",
        args: [campaign.id, BigInt(quantity)],
        value: totalPrice,
      });
      setJustBought(true);
    } catch (e) {
      // user rejection / revert: the scaffold transactor already surfaced a
      // notification with the parsed error, nothing more to do here
      console.error(e);
    }
  };

  if (!address) {
    return (
      <div className="flex flex-col gap-3">
        <p className="m-0 text-sm opacity-70">Entre para comprar o cupom:</p>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  if (status === "upcoming") {
    return (
      <div className="alert">
        <span>
          As vendas ainda não começaram — abrem em <Countdown target={campaign.startTime} />.
        </span>
      </div>
    );
  }

  if (status === "ended") {
    return (
      <div className="alert">
        <span>As vendas desta campanha já foram encerradas.</span>
      </div>
    );
  }

  if (status === "soldOut") {
    return (
      <div className="alert alert-warning">
        <span>Esgotado! Todos os cupons desta campanha já foram vendidos.</span>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="alert">
        <span>Esta campanha está pausada no momento.</span>
      </div>
    );
  }

  if (walletRemaining !== null && walletRemaining <= 0n) {
    return (
      <div className="alert alert-info">
        <span>
          Você já comprou o máximo permitido por pessoa nesta campanha ({campaign.maxPerWallet.toString()}{" "}
          {campaign.maxPerWallet === 1n ? "cupom" : "cupons"}).
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {justBought && (
        <div className="flex flex-col gap-2">
          <div className="alert alert-success">
            <CheckCircleIcon className="h-5 w-5" />
            <span>Compra concluída! Seu cupom já está pronto para usar.</span>
          </div>
          <Link href="/meus-cupons" className="btn btn-success btn-lg">
            Ver meu cupom
          </Link>
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="join">
          <button
            className="btn join-item"
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1 || isMining}
            aria-label="Diminuir quantidade"
          >
            −
          </button>
          <span className="join-item btn btn-ghost no-animation pointer-events-none w-12 tabular-nums">{quantity}</span>
          <button
            className="btn join-item"
            onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))}
            disabled={quantity >= maxQuantity || isMining}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
        {campaign.maxPerWallet > 0n && (
          <span className="text-xs opacity-60">máx. {campaign.maxPerWallet.toString()} por pessoa</span>
        )}
      </div>

      <button className="btn btn-primary btn-lg" onClick={handleBuy} disabled={isMining}>
        {isMining ? (
          <>
            <span className="loading loading-spinner loading-sm" />
            Confirmando compra…
          </>
        ) : totalPrice === 0n ? (
          "Pegar cupom grátis"
        ) : (
          `Comprar por ${formatPrice(totalPrice)}`
        )}
      </button>
    </div>
  );
};
