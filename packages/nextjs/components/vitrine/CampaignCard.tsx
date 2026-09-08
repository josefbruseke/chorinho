"use client";

import Link from "next/link";
import { CampaignImage } from "./CampaignImage";
import { Countdown } from "./Countdown";
import { VerifiedBadge } from "./VerifiedBadge";
import { BoltIcon, GiftIcon, MapPinIcon } from "@heroicons/react/24/solid";
import {
  Campaign,
  campaignDisplayName,
  categoryInfo,
  formatPrice,
  getCampaignStatus,
  nowSeconds,
  remainingSupply,
} from "~~/utils/vitrine";

const statusBadge: Partial<Record<ReturnType<typeof getCampaignStatus>, { label: string; className: string }>> = {
  soldOut: { label: "Esgotado", className: "badge-neutral" },
  ended: { label: "Encerrado", className: "badge-ghost" },
  upcoming: { label: "Em breve", className: "badge-info" },
};

export const CampaignCard = ({ campaign }: { campaign: Campaign }) => {
  const cat = categoryInfo(campaign.category);
  const status = getCampaignStatus(campaign, nowSeconds());
  const unavailable = status === "soldOut" || status === "ended";
  const badge = statusBadge[status];
  const remaining = remainingSupply(campaign);
  const meta = campaign.metadata;

  return (
    <Link
      href={`/campanha/${campaign.id.toString()}`}
      className={`card bg-base-100 border border-base-300 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all overflow-hidden group ${
        unavailable ? "opacity-60" : ""
      }`}
    >
      <figure className="relative h-44">
        <CampaignImage campaign={campaign} className="group-hover:scale-105 transition-transform duration-300" />
        {/* "2x" seal: the product promise, stamped on every offer photo */}
        <div className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-primary text-primary-content flex items-center justify-center font-black text-sm shadow-md">
          2x
        </div>
        {campaign.flash && status === "open" && (
          <div className="absolute top-2 left-2 badge badge-warning gap-1 font-semibold shadow">
            <BoltIcon className="h-3 w-3" />
            <Countdown target={campaign.endTime} />
          </div>
        )}
        {badge && <div className={`absolute top-2 left-2 badge ${badge.className} shadow`}>{badge.label}</div>}
        {campaign.comboTokenIds.length > 0 && (
          <div
            className="absolute top-2 right-2 badge badge-success gap-1 shadow"
            title="Compre e ganhe outro cupom de brinde"
          >
            <GiftIcon className="h-3 w-3" />
            brinde
          </div>
        )}
      </figure>
      <div className="card-body p-4 gap-1">
        {meta?.establishment ? (
          <>
            <span className="font-extrabold text-base flex items-center gap-1.5">
              {meta.establishment}
              <VerifiedBadge compact />
            </span>
            <span className="text-xs opacity-60 flex items-center gap-1">
              {meta.cuisine ?? cat.label}
              {meta.neighborhood && (
                <>
                  <span>·</span>
                  <MapPinIcon className="h-3 w-3" />
                  {meta.neighborhood}
                </>
              )}
            </span>
          </>
        ) : (
          <span className="text-xs uppercase tracking-wide opacity-60">
            {cat.emoji} {cat.label}
          </span>
        )}
        <h3 className="card-title text-base leading-snug mt-0.5">{campaignDisplayName(campaign)}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="font-extrabold text-primary text-lg">{formatPrice(campaign.price)}</span>
          {campaign.flash && status === "open" && remaining !== null && (
            <span className="text-xs text-warning font-semibold">restam {remaining.toString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
};
