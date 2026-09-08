"use client";

import { useEffect, useMemo, useState } from "react";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { Campaign, CampaignMetadata, fetchCampaignMetadata } from "~~/utils/vitrine";

// Module-level cache: metadata URIs are immutable in practice (data:/ipfs:),
// so there is no reason to refetch them on every page navigation.
const metadataCache = new Map<string, CampaignMetadata | undefined>();

/**
 * Loads the entire storefront in one RPC call (DiscountNFT.getAllCampaigns),
 * then resolves each campaign's metadata URI client-side.
 */
export const useCampaigns = () => {
  const { data, isLoading } = useScaffoldReadContract({
    contractName: "DiscountNFT",
    functionName: "getAllCampaigns",
    watch: true,
  });

  const [metadataVersion, setMetadataVersion] = useState(0);

  const uris = useMemo(() => (data ? data[1].map(c => c.uri) : []), [data]);

  useEffect(() => {
    const missing = uris.filter(u => !metadataCache.has(u));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(
      missing.map(async uri => {
        metadataCache.set(uri, await fetchCampaignMetadata(uri));
      }),
    ).then(() => {
      if (!cancelled) setMetadataVersion(v => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [uris]);

  const campaigns: Campaign[] = useMemo(() => {
    if (!data) return [];
    const [ids, rawCampaigns, minted] = data;
    return ids.map((id, i) => {
      const c = rawCampaigns[i];
      return {
        id,
        price: c.price,
        maxSupply: c.maxSupply,
        startTime: c.startTime,
        endTime: c.endTime,
        maxPerWallet: c.maxPerWallet,
        category: c.category,
        flash: c.flash,
        active: c.active,
        comboTokenIds: c.comboTokenIds,
        uri: c.uri,
        minted: minted[i],
        metadata: metadataCache.get(c.uri),
      };
    });
    // metadataVersion re-renders once fetches land even though it's not read here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, metadataVersion]);

  return { campaigns, isLoading };
};
