"use client";

import React, { useState } from "react";
import Link from "next/link";
import { CategoryIcon } from "./CategoryIcon";
import { VerifiedBadge } from "./VerifiedBadge";
import { useAccount } from "wagmi";
import {
  CheckBadgeIcon,
  CheckCircleIcon,
  MapPinIcon,
  SparklesIcon,
  TicketIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Campaign, campaignDisplayName, categoryInfo, formatPrice } from "~~/utils/vitrine";

export interface QuickMintModalProps {
  campaign: Campaign | null;
  onClose: () => void;
}

export const QuickMintModal: React.FC<QuickMintModalProps> = ({ campaign, onClose }) => {
  const { address } = useAccount();
  const [quantity, setQuantity] = useState(1);
  const [isSuccess, setIsSuccess] = useState(false);

  const { data: alreadyMinted } = useScaffoldReadContract({
    contractName: "DiscountNFT",
    functionName: "mintedBy",
    args: [campaign ? campaign.id : 0n, address],
    watch: true,
  });

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "DiscountNFT",
  });

  if (!campaign) return null;

  const cat = categoryInfo(campaign.category);
  const meta = campaign.metadata;
  const totalPrice = campaign.price * BigInt(quantity);

  const handleMint = async () => {
    try {
      await writeContractAsync({
        functionName: "mint",
        args: [campaign.id, BigInt(quantity)],
        value: totalPrice,
      });
      setIsSuccess(true);
    } catch (e) {
      console.error("Mint error:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden animate-scale-up">
        {/* Header com Categoria e Fechar */}
        <div className="p-5 bg-kraft border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-base-200 border border-base-300 text-secondary">
              <CategoryIcon iconKey={cat.iconKey} className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </span>
            <VerifiedBadge compact />
          </div>

          {/* w-12 h-12 sobrepõe o tamanho padrão do btn-circle: alvo de toque de 48px. */}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-circle w-12 h-12 text-secondary/60 hover:text-secondary"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 space-y-5">
          {isSuccess ? (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 stroke-[2]" />
              </div>

              <div>
                <h3 className="font-serif font-black text-2xl text-secondary m-0">Cartela Adicionada!</h3>
                <p className="text-sm opacity-75 mt-1 mb-0 max-w-xs leading-relaxed">
                  Seu passe foi registrado com sucesso na blockchain. Apresente no balcão para começar a carimbar.
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-kraft border border-base-300 text-left text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-secondary/70">Estabelecimento:</span>
                  <span className="font-bold text-secondary">{meta?.establishment ?? "Comércio Local"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-secondary/70">Chorinho Prometido:</span>
                  <span className="font-bold text-primary">{campaignDisplayName(campaign)}</span>
                </div>
              </div>

              {/* "Ver Minha Carteira" vira a ação principal deste estado (o passe já está
                  garantido), por isso ganha os 56px reservados ao botão nº 1 da tela. */}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full pt-2">
                <Link
                  href="/carteira"
                  className="btn btn-primary h-14 rounded-2xl flex-1 font-black gap-1.5"
                  onClick={onClose}
                >
                  <TicketIcon className="w-5 h-5" />
                  <span>Ver Minha Carteira</span>
                </Link>
                <button type="button" onClick={onClose} className="btn btn-outline h-12 rounded-2xl font-bold">
                  Continuar Explorando
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Detalhes do Estabelecimento e Oferta */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary/70">
                  <MapPinIcon className="w-3.5 h-3.5" />
                  <span>{meta?.neighborhood ?? "Bairro Local"}</span>
                </div>
                <h3 className="font-serif font-black text-2xl text-secondary mt-1 mb-0">
                  {meta?.establishment ?? "Comércio Local"}
                </h3>
                <p className="text-base font-bold text-primary mt-0.5 mb-0">{campaignDisplayName(campaign)}</p>
              </div>

              {meta?.description && (
                <p className="text-xs text-secondary/70 m-0 leading-relaxed bg-kraft p-3 rounded-xl border border-base-300">
                  {meta.description}
                </p>
              )}

              {/* Destaque do Preço e Quantidade */}
              <div className="p-4 rounded-2xl bg-kraft border border-base-300 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-secondary/70 block">
                    Valor da Adesão
                  </span>
                  <span className="font-mono font-black text-2xl text-primary">{formatPrice(totalPrice)}</span>
                  {campaign.price === 0n && <span className="text-xs text-success font-bold ml-1.5">Gratuito</span>}
                </div>

                {/* Botões de +/- em 48px: é onde o polegar erra mais em modais de compra. */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    aria-label="Diminuir quantidade"
                    className="w-12 h-12 rounded-xl border border-base-300 bg-base-100 font-black text-lg text-secondary disabled:opacity-30 active:scale-95"
                  >
                    −
                  </button>
                  <span className="font-mono font-black text-lg min-w-6 text-center text-secondary">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    aria-label="Aumentar quantidade"
                    className="w-12 h-12 rounded-xl border border-base-300 bg-base-100 font-black text-lg text-secondary active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Status de Carimbos Anteriores */}
              {alreadyMinted && alreadyMinted > 0n && (
                <div className="flex items-center gap-2 text-xs text-secondary/70 p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                  <CheckBadgeIcon className="w-4 h-4 text-accent shrink-0" />
                  <span>Você já possui {alreadyMinted.toString()} cartela(s) ativas deste local.</span>
                </div>
              )}

              {/* Ação de Conectar ou Comprar */}
              {!address ? (
                <div className="pt-2 flex flex-col items-center gap-2 text-center">
                  <p className="text-xs opacity-70 m-0">Conecte sua carteira para entrar no programa:</p>
                  <RainbowKitCustomConnectButton />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleMint}
                  disabled={isMining}
                  className="btn btn-primary h-14 w-full rounded-2xl font-black shadow-md gap-2"
                >
                  {isMining ? (
                    <>
                      <span className="loading loading-spinner loading-sm" />
                      <span>Confirmando no balcão...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5 stroke-[2.5]" />
                      <span>Garantir Minha Cartela</span>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
