"use client";

import Link from "next/link";
import { CampaignImage } from "./CampaignImage";
import { CategoryIcon } from "./CategoryIcon";
import { Countdown } from "./Countdown";
import { VerifiedBadge } from "./VerifiedBadge";
import { TicketIcon } from "@heroicons/react/24/outline";
import { BoltIcon, GiftIcon, MapPinIcon, SparklesIcon } from "@heroicons/react/24/solid";
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

export const CampaignCard = ({
  campaign,
  onQuickJoin,
}: {
  campaign: Campaign;
  onQuickJoin?: (campaign: Campaign) => void;
}) => {
  const cat = categoryInfo(campaign.category);
  const status = getCampaignStatus(campaign, nowSeconds());
  const unavailable = status === "soldOut" || status === "ended";
  const badge = statusBadge[status];
  const remaining = remainingSupply(campaign);
  const meta = campaign.metadata;

  return (
    <Link
      href={`/campanha/${campaign.id.toString()}`}
      className={`card bg-base-100 border border-base-300 rounded-2xl shadow-xs hover:shadow-md hover:-translate-y-1 transition-all overflow-hidden group ${
        unavailable ? "opacity-60" : ""
      }`}
    >
      <figure className="relative h-48">
        <CampaignImage campaign={campaign} className="group-hover:scale-105 transition-transform duration-300" />
        {/* Chorinho badge: the local loyalty reward promise */}
        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-base-100/95 text-secondary border border-base-300 flex items-center gap-1.5 font-extrabold text-xs shadow-xs backdrop-blur-xs">
          <SparklesIcon className="w-3.5 h-3.5 text-accent" />
          <span>Chorinho da Casa</span>
        </div>
        {campaign.flash && status === "open" && (
          <div className="absolute top-3 left-3 badge badge-warning gap-1 font-bold shadow-xs">
            <BoltIcon className="h-3 w-3" />
            <Countdown target={campaign.endTime} />
          </div>
        )}
        {badge && <div className={`absolute top-3 left-3 badge ${badge.className} shadow-xs`}>{badge.label}</div>}
        {campaign.comboTokenIds.length > 0 && (
          <div
            className="absolute top-3 right-3 badge badge-success gap-1 shadow-xs"
            title="Consuma e ganhe outro benefício de cortesia"
          >
            <GiftIcon className="h-3 w-3" />
            cortesia extra
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
          <span className="text-xs uppercase tracking-wide opacity-60 inline-flex items-center gap-1">
            <CategoryIcon iconKey={cat.iconKey} className="w-3.5 h-3.5" />
            <span>{cat.label}</span>
          </span>
        )}
        <h3 className="card-title text-base leading-snug mt-0.5">{campaignDisplayName(campaign)}</h3>
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-base-200">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 block">Adesão</span>
            <span className="font-serif font-black text-primary text-base">{formatPrice(campaign.price)}</span>
          </div>
          {onQuickJoin ? (
            <button
              type="button"
              onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                onQuickJoin(campaign);
              }}
              className="btn btn-primary btn-xs rounded-xl font-bold gap-1 px-3 shadow-xs active:scale-95"
            >
              <TicketIcon className="w-3.5 h-3.5" />
              <span>Participar</span>
            </button>
          ) : (
            campaign.flash &&
            status === "open" &&
            remaining !== null && (
              <span className="text-xs text-warning font-semibold">restam {remaining.toString()}</span>
            )
          )}
        </div>
      </div>
    </Link>
  );
};
