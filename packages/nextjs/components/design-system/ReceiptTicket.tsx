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
    <div className={`relative bg-base-100 rounded-3xl border border-base-300 shadow-sm overflow-hidden ${className}`}>
      {/* Top Header: Informações da Loja */}
      <div className="p-6 bg-kraft border-b border-base-300">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-kraft-ink">{category}</span>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-honey-ink bg-honey-soft px-2.5 py-0.5 rounded-full border border-honey-edge">
            <SparklesIcon className="w-3.5 h-3.5" />
            Chorinho
          </span>
        </div>
        <h3 className="font-serif text-xl font-extrabold text-secondary mt-1">{establishmentName}</h3>
        <p className="text-base font-semibold text-brand-ink mt-0.5">{offerTitle}</p>
      </div>

      {/* Perforation Line com entalhes circulares clássicos de bilhete físico */}
      <div className="relative py-2 bg-base-100 flex items-center">
        <div className="absolute -left-3.5 w-7 h-7 rounded-full bg-base-200 border-r border-base-300" />
        <div className="w-full border-b-2 border-dashed border-base-300 mx-5" />
        <div className="absolute -right-3.5 w-7 h-7 rounded-full bg-base-200 border-l border-base-300" />
      </div>

      {/* Ticket Body: QR Code e Dados de Balcão */}
      <div className="p-6 bg-base-100 space-y-4">
        {qrSlot && <div className="flex justify-center">{qrSlot}</div>}

        <div className="grid grid-cols-2 gap-3 text-center pt-2">
          {remainingUses !== undefined && (
            <div className="p-2.5 rounded-2xl bg-kraft border border-base-300">
              <span className="block text-[11px] font-medium text-kraft-ink">Disponíveis</span>
              <span className="text-sm font-extrabold text-secondary">{remainingUses} chorinhos</span>
            </div>
          )}

          {validUntil && (
            <div className="p-2.5 rounded-2xl bg-kraft border border-base-300">
              <span className="block text-[11px] font-medium text-kraft-ink">Validade</span>
              <span className="text-sm font-extrabold text-secondary">{validUntil}</span>
            </div>
          )}
        </div>

        {ticketCode && (
          <div className="text-center py-2">
            <span className="text-[11px] font-semibold text-kraft-ink uppercase tracking-wider block mb-1">
              Código do Balcão
            </span>
            <span className="font-mono text-base font-black tracking-widest text-secondary px-4 py-1.5 rounded-xl bg-craft border border-base-300">
              {ticketCode}
            </span>
          </div>
        )}

        {actionSlot && <div className="pt-2">{actionSlot}</div>}
      </div>
    </div>
  );
};
