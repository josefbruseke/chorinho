"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useAccount } from "wagmi";
import {
  CheckBadgeIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  QrCodeIcon,
  SparklesIcon,
  TicketIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useMyCoupons } from "~~/hooks/vitrine/useMyCoupons";
import { encodeCouponQr } from "~~/utils/vitrine";

export const CustomerPassModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { address, isConnected } = useAccount();
  const { coupons } = useMyCoupons();

  const activeCoupon = coupons[0];
  const customerPin = address ? address.slice(2, 8).toUpperCase() : "CHORIN";

  const qrValue =
    address && activeCoupon
      ? encodeCouponQr({ owner: address, tokenId: activeCoupon.campaign.id })
      : address
        ? `chorinho:${address}:0`
        : "chorinho:demo:0";

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(customerPin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Botão Flutuante Fixo para Acesso Rápido no Balcão */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="btn btn-primary shadow-xl rounded-full px-5 py-3 h-auto gap-2.5 font-extrabold text-sm border-2 border-white/20 hover:scale-105 active:scale-95 transition-all flex items-center"
        >
          <QrCodeIcon className="w-5 h-5 stroke-[2.5]" />
          <span>Meu Passe de Balcão</span>
          {coupons.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-accent text-secondary text-xs flex items-center justify-center font-black">
              {coupons.length}
            </span>
          )}
        </button>
      </div>

      {/* Modal Interativo do Passe do Cliente */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm bg-white rounded-3xl border border-[#ebe3d5] shadow-2xl overflow-hidden animate-scale-up">
            {/* Header do Bilhete */}
            <div className="p-5 bg-[#fdfbf7] border-b border-[#ebe3d5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <TicketIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-lg text-secondary m-0 leading-tight">Passe do Cliente</h3>
                  <span className="text-[11px] font-semibold text-primary">Chorinho Oficial</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-ghost btn-sm btn-circle text-secondary/60 hover:text-secondary"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo do Passe */}
            <div className="p-6 flex flex-col items-center text-center space-y-4">
              {!isConnected ? (
                <div className="py-6 flex flex-col items-center gap-3">
                  <p className="text-xs text-secondary/70 m-0">
                    Conecte sua carteira para gerar seu passe de balcão e receber carimbos:
                  </p>
                  <RainbowKitCustomConnectButton />
                </div>
              ) : (
                <>
                  <p className="text-xs text-secondary/70 m-0">
                    Mostre este QR code ao atendente no balcão para registrar sua visita ou retirar seu chorinho.
                  </p>

                  {/* QR Code de Alta Legibilidade com Moldura Clara */}
                  <div className="p-4 bg-white rounded-2xl border-2 border-dashed border-[#ebe3d5] shadow-xs">
                    <QRCodeSVG value={qrValue} size={180} level="M" marginSize={1} />
                  </div>

                  {/* Código Numérico Alternativo (PIN) */}
                  <div className="w-full bg-[#fdfbf7] p-3 rounded-2xl border border-[#ebe3d5] flex items-center justify-between">
                    <div className="text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary/50 block">
                        Código do Balcão
                      </span>
                      <span className="font-mono text-lg font-black text-secondary tracking-wider">#{customerPin}</span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopy}
                      className="btn btn-ghost btn-xs gap-1 text-primary font-bold"
                    >
                      {copied ? (
                        <>
                          <ClipboardDocumentCheckIcon className="w-4 h-4 text-success" />
                          <span className="text-success">Copiado</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-4 h-4" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Status das Cartelas Ativas */}
                  <div className="w-full text-left pt-2 border-t border-[#ebe3d5]">
                    <div className="flex items-center justify-between text-xs font-bold text-secondary mb-2">
                      <span className="flex items-center gap-1">
                        <CheckBadgeIcon className="w-4 h-4 text-primary" />
                        Cartelas Ativas:
                      </span>
                      <span className="text-primary font-extrabold">{coupons.length} disponíveis</span>
                    </div>

                    {coupons.length === 0 ? (
                      <div className="p-3 rounded-xl bg-[#fbf8f2] text-xs text-secondary/70 text-center">
                        Você ainda não possui carimbos. Escolha um estabelecimento e inicie sua primeira cartela!
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {coupons.map(c => (
                          <div
                            key={c.campaign.id.toString()}
                            className="p-2 rounded-xl bg-[#fdfbf7] border border-[#ebe3d5] flex items-center justify-between text-xs"
                          >
                            <span className="font-bold text-secondary truncate max-w-[170px]">
                              {c.campaign.metadata?.establishment ?? "Comércio Local"}
                            </span>
                            <span className="font-extrabold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                              {c.balance.toString()} carimbos
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Rodapé */}
            <div className="p-4 bg-[#fdfbf7] border-t border-[#ebe3d5] text-center">
              <span className="text-[11px] font-medium text-secondary/60 flex items-center justify-center gap-1">
                <SparklesIcon className="w-3.5 h-3.5 text-accent" />
                Válido em todos os balcões credenciados do bairro
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
