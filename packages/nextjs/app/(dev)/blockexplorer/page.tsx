"use client";

import { PaginationButton, SearchBar, TransactionsTable } from "./_components";
import type { NextPage } from "next";
import { foundry, hardhat } from "viem/chains";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useFetchBlocks } from "~~/hooks/scaffold-eth";
import { useTargetNetwork } from "~~/hooks/scaffold-eth/useTargetNetwork";

/**
 * O explorador de blocos do Scaffold-ETH, que só fala com a cadeia local.
 *
 * O `useFetchBlocks` abre um websocket cravado em `ws://127.0.0.1:8545` e
 * reconecta sozinho. Fora da cadeia local isso é um martelo batendo numa porta
 * que não existe — então a rede pública nem chega a montar o componente que usa
 * o hook, e a tela vira o que ela deveria ter sido desde sempre: um ponteiro
 * para o explorador de verdade daquela rede.
 */
const BlockExplorer: NextPage = () => {
  const { targetNetwork } = useTargetNetwork();
  const local = targetNetwork.id === hardhat.id || targetNetwork.id === foundry.id;

  if (local) return <BlocosLocais />;

  const explorador = targetNetwork.blockExplorers?.default;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-20 text-center">
      <h1 className="m-0 font-serif text-2xl font-black text-secondary">Este explorador é da cadeia local</h1>
      <p className="m-0 text-sm opacity-75">
        A aplicação está em <b>{targetNetwork.name}</b>, e lá as transações vivem num explorador público.
      </p>
      {explorador && (
        <a
          href={explorador.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary h-14 gap-2 rounded-2xl px-8 font-black"
        >
          Abrir {explorador.name}
          <ArrowTopRightOnSquareIcon className="h-5 w-5" />
        </a>
      )}
    </div>
  );
};

const BlocosLocais = () => {
  const { blocks, transactionReceipts, currentPage, hasNextPage, setCurrentPage } = useFetchBlocks();

  return (
    <div className="container mx-auto my-10">
      <SearchBar />
      <TransactionsTable blocks={blocks} transactionReceipts={transactionReceipts} />
      <PaginationButton currentPage={currentPage} hasNextPage={hasNextPage} setCurrentPage={setCurrentPage} />
    </div>
  );
};

export default BlockExplorer;
