"use client";

/* eslint-disable @next/next/no-img-element */
import { CategoryIcon } from "./CategoryIcon";
import { Campaign, categoryInfo, resolveMediaUrl } from "~~/utils/vitrine";

/**
 * Campaign artwork. Uses metadata.image when present; otherwise a category
 * gradient with an official library icon, so the storefront never shows broken images even
 * with zero hosted assets (the local seed relies on this).
 */
export const CampaignImage = ({ campaign, className = "" }: { campaign: Campaign; className?: string }) => {
  const cat = categoryInfo(campaign.category);
  const image = campaign.metadata?.image;

  if (image) {
    return (
      <img
        src={resolveMediaUrl(image)}
        alt={campaign.metadata?.name ?? "Imagem da campanha"}
        className={`object-cover w-full h-full ${className}`}
      />
    );
  }

  return (
    <div className={`${cat.gradient} w-full h-full flex items-center justify-center ${className}`}>
      <CategoryIcon iconKey={cat.iconKey} className="w-14 h-14 text-white/70" />
    </div>
  );
};
