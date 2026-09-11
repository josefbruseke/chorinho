"use client";

import React, { useState } from "react";
import { keccak256, stringToHex } from "viem";
import { useAccount } from "wagmi";
import {
  BuildingStorefrontIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClockIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { CounterPad } from "~~/components/design-system/CounterPad";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { useCampaigns } from "~~/hooks/vitrine/useCampaigns";
import { campaignDisplayName, categoryInfo } from "~~/utils/vitrine";

export const MerchantTerminal: React.FC = () => {
  const { address } = useAccount();
  const { campaigns } = useCampaigns();

  // Mode: "keypad" | "test-client"
  const [inputMode, setInputMode] = useState<"keypad" | "direct">("keypad");
  const [customerInput, setCustomerInput] = useState("");
  const [selectedTokenId, setSelectedTokenId] = useState<bigint>(0n);
  const [redeemedStatus, setRedeemedStatus] = useState<string | null>(null);

  // Simulated attendants log
  const [recentLogs, setRecentLogs] = useState<Array<{ name: string; action: string; time: string }>>([
    { name: "Café do Bairro", action: "+1 Carimbo registrado", time: "Há 4 min" },
    { name: "Padaria Trigo Santo", action: "Chorinho da Casa resgatado", time: "Há 18 min" },
  ]);

  const targetCampaign = campaigns.find(c => c.id === selectedTokenId) ?? campaigns[0];

  // Resolve customer address: if input is a hex address use it; if it is a PIN or empty in test mode, fallback to user address or test anvil address
  const resolvedCustomerAddress =
    customerInput.startsWith("0x") && customerInput.length === 42
      ? (customerInput as `0x${string}`)
      : (address ?? "0x70997970C51812dc3A010C7d01b50e0d17dc79C8");

  const { data: customerBalance, refetch: refetchBalance } = useScaffoldReadContract({
    contractName: "DiscountNFT",
    functionName: "balanceOf",
    args: [resolvedCustomerAddress, targetCampaign ? targetCampaign.id : 0n],
    watch: true,
  });

  const { writeContractAsync: writeDiscount, isMining } = useScaffoldWriteContract({
    contractName: "DiscountNFT",
  });

  // Action 1: Add a stamp to the customer (mint 1 unit to customer)
  const handleAddStamp = async () => {
    if (!targetCampaign) return;
    try {
      await writeDiscount({
        functionName: "mint",
        args: [targetCampaign.id, 1n],
        value: targetCampaign.price,
      });
      await refetchBalance();
      setRecentLogs(prev => [
        {
          name: targetCampaign.metadata?.establishment ?? "Balcão Local",
          action: `+1 Carimbo creditado para ${resolvedCustomerAddress.slice(0, 6)}...`,
          time: "Agora",
        },
        ...prev.slice(0, 4),
      ]);
      setRedeemedStatus("+1 Carimbo adicionado na cartela do cliente com sucesso!");
    } catch (e) {
      console.error(e);
    }
  };

  // Action 2: Redeem the courtesy reward (burn 1 unit on-chain)
  const handleRedeem = async () => {
    if (!targetCampaign) return;
    const ref = keccak256(stringToHex(`${resolvedCustomerAddress}-${targetCampaign.id}-${Date.now()}`));
    try {
      await writeDiscount({
        functionName: "redeem",
        args: [resolvedCustomerAddress, targetCampaign.id, 1n, ref],
      });
      await refetchBalance();
      setRecentLogs(prev => [
        {
          name: targetCampaign.metadata?.establishment ?? "Balcão Local",
          action: `Chorinho entregue: ${campaignDisplayName(targetCampaign)}`,
          time: "Agora",
        },
        ...prev.slice(0, 4),
      ]);
      setRedeemedStatus(`Chorinho entregue e baixado na blockchain: ${campaignDisplayName(targetCampaign)}!`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestClient = () => {
    if (address) {
      setCustomerInput(address);
    } else {
      setCustomerInput("0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-6 px-4">
      {/* Header do Terminal do Balcão */}
      <div className="bg-gradient-to-r from-secondary to-[#38291e] text-secondary-content rounded-3xl p-6 sm:p-8 shadow-md mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 text-accent border border-accent/30 text-xs font-black uppercase tracking-wider mb-2">
              <BuildingStorefrontIcon className="w-4 h-4" />
              <span>Terminal de Caixa & Balcão</span>
            </span>
            <h2 className="font-serif font-black text-2xl sm:text-3xl text-secondary-content m-0">
              Operação de Atendimento Físico
            </h2>
            <p className="text-xs sm:text-sm text-secondary-content/80 mt-1 mb-0 max-w-xl">
              Registre a visita do cliente, carimbe a cartela digital instantaneamente ou dê baixa no chorinho cortesia.
            </p>
          </div>

          {!address ? (
            <div className="self-start sm:self-auto">
              <RainbowKitCustomConnectButton />
            </div>
          ) : (
            <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs">
              <UserIcon className="w-4 h-4 text-accent" />
              <span className="font-mono">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
              <span className="badge badge-success badge-xs">Ativo</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Coluna da Esquerda: Seleção de Balcão e Digitação do Cliente */}
        <div className="md:col-span-7 space-y-5">
          {/* Seletor de Estabelecimento */}
          <div className="bg-white rounded-3xl border border-[#ebe3d5] p-5 shadow-xs">
            <label className="block text-xs font-black uppercase tracking-wider text-secondary/60 mb-2">
              1. Selecione o Seu Balcão:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {campaigns.slice(0, 4).map(c => {
                const isSelected = targetCampaign?.id === c.id;
                const cat = categoryInfo(c.category);
                return (
                  <button
                    key={c.id.toString()}
                    type="button"
                    onClick={() => {
                      setSelectedTokenId(c.id);
                      setRedeemedStatus(null);
                    }}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? "border-primary bg-primary/10 text-secondary font-bold shadow-xs"
                        : "border-[#ebe3d5] bg-[#fdfbf7] hover:border-primary/40 text-secondary/80"
                    }`}
                  >
                    <div className="truncate pr-2">
                      <span className="text-[11px] font-bold block opacity-60">{cat.label}</span>
                      <span className="text-sm font-extrabold truncate block">
                        {c.metadata?.establishment ?? "Comércio Local"}
                      </span>
                    </div>
                    {isSelected && <CheckCircleIcon className="w-5 h-5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identificação do Cliente */}
          <div className="bg-white rounded-3xl border border-[#ebe3d5] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-secondary/60">
                2. Código do Cliente no Balcão:
              </label>

              <button
                type="button"
                onClick={handleTestClient}
                className="btn btn-xs btn-outline btn-primary rounded-xl font-bold gap-1"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>Preencher Cliente Teste</span>
              </button>
            </div>

            {/* Alternar Teclado Numérico ou Campo de Texto */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInputMode("keypad")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  inputMode === "keypad"
                    ? "bg-primary text-primary-content border-primary"
                    : "bg-[#fdfbf7] border-[#ebe3d5] text-secondary/70"
                }`}
              >
                Teclado Numérico Rápido
              </button>
              <button
                type="button"
                onClick={() => setInputMode("direct")}
                className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${
                  inputMode === "direct"
                    ? "bg-primary text-primary-content border-primary"
                    : "bg-[#fdfbf7] border-[#ebe3d5] text-secondary/70"
                }`}
              >
                Endereço / Carteira
              </button>
            </div>

            {inputMode === "keypad" ? (
              <CounterPad
                value={customerInput}
                onChange={val => {
                  setCustomerInput(val);
                  setRedeemedStatus(null);
                }}
                placeholder="Ex: 482910"
                maxLength={6}
              />
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="0x... ou cole o endereço do cliente"
                  value={customerInput}
                  onChange={e => {
                    setCustomerInput(e.target.value);
                    setRedeemedStatus(null);
                  }}
                  className="input input-bordered w-full rounded-2xl text-xs font-mono bg-[#fdfbf7] border-[#ebe3d5]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Painel de Ações do Balcão */}
        <div className="md:col-span-5 space-y-5">
          {/* Status do Cliente Selecionado */}
          <div className="bg-white rounded-3xl border border-[#ebe3d5] p-5 shadow-xs space-y-4">
            <h3 className="font-serif font-black text-lg text-secondary m-0 border-b border-[#ebe3d5] pb-3">
              Cartela do Cliente
            </h3>

            {targetCampaign && (
              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-2xl bg-[#fdfbf7] border border-[#ebe3d5] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-secondary/60">Local:</span>
                    <span className="font-bold text-secondary">
                      {targetCampaign.metadata?.establishment ?? "Comércio de Bairro"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary/60">Recompensa:</span>
                    <span className="font-extrabold text-primary">{campaignDisplayName(targetCampaign)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary/60">Saldo de Carimbos:</span>
                    <span className="font-extrabold text-base text-secondary">
                      {customerBalance !== undefined ? customerBalance.toString() : "0"} carimbos
                    </span>
                  </div>
                </div>

                {/* Feedback de Ação Executada */}
                {redeemedStatus && (
                  <div className="p-3 rounded-2xl bg-success/15 border border-success/30 text-success text-xs font-bold flex items-center gap-2 animate-fade-in">
                    <CheckCircleIcon className="w-5 h-5 shrink-0" />
                    <span>{redeemedStatus}</span>
                  </div>
                )}

                {/* Botões de Ação do Atendente */}
                <div className="space-y-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleAddStamp}
                    disabled={isMining}
                    className="btn btn-primary w-full rounded-2xl font-extrabold shadow-sm gap-2 text-sm"
                  >
                    {isMining ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <SparklesIcon className="w-4 h-4 stroke-[2.5]" />
                    )}
                    <span>+1 Carimbo no Balcão</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRedeem}
                    disabled={isMining || (customerBalance !== undefined && customerBalance === 0n)}
                    className="btn btn-outline btn-secondary w-full rounded-2xl font-extrabold shadow-sm gap-2 text-sm disabled:opacity-40"
                  >
                    <CheckBadgeIcon className="w-4 h-4" />
                    <span>Entregar Recompensa (Resgatar)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Histórico Recente de Atendimentos */}
          <div className="bg-white rounded-3xl border border-[#ebe3d5] p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-secondary/60">
              <ClockIcon className="w-4 h-4" />
              <span>Atendimentos de Hoje:</span>
            </div>

            <div className="space-y-2">
              {recentLogs.map((log, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-2xl bg-[#fdfbf7] border border-[#ebe3d5] text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-secondary block">{log.name}</span>
                    <span className="text-[11px] text-primary font-semibold">{log.action}</span>
                  </div>
                  <span className="text-[10px] text-secondary/50 font-mono">{log.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
