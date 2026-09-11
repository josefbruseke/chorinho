import React from "react";
import { BackspaceIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export interface CounterPadProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  placeholder?: string;
  submitLabel?: string;
  isLoading?: boolean;
}

export const CounterPad: React.FC<CounterPadProps> = ({
  value,
  onChange,
  onSubmit,
  maxLength = 6,
  placeholder = "000000",
  submitLabel = "Validar no Balcão",
  isLoading = false,
}) => {
  const handleDigit = (digit: string) => {
    if (value.length < maxLength) {
      onChange(value + digit);
    }
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white rounded-3xl border border-[#ebe3d5] p-5 shadow-sm space-y-4">
      {/* Display do Código digitado */}
      <div className="rounded-2xl bg-[#fdfbf7] border border-[#ebe3d5] p-4 text-center">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#856d5c] block mb-1">
          Código do Cliente
        </span>
        <div className="font-mono text-3xl font-black tracking-widest text-[#261c14] min-h-[40px] flex items-center justify-center">
          {value || <span className="text-[#ccaebc]/50">{placeholder}</span>}
        </div>
      </div>

      {/* Grid de Dígitos Táteis para Atendentes */}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map(digit => (
          <button
            key={digit}
            type="button"
            onClick={() => handleDigit(digit)}
            className="h-14 rounded-2xl bg-[#fbf8f2] hover:bg-[#f4ede2] border border-[#ebe3d5] text-xl font-black text-[#261c14] transition-all active:scale-95 flex items-center justify-center shadow-xs"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          onClick={handleClear}
          className="h-14 rounded-2xl bg-[#fbf8f2] hover:bg-[#f4ede2] border border-[#ebe3d5] text-xs font-bold text-[#856d5c] uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center"
        >
          Limpar
        </button>
        <button
          type="button"
          onClick={() => handleDigit("0")}
          className="h-14 rounded-2xl bg-[#fbf8f2] hover:bg-[#f4ede2] border border-[#ebe3d5] text-xl font-black text-[#261c14] transition-all active:scale-95 flex items-center justify-center shadow-xs"
        >
          0
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-14 rounded-2xl bg-[#fbf8f2] hover:bg-[#f4ede2] border border-[#ebe3d5] text-[#856d5c] transition-all active:scale-95 flex items-center justify-center"
        >
          <BackspaceIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Botão de Envio / Confirmação */}
      {onSubmit && (
        <button
          type="button"
          disabled={!value || isLoading}
          onClick={onSubmit}
          className="w-full py-4 rounded-2xl bg-[#c2410c] hover:bg-[#9a3412] text-white font-extrabold text-base shadow-md disabled:opacity-40 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <span className="loading loading-spinner loading-sm" />
          ) : (
            <CheckCircleIcon className="w-5 h-5" />
          )}
          <span>{submitLabel}</span>
        </button>
      )}
    </div>
  );
};
