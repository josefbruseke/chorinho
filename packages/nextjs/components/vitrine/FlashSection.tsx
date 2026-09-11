"use client";

import Link from "next/link";
import { CampaignImage } from "./CampaignImage";
import { Countdown } from "./Countdown";
import { BoltIcon } from "@heroicons/react/24/solid";
import {
  Campaign,
  campaignDisplayName,
  formatPrice,
  getCampaignStatus,
  nowSeconds,
  remainingSupply,
} from "~~/utils/vitrine";

/**
 * Hero strip for live flash promotions: bigger cards, countdown and a supply
 * bar to communicate urgency. Hidden entirely when nothing is live.
 */
export const FlashSection = ({ campaigns }: { campaigns: Campaign[] }) => {
  const live = campaigns.filter(c => c.flash && getCampaignStatus(c, nowSeconds()) === "open");
  if (live.length === 0) return null;

  return (
    <section className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <BoltIcon className="h-6 w-6 text-warning" />
        <h2 className="font-serif text-2xl font-black m-0 text-secondary">Só hoje</h2>
        <span className="badge badge-warning badge-sm font-semibold">corre que acaba</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {live.map(c => {
          const remaining = remainingSupply(c);
          const total = c.maxSupply;
          const pct = remaining !== null && total > 0n ? Number((remaining * 100n) / total) : null;
          return (
            <Link
              key={c.id.toString()}
              href={`/campanha/${c.id.toString()}`}
              className="card card-side bg-base-100 border-2 border-warning shadow-md hover:shadow-xl transition-shadow overflow-hidden"
            >
              <figure className="w-32 sm:w-44 shrink-0">
                <CampaignImage campaign={c} />
              </figure>
              <div className="card-body p-4 gap-2">
                {c.metadata?.establishment && (
                  <span className="text-xs font-bold opacity-70 -mb-1">{c.metadata.establishment}</span>
                )}
                <h3 className="card-title font-serif text-base leading-snug">{campaignDisplayName(c)}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono font-black">{formatPrice(c.price)}</span>
                  <span className="opacity-70">·</span>
                  <span className="text-warning font-semibold flex items-center gap-1">
                    <BoltIcon className="h-4 w-4" />
                    termina em <Countdown target={c.endTime} />
                  </span>
                </div>
                {remaining !== null && pct !== null && (
                  <div>
                    <div className="text-xs mb-1 opacity-70">
                      restam {remaining.toString()} de {total.toString()} cupons
                    </div>
                    <progress className="progress progress-warning w-full" value={pct} max={100} />
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
};
