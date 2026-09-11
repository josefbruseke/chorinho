import React from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";

export interface ReceiptTicketProps {
  establishmentName: string;
  category?: string;
  offerTitle: string;
  ticketCode?: string;
  remainingUses?: number;
  validUntil?: string;
  qrSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  className?: string;
}

export const ReceiptTicket: React.FC<ReceiptTicketProps> = ({
  establishmentName,
  category = "Comércio de Bairro",
  offerTitle,
  ticketCode,
  remainingUses,
  validUntil,
  qrSlot,
  actionSlot,
  className = "",
}) => {
  return (
    <div className={`relative bg-white rounded-3xl border border-[#ebe3d5] shadow-sm overflow-hidden ${className}`}>
      {/* Top Header: Informações da Loja */}
      <div className="p-6 bg-[#fdfbf7] border-b border-[#ebe3d5]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#856d5c]">{category}</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#d97706] bg-[#fef3c7] px-2.5 py-0.5 rounded-full border border-[#fde68a]">
            <SparklesIcon className="w-3.5 h-3.5" />
            Chorinho
          </span>
        </div>
        <h3 className="text-xl font-extrabold text-[#261c14] mt-1">{establishmentName}</h3>
        <p className="text-base font-semibold text-[#c2410c] mt-0.5">{offerTitle}</p>
      </div>

      {/* Perforation Line com entalhes circulares clássicos de bilhete físico */}
      <div className="relative py-2 bg-white flex items-center">
        <div className="absolute -left-3.5 w-7 h-7 rounded-full bg-[#fbf8f2] border-r border-[#ebe3d5]" />
        <div className="w-full border-b-2 border-dashed border-[#ebe3d5] mx-5" />
        <div className="absolute -right-3.5 w-7 h-7 rounded-full bg-[#fbf8f2] border-l border-[#ebe3d5]" />
      </div>

      {/* Ticket Body: QR Code e Dados de Balcão */}
      <div className="p-6 bg-white space-y-4">
        {qrSlot && <div className="flex justify-center">{qrSlot}</div>}

        <div className="grid grid-cols-2 gap-3 text-center pt-2">
          {remainingUses !== undefined && (
            <div className="p-2.5 rounded-2xl bg-[#fdfbf7] border border-[#ebe3d5]">
              <span className="block text-[11px] font-medium text-[#856d5c]">Disponíveis</span>
              <span className="text-sm font-extrabold text-[#261c14]">{remainingUses} chorinhos</span>
            </div>
          )}

          {validUntil && (
            <div className="p-2.5 rounded-2xl bg-[#fdfbf7] border border-[#ebe3d5]">
              <span className="block text-[11px] font-medium text-[#856d5c]">Validade</span>
              <span className="text-sm font-extrabold text-[#261c14]">{validUntil}</span>
            </div>
          )}
        </div>

        {ticketCode && (
          <div className="text-center py-2">
            <span className="text-[11px] font-semibold text-[#856d5c] uppercase tracking-wider block mb-1">
              Código do Balcão
            </span>
            <span className="font-mono text-base font-black tracking-widest text-[#261c14] px-4 py-1.5 rounded-xl bg-[#f4ede2] border border-[#ebe3d5]">
              {ticketCode}
            </span>
          </div>
        )}

        {actionSlot && <div className="pt-2">{actionSlot}</div>}
      </div>
    </div>
  );
};
