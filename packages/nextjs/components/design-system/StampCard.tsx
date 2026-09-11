import React from "react";
import { CheckIcon } from "@heroicons/react/24/outline";
import { SparklesIcon } from "@heroicons/react/24/solid";

export interface StampCardProps {
  establishmentName: string;
  category?: string;
  totalSlots?: number;
  punchedSlots: number;
  rewardText: string;
  onStamp?: () => void;
  interactive?: boolean;
  className?: string;
}

export const StampCard: React.FC<StampCardProps> = ({
  establishmentName,
  category = "Comércio Local",
  totalSlots = 5,
  punchedSlots,
  rewardText,
  onStamp,
  interactive = false,
  className = "",
}) => {
  const isComplete = punchedSlots >= totalSlots;

  return (
    <div
      className={`rounded-3xl border-2 border-dashed border-[#d8c7b0] bg-gradient-to-br from-[#fbf8f2] via-[#f7f2ea] to-[#f4ede2] p-5 md:p-6 shadow-sm relative overflow-hidden ${className}`}
    >
      {/* Detalhe estético de cantos de papel */}
      <div className="flex items-center justify-between pb-4 border-b border-[#ebe3d5]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#856d5c]">{category}</span>
          <h3 className="text-lg md:text-xl font-extrabold text-[#261c14] tracking-tight">{establishmentName}</h3>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#ebe3d5] text-[#4f3c2e]">
          {punchedSlots} de {totalSlots} carimbos
        </span>
      </div>

      {/* Grade de Carimbos táteis */}
      <div className="py-6">
        <div className="flex items-center justify-center gap-2.5 sm:gap-4 flex-wrap">
          {Array.from({ length: totalSlots }).map((_, index) => {
            const isPunched = index < punchedSlots;
            const isRewardSlot = index === totalSlots - 1;

            return (
              <div
                key={index}
                className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex flex-col items-center justify-center transition-all duration-200 ${
                  isPunched
                    ? "bg-[#c2410c] text-white shadow-md scale-105 rotate-[-3deg]"
                    : isRewardSlot
                      ? "border-2 border-dashed border-[#d97706] bg-[#fef3c7]/60 text-[#d97706]"
                      : "border-2 border-dashed border-[#d8c7b0] bg-white/70 text-[#a89483]"
                }`}
              >
                {isPunched ? (
                  <CheckIcon className="w-6 h-6 stroke-[3]" />
                ) : isRewardSlot ? (
                  <SparklesIcon className="w-6 h-6" />
                ) : (
                  <span className="text-sm font-extrabold">{index + 1}</span>
                )}

                {isRewardSlot && !isPunched && (
                  <span className="absolute -bottom-2 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-[#d97706] text-white tracking-wider">
                    Chorinho
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rodapé da Cartela */}
      <div className="pt-4 border-t border-[#ebe3d5] flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <p className="text-xs text-[#856d5c] font-medium">Recompensa ao completar:</p>
          <p className="text-sm font-bold text-[#261c14]">{rewardText}</p>
        </div>

        {interactive && onStamp && (
          <button
            type="button"
            onClick={onStamp}
            className="btn btn-sm btn-primary rounded-xl font-bold gap-1.5 shadow-sm active:scale-95"
          >
            {isComplete ? "Reiniciar Cartela" : "+ Carimbar Balcão"}
          </button>
        )}
      </div>

      {/* Banner de Celebração quando completa */}
      {isComplete && (
        <div className="mt-3 p-3 rounded-2xl bg-[#dcfce7] border border-[#bbf7d0] text-center">
          <p className="text-xs font-bold text-[#15803d] flex items-center justify-center gap-1.5">
            <SparklesIcon className="w-4 h-4 text-[#15803d]" />
            Cartela premiada! Peça seu chorinho ao atendente no balcão.
          </p>
        </div>
      )}
    </div>
  );
};
