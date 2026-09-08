import { formatEther } from "viem";

/**
 * Mirror of DiscountNFT.Category. Order must match the Solidity enum.
 * The gradient/emoji drive the placeholder art for campaigns whose metadata
 * has no image, so every card looks intentional without any hosted assets.
 */
export const CATEGORIES = [
  { id: 0, label: "Gastronomia", emoji: "🍽️", gradient: "bg-linear-to-br from-orange-400 to-rose-500" },
  { id: 1, label: "Lazer e Turismo", emoji: "⛵", gradient: "bg-linear-to-br from-sky-400 to-blue-600" },
  { id: 2, label: "Esportes", emoji: "🏄", gradient: "bg-linear-to-br from-emerald-400 to-teal-600" },
  { id: 3, label: "Cultura", emoji: "🎶", gradient: "bg-linear-to-br from-violet-400 to-purple-600" },
  { id: 4, label: "Vestuário", emoji: "👕", gradient: "bg-linear-to-br from-amber-400 to-orange-600" },
] as const;

export const categoryInfo = (id: number) => CATEGORIES[id] ?? CATEGORIES[0];

export type CampaignMetadata = {
  name?: string;
  description?: string;
  image?: string;
  /** Restaurant / partner establishment behind the offer */
  establishment?: string;
  neighborhood?: string;
  /** Cuisine or offer type, e.g. "Frutos do mar" */
  cuisine?: string;
};

export type Campaign = {
  id: bigint;
  price: bigint;
  maxSupply: bigint; // 0n = unlimited
  startTime: bigint; // 0n = no lower bound
  endTime: bigint; // 0n = no upper bound
  maxPerWallet: bigint; // 0n = unlimited
  category: number;
  flash: boolean;
  active: boolean;
  comboTokenIds: readonly bigint[];
  uri: string;
  minted: bigint;
  metadata?: CampaignMetadata;
};

export type CampaignStatus = "open" | "upcoming" | "ended" | "soldOut" | "paused";

export const getCampaignStatus = (c: Campaign, nowSec: number): CampaignStatus => {
  if (!c.active) return "paused";
  if (c.maxSupply > 0n && c.minted >= c.maxSupply) return "soldOut";
  if (c.startTime > 0n && BigInt(nowSec) < c.startTime) return "upcoming";
  if (c.endTime > 0n && BigInt(nowSec) > c.endTime) return "ended";
  return "open";
};

/** null = unlimited supply */
export const remainingSupply = (c: Campaign): bigint | null => (c.maxSupply === 0n ? null : c.maxSupply - c.minted);

export const nowSeconds = () => Math.floor(Date.now() / 1000);

/**
 * Prices are charged on-chain in native currency but always DISPLAYED in BRL:
 * the audience is non-crypto consumers, so "ETH" never appears in the UI.
 * Fixed demo rate until the payment/pricing infra phase defines a real one.
 */
const DEMO_ETH_BRL = 15_000;

const brlFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatPrice = (wei: bigint) =>
  wei === 0n ? "Grátis" : brlFormatter.format(Number(formatEther(wei)) * DEMO_ETH_BRL);

const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

export const resolveMediaUrl = (url: string) =>
  url.startsWith("ipfs://") ? IPFS_GATEWAY + url.slice("ipfs://".length) : url;

/**
 * Supports the three URI shapes campaigns may use: data: (self-contained, used
 * by the local seed), ipfs:// (via public gateway) and plain http(s).
 * Returns undefined on any failure — the UI degrades to placeholder art and
 * "Campanha #id" instead of breaking the page.
 */
export const fetchCampaignMetadata = async (uri: string): Promise<CampaignMetadata | undefined> => {
  try {
    if (uri.startsWith("data:")) {
      const comma = uri.indexOf(",");
      if (comma === -1) return undefined;
      const header = uri.slice(0, comma);
      let payload = uri.slice(comma + 1);
      if (header.includes("base64")) {
        payload = atob(payload);
      } else {
        try {
          payload = decodeURIComponent(payload);
        } catch {
          // payload was not URL-encoded; use as-is
        }
      }
      return JSON.parse(payload);
    }
    const res = await fetch(resolveMediaUrl(uri));
    if (!res.ok) return undefined;
    return await res.json();
  } catch {
    return undefined;
  }
};

export const campaignDisplayName = (c: Campaign) => c.metadata?.name ?? `Campanha #${c.id.toString()}`;

// ---------------------------------------------------------------- coupon QR

export type CouponQrPayload = {
  owner: `0x${string}`;
  tokenId: bigint;
};

/**
 * Versioned JSON payload shown as a QR on the customer's screen and read by
 * the partner's scanner. Kept minimal on purpose: the scanner re-checks
 * everything on-chain (balance, campaign) before redeeming, so the QR only
 * needs to say "which coupon, whose".
 */
export const encodeCouponQr = ({ owner, tokenId }: { owner: string; tokenId: bigint }) =>
  JSON.stringify({ v: 1, o: owner, t: tokenId.toString() });

/** Defensive inverse of encodeCouponQr: undefined for anything malformed. */
export const decodeCouponQr = (text: string): CouponQrPayload | undefined => {
  try {
    const raw = JSON.parse(text);
    if (raw?.v !== 1) return undefined;
    if (typeof raw.o !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(raw.o)) return undefined;
    if (typeof raw.t !== "string" || !/^\d+$/.test(raw.t)) return undefined;
    return { owner: raw.o as `0x${string}`, tokenId: BigInt(raw.t) };
  } catch {
    return undefined;
  }
};
