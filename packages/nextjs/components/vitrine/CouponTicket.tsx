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
      className={`relative flex bg-base-100 border border-base-300 rounded-box shadow-sm overflow-hidden ${
        muted ? "opacity-60" : "hover:shadow-md transition-shadow"
      }`}
    >
      {/* Photo stub */}
      <div className="w-28 shrink-0 relative">
        <CampaignImage campaign={campaign} />
      </div>

      {/* Perforated divider */}
      <div className="relative border-l-2 border-dashed border-base-300">
        <span className="absolute -top-2 -left-2 w-4 h-4 rounded-full bg-base-200 border border-base-300" />
        <span className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-base-200 border border-base-300" />
      </div>

      <div className="flex flex-col gap-1 p-4 min-w-0">
        <span className="text-xs font-bold opacity-70 truncate">
          {meta?.establishment ?? categoryInfo(campaign.category).label}
        </span>
        <h3 className="font-bold text-base leading-snug m-0">{campaignDisplayName(campaign)}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <StatusPill status={status} />
          <span className="badge badge-ghost badge-sm">
            {quantity.toString()} {quantity === 1n ? "cupom" : "cupons"}
          </span>
        </div>
        {footer}
      </div>
    </div>
  );
};
