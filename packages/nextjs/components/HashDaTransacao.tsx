"use client";

import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";
import { getBlockExplorerTxLink } from "~~/utils/scaffold-eth";

/**
 * O hash de uma transação, clicável quando há para onde clicar.
 *
 * A auditoria existe para o lojista poder conferir que o carimbo está mesmo na
 * rede, e não só numa linha do nosso banco. Um hash que ele precisa copiar e
 * colar num site que ninguém disse qual é não serve para isso.
 *
 * Em rede local não há explorador público, e aí o hash volta a ser texto: link
 * para lugar nenhum é pior do que link nenhum.
 */
export const HashDaTransacao = ({ hash }: { hash: string }) => {
  const { targetNetwork } = useTargetNetwork();
  const url = getBlockExplorerTxLink(targetNetwork.id, hash);
  const curto = `${hash.slice(0, 10)}…`;

  if (!url) return <span className="font-mono opacity-75">{curto}</span>;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono opacity-75 hover:text-primary hover:opacity-100"
    >
      {curto}
      <ArrowTopRightOnSquareIcon className="h-3 w-3" />
    </a>
  );
};
