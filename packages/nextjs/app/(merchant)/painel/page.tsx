"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import {
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  QrCodeIcon,
  TicketIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { CampaignCard } from "~~/components/vitrine/CampaignCard";
import { CreateProgramModal } from "~~/components/vitrine/CreateProgramModal";
import { useCampaigns } from "~~/hooks/vitrine/useCampaigns";

/**
 * Visão geral do lojista. Por enquanto entrega o que já existe de verdade —
 * criar programa e ver os programas publicados. O resto do painel (catálogo,
 * regras de pontuação, equipe, assinatura) chega no M6.
 */
const Painel: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { campaigns, isLoading } = useCampaigns();
  const [criando, setCriando] = useState(false);

  // Sem estabelecimento on-chain ainda (M3), a aproximação possível é filtrar
  // pelo criador. Vira consulta por establishmentId quando o registry evoluir.
  const minhas = useMemo(() => campaigns.filter(c => c.active), [campaigns]);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <TicketIcon className="w-12 h-12 text-primary/60" />
        <h1 className="text-2xl font-serif font-black m-0 text-secondary">Entre com a conta da loja</h1>
        <p className="m-0 text-sm opacity-75 max-w-sm">
          É por aqui que você cria programas de fidelidade e acompanha o que está no ar.
        </p>
        <RainbowKitCustomConnectButton />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-base-300 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black m-0 tracking-tight text-secondary">Visão geral</h1>
          <p className="m-0 mt-1 text-sm opacity-75">
            {address && (
              <>
                Conectado como <span className="font-mono">{`${address.slice(0, 6)}…${address.slice(-4)}`}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/pdv" className="btn btn-ghost btn-sm rounded-xl gap-1.5">
            <QrCodeIcon className="w-4 h-4" />
            Abrir o balcão
          </Link>
          <button type="button" onClick={() => setCriando(true)} className="btn btn-primary btn-sm rounded-xl gap-1.5">
            <PlusIcon className="w-4 h-4 stroke-[2.5]" />
            Novo programa
          </button>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-serif font-extrabold m-0 text-secondary">Programas no ar</h2>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <span className="loading loading-spinner loading-lg text-primary" />
          </div>
        ) : minhas.length === 0 ? (
          <div className="text-center py-14 rounded-box border-2 border-dashed border-base-300 bg-base-100 px-6">
            <TicketIcon className="w-10 h-10 mx-auto text-primary/60 mb-2" />
            <p className="m-0 font-serif font-bold text-secondary">Nenhum programa publicado ainda.</p>
            <p className="m-0 mt-1 mb-4 text-sm opacity-70">
              Crie o primeiro e ele aparece na vitrine e no mapa do bairro.
            </p>
            <button type="button" onClick={() => setCriando(true)} className="btn btn-primary btn-sm rounded-xl">
              Criar meu primeiro programa
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {minhas.map(c => (
              <CampaignCard key={c.id.toString()} campaign={c} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-box border border-base-300 bg-base-100 p-5 flex gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-base-300/60 text-base-content/50 flex items-center justify-center shrink-0">
          <WrenchScrewdriverIcon className="w-5 h-5" />
        </span>
        <div className="flex flex-col gap-1">
          <strong className="font-serif font-extrabold text-secondary">O painel completo chega no M6</strong>
          <p className="m-0 text-sm opacity-75 leading-relaxed">
            Catálogo de produtos, regras de quantos reais valem um carimbo, recompensas, equipe do balcão e assinatura.
            Até lá, os programas são criados por aqui e o cadastro da loja é feito pela nossa equipe.
          </p>
          <Link href="/para-comerciantes" className="text-sm text-primary font-semibold inline-flex items-center gap-1">
            Ver os planos
            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      <CreateProgramModal isOpen={criando} onClose={() => setCriando(false)} />
    </div>
  );
};

export default Painel;
