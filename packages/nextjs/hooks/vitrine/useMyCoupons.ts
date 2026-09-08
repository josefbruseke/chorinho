"use client";

import { useMemo } from "react";
import { useCampaigns } from "./useCampaigns";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { Campaign } from "~~/utils/vitrine";

export type OwnedCoupon = {
  campaign: Campaign;
  balance: bigint;
};

/**
 * The connected wallet's coupons. With campaign ids already enumerated by
 * useCampaigns, a single balanceOfBatch call (native ERC1155) covers every
 * campaign — no Transfer-event scanning needed.
 */
export const useMyCoupons = () => {
  const { address } = useAccount();
  const { campaigns, isLoading: campaignsLoading } = useCampaigns();

  const ids = useMemo(() => campaigns.map(c => c.id), [campaigns]);
  const accounts = useMemo(
    () => (address ? (ids.map(() => address) as readonly `0x${string}`[]) : undefined),
    [address, ids],
  );

  const { data: balances, isLoading: balancesLoading } = useScaffoldReadContract({
    contractName: "DiscountNFT",
    functionName: "balanceOfBatch",
    // undefined args keep the query disabled until the wallet is connected
    args: [accounts, accounts ? ids : undefined],
    watch: true,
  });

  const coupons: OwnedCoupon[] = useMemo(() => {
    if (!balances) return [];
    return campaigns.map((campaign, i) => ({ campaign, balance: balances[i] ?? 0n })).filter(c => c.balance > 0n);
  }, [campaigns, balances]);

  return {
    coupons,
    isConnected: !!address,
    isLoading: campaignsLoading || (!!address && balancesLoading),
  };
};
