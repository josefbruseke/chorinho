"use client";

import React, { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { BuildingStorefrontIcon, CheckCircleIcon, SparklesIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { CATEGORIES } from "~~/utils/vitrine";

export interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProgramModal: React.FC<CreateProgramModalProps> = ({ isOpen, onClose }) => {
  const { address } = useAccount();
  const [establishment, setEstablishment] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [rewardName, setRewardName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(0);
  const [priceEth, setPriceEth] = useState("0");
  const [isSuccess, setIsSuccess] = useState(false);

  const { writeContractAsync, isMining } = useScaffoldWriteContract({
    contractName: "DiscountNFT",
  });

  if (!isOpen) return null;

  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!establishment || !rewardName) return;

    const metadata = {
      name: rewardName,
      description: description || `Chorinho de cortesia do ${establishment}.`,
      establishment,
      neighborhood: neighborhood || "Bairro Local",
      cuisine: CATEGORIES[category].label,
    };

    const uri = `data:application/json,${encodeURIComponent(JSON.stringify(metadata))}`;
    const nextTokenId = BigInt(Date.now() % 100000);

    try {
      await writeContractAsync({
        functionName: "createCampaign",
        args: [
          nextTokenId,
          {
            price: parseEther(priceEth || "0"),
            maxSupply: 100n,
            startTime: 0n,
            endTime: 0n,
            maxPerWallet: 5n,
            category: category,
            flash: false,
            comboTokenIds: [],
            uri: uri,
          },
        ],
      });
      setIsSuccess(true);
    } catch (err) {
      console.error("Create campaign error:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-base-100 rounded-3xl border border-base-300 shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="p-5 bg-kraft border-b border-base-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BuildingStorefrontIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-black text-lg text-secondary m-0 leading-tight">
                Criar Cartela para Seu Comércio
              </h3>
              <span className="text-[11px] font-semibold text-primary">Área do Lojista</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle text-secondary/60 hover:text-secondary"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Formulário ou Sucesso */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-6 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 stroke-[2]" />
              </div>
              <h3 className="font-serif font-black text-2xl text-secondary m-0">Programa Publicado na Blockchain!</h3>
              <p className="text-sm opacity-75 mt-1 mb-0 max-w-xs leading-relaxed">
                Seu comércio agora está ativo na rede Chorinho. Seus clientes já podem começar a carimbar no seu balcão!
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSuccess(false);
                  onClose();
                }}
                className="btn btn-primary rounded-2xl w-full font-bold mt-2"
              >
                Concluir
              </button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {!address ? (
                <div className="py-6 flex flex-col items-center gap-3 text-center">
                  <p className="text-xs text-secondary/70 m-0">
                    Conecte a carteira do seu estabelecimento para publicar o programa:
                  </p>
                  <RainbowKitCustomConnectButton />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Nome do Estabelecimento *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Padaria Trigo Santo"
                        value={establishment}
                        onChange={e => setEstablishment(e.target.value)}
                        className="input input-bordered w-full rounded-xl text-xs bg-kraft border-base-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Bairro / Localidade *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Centro Histórico"
                        value={neighborhood}
                        onChange={e => setNeighborhood(e.target.value)}
                        className="input input-bordered w-full rounded-xl text-xs bg-kraft border-base-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary mb-1">
                      O &quot;Chorinho&quot; (Recompensa Cortesia) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 1 Café Filtrado Especial + Pão de Queijo"
                      value={rewardName}
                      onChange={e => setRewardName(e.target.value)}
                      className="input input-bordered w-full rounded-xl text-xs bg-kraft border-base-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-secondary mb-1">Regra / Descrição do Agrado</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: A cada 5 compras no balcão, ganhe um chorinho especial da casa."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      className="textarea textarea-bordered w-full rounded-xl text-xs bg-kraft border-base-300"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Categoria</label>
                      <select
                        value={category}
                        onChange={e => setCategory(Number(e.target.value))}
                        className="select select-bordered w-full rounded-xl text-xs bg-kraft border-base-300"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-secondary mb-1">Custo para o Cliente (ETH)</label>
                      <input
                        type="text"
                        placeholder="0 para Grátis"
                        value={priceEth}
                        onChange={e => setPriceEth(e.target.value)}
                        className="input input-bordered w-full rounded-xl text-xs bg-kraft border-base-300"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isMining}
                    className="btn btn-primary w-full rounded-2xl font-extrabold shadow-md gap-2 mt-3"
                  >
                    {isMining ? (
                      <>
                        <span className="loading loading-spinner loading-sm" />
                        <span>Registrando na rede...</span>
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="w-5 h-5" />
                        <span>Publicar Cartela de Fidelidade</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
