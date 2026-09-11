"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { NextPage } from "next";
import { QrCodeIcon, ShoppingBagIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { ArrowLeftIcon, BoltIcon, GiftIcon, MapPinIcon } from "@heroicons/react/24/solid";
import { CampaignImage } from "~~/components/vitrine/CampaignImage";
import { CategoryIcon } from "~~/components/vitrine/CategoryIcon";
import { Countdown } from "~~/components/vitrine/Countdown";
import { MintPanel } from "~~/components/vitrine/MintPanel";
import { VerifiedBadge } from "~~/components/vitrine/VerifiedBadge";
import { useCampaigns } from "~~/hooks/vitrine/useCampaigns";
import {
  campaignDisplayName,
  categoryInfo,
  formatPrice,
  getCampaignStatus,
  nowSeconds,
  remainingSupply,
} from "~~/utils/vitrine";

const HOW_IT_WORKS = [
  { Icon: ShoppingBagIcon, title: "Adquira o passe", text: "Ele fica salvo em Meus passes, na sua conta ou carteira." },
  { Icon: QrCodeIcon, title: "Apresente no balcão", text: "Na hora de pagar ou pedir, mostre o QR code na tela." },
  { Icon: SparklesIcon, title: "Receba o chorinho", text: "O atendente valida na hora e você aproveita sua cortesia." },
];

const CampaignDetail: NextPage = () => {
  const params = useParams<{ id: string }>();
  const { campaigns, isLoading } = useCampaigns();

  const campaign = useMemo(() => campaigns.find(c => c.id.toString() === params.id), [campaigns, params.id]);
  const comboCampaigns = useMemo(
    () => (campaign ? campaign.comboTokenIds.map(id => campaigns.find(c => c.id === id)).filter(c => !!c) : []),
    [campaign, campaigns],
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-24 flex flex-col items-center gap-4">
        <p className="text-lg opacity-70 m-0">Esta oferta não existe ou ainda não foi publicada.</p>
        <Link href="/" className="btn btn-primary btn-sm">
          Ver estabelecimentos
        </Link>
      </div>
    );
  }

  const cat = categoryInfo(campaign.category);
  const status = getCampaignStatus(campaign, nowSeconds());
  const remaining = remainingSupply(campaign);
  const meta = campaign.metadata;

  return (
    <div className="max-w-5xl w-full mx-auto px-5 py-8">
      <Link href="/" className="btn btn-ghost btn-sm gap-1 mb-4 -ml-2">
        <ArrowLeftIcon className="h-4 w-4" />
        Ver estabelecimentos
      </Link>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Artwork */}
        <div className="relative h-72 lg:h-96 rounded-xl border border-base-300 overflow-hidden">
          <CampaignImage campaign={campaign} />
          <div className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-base-100/95 text-base-content border border-base-300 flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider backdrop-blur-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Chorinho
          </div>
        </div>

        {/* Info + buy box */}
        <div className="flex flex-col gap-4">
          <div>
            {meta?.establishment ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-lg">{meta.establishment}</span>
                  <VerifiedBadge />
                </div>
                <span className="text-sm opacity-60 flex items-center gap-1">
                  {meta.cuisine ?? cat.label}
                  {meta.neighborhood && (
                    <>
                      <span>·</span>
                      <MapPinIcon className="h-3.5 w-3.5" />
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
            <h1 className="text-3xl font-extrabold mt-2 mb-0 text-balance">{campaignDisplayName(campaign)}</h1>
          </div>

          {meta?.description && <p className="m-0 opacity-80 leading-relaxed">{meta.description}</p>}

          <div className="flex flex-wrap gap-2">
            {campaign.flash && status === "open" && (
              <div className="badge badge-warning gap-1 font-semibold">
                <BoltIcon className="h-3 w-3" />
                só hoje — termina em <Countdown target={campaign.endTime} />
              </div>
            )}
            {campaign.startTime > 0n && status === "upcoming" && (
              <div className="badge badge-info gap-1">
                abre em <Countdown target={campaign.startTime} />
              </div>
            )}
            {remaining !== null && status === "open" && (
              <div className="badge badge-ghost">
                restam {remaining.toString()} de {campaign.maxSupply.toString()}
              </div>
            )}
          </div>

          <div className="text-3xl font-black text-primary">{formatPrice(campaign.price)}</div>

          {comboCampaigns.length > 0 && (
            <div className="rounded-box border border-success/40 bg-success/10 p-4 flex flex-col gap-2">
              <span className="font-semibold flex items-center gap-2">
                <GiftIcon className="h-5 w-5 text-success" />
                Comprando, você ganha de brinde:
              </span>
              {comboCampaigns.map(combo => (
                <Link
                  key={combo.id.toString()}
                  href={`/campanha/${combo.id.toString()}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  <div className="w-12 h-12 shrink-0 rounded-field overflow-hidden border border-base-300">
                    <CampaignImage campaign={combo} />
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{campaignDisplayName(combo)}</div>
                    <div className="opacity-60 text-xs">
                      {combo.metadata?.establishment ?? categoryInfo(combo.category).label}
                    </div>
                  </div>
                </Link>
              ))}
              <span className="text-xs opacity-60">O brinde é entregue junto, enquanto houver estoque dele.</span>
            </div>
          )}

          <div className="border-t border-base-300 pt-4">
            <MintPanel campaign={campaign} />
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold mb-4">Como funciona</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {HOW_IT_WORKS.map(({ Icon, title, text }, i) => (
            <div
              key={title}
              className="card bg-base-100 border border-base-300 rounded-2xl shadow-xs p-5 flex-row sm:flex-col gap-4 items-start"
            >
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-content text-xs font-black flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div>
                <h3 className="font-bold m-0">{title}</h3>
                <p className="text-sm opacity-70 mt-1 mb-0">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CampaignDetail;
