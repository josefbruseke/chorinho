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
      className={`rounded-3xl border-2 border-dashed border-kraft-edge bg-gradient-to-br from-base-200 via-kraft to-craft p-5 md:p-6 shadow-sm relative overflow-hidden ${className}`}
    >
      {/* Detalhe estético de cantos de papel */}
      <div className="flex items-center justify-between pb-4 border-b border-base-300">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-kraft-ink">{category}</span>
          <h3 className="font-serif text-lg md:text-xl font-extrabold text-secondary tracking-tight">
            {establishmentName}
          </h3>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-base-300 text-base-content">
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
                    ? "bg-primary text-primary-content shadow-md scale-105 rotate-[-3deg]"
                    : isRewardSlot
                      ? "border-2 border-dashed border-accent bg-honey-soft/60 text-honey-ink"
                      : "border-2 border-dashed border-kraft-edge bg-base-100/70 text-base-content/70"
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
                  <span className="absolute -bottom-2 text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full bg-accent text-accent-content tracking-wider">
                    Chorinho
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rodapé da Cartela */}
      <div className="pt-4 border-t border-base-300 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="text-center sm:text-left">
          <p className="text-xs text-kraft-ink font-medium">Recompensa ao completar:</p>
          <p className="text-sm font-bold text-secondary">{rewardText}</p>
        </div>

        {interactive && onStamp && (
          <button
            type="button"
            onClick={onStamp}
            className="btn btn-sm btn-primary min-h-12 rounded-xl font-bold gap-1.5 shadow-sm active:scale-95"
          >
            {isComplete ? "Reiniciar Cartela" : "+ Carimbar Balcão"}
          </button>
        )}
      </div>

      {/* Banner de Celebração quando completa */}
      {isComplete && (
        <div className="mt-3 p-3 rounded-2xl bg-success/12 border border-success/30 text-center">
          <p className="text-xs font-bold text-success flex items-center justify-center gap-1.5">
            <SparklesIcon className="w-4 h-4 text-success" />
            Cartela premiada! Peça seu chorinho ao atendente no balcão.
          </p>
        </div>
      )}
    </div>
  );
};
