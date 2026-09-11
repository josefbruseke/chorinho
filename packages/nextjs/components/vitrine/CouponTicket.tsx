"use client";

import { CampaignImage } from "./CampaignImage";
import { CouponStatus, StatusPill } from "./StatusPill";
import { Campaign, campaignDisplayName, categoryInfo } from "~~/utils/vitrine";

/**
 * Digital gift-voucher look for an owned coupon: photo stub on the left, a
 * perforated divider (dashed line + punched notches), offer details on the
 * right. Deliberately nothing resembling a "crypto asset" card.
 */
export const CouponTicket = ({
  campaign,
  quantity,
  status,
  footer,
}: {
  campaign: Campaign;
  quantity: bigint;
  status: CouponStatus;
  footer?: React.ReactNode;
}) => {
  const meta = campaign.metadata;
  const muted = status !== "valid";

  return (
    <div
      className={`relative flex bg-base-100 border border-base-300 rounded-2xl shadow-xs overflow-hidden ${
        muted ? "opacity-60" : "hover:shadow-md transition-all hover:-translate-y-0.5"
      }`}
    >
      {/* Photo stub */}
      <div className="w-28 shrink-0 relative">
        <CampaignImage campaign={campaign} />
      </div>

      {/* Perforated divider */}
      <div className="relative border-l-2 border-dashed border-base-300">
        <span className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-base-200 border border-base-300" />
        <span className="absolute -bottom-2.5 -left-2.5 w-5 h-5 rounded-full bg-base-200 border border-base-300" />
      </div>

      <div className="flex flex-col gap-1 p-4 min-w-0 justify-center">
        <span className="text-xs font-bold opacity-70 truncate">
          {meta?.establishment ?? categoryInfo(campaign.category).label}
        </span>
        <h3 className="font-extrabold text-base leading-snug m-0">{campaignDisplayName(campaign)}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusPill status={status} />
          <span className="badge badge-neutral badge-sm font-semibold">
            {quantity.toString()} {quantity === 1n ? "chorinho disponível" : "chorinhos disponíveis"}
          </span>
        </div>
        {footer}
      </div>
    </div>
  );
};
