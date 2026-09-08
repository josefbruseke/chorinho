"use client";

import { useMemo } from "react";
import { useCampaigns } from "./useCampaigns";
import { useAccount } from "wagmi";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";
import { Campaign } from "~~/utils/vitrine";

export type RedeemedCoupon = {
  campaign: Campaign;
  /** total units of this campaign the user has already redeemed */
  amount: bigint;
};

/**
 * Coupons the connected account has already used. Redemption burns the unit,
 * so "used" is not readable from balances — it lives in the Redeemed event
 * log, filtered by user and aggregated per campaign here.
 */
export const useRedeemedCoupons = () => {
  const { address } = useAccount();
  const { campaigns } = useCampaigns();

  // Deprecated upstream in favor of indexers for production; fine for the
  // current local/testnet phase, revisit alongside the backend/indexer work.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const { data: events, isLoading } = useScaffoldEventHistory({
    contractName: "DiscountNFT",
    eventName: "Redeemed",
    filters: { user: address },
    watch: true,
    enabled: !!address,
  });

  const redeemed: RedeemedCoupon[] = useMemo(() => {
    if (!events || campaigns.length === 0) return [];
    const totals = new Map<bigint, bigint>();
    for (const event of events) {
      const { tokenId, amount } = event.args;
      if (tokenId === undefined || amount === undefined) continue;
      totals.set(tokenId, (totals.get(tokenId) ?? 0n) + amount);
    }
    return campaigns
      .filter(c => totals.has(c.id))
      .map(campaign => ({ campaign, amount: totals.get(campaign.id) as bigint }));
  }, [events, campaigns]);

  return { redeemed, isLoading: !!address && isLoading };
};
