/**
 * O pedaço do StampLedger que o servidor usa.
 *
 * O `deployedContracts.ts` tem a ABI inteira, mas chega ao TypeScript como
 * `readonly unknown[]` depois de indexado por rede — e aí toda chamada viraria
 * um `as never`, que é exatamente onde os erros se escondem. Declarar aqui as
 * poucas funções que o relayer chama devolve tipagem de verdade: argumento
 * errado não compila.
 */
export const ABI_LEDGER = [
  {
    type: "function",
    name: "issueStamps",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "sale",
        type: "tuple",
        components: [
          { name: "establishmentId", type: "uint256" },
          { name: "customer", type: "address" },
          { name: "amountCents", type: "uint64" },
          { name: "productBoostBps", type: "uint16" },
          { name: "saleRef", type: "bytes32" },
        ],
      },
    ],
    outputs: [
      { name: "stamps", type: "uint256" },
      { name: "points", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "issueStampsBatch",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "vendas",
        type: "tuple[]",
        components: [
          { name: "establishmentId", type: "uint256" },
          { name: "customer", type: "address" },
          { name: "amountCents", type: "uint64" },
          { name: "productBoostBps", type: "uint16" },
          { name: "saleRef", type: "bytes32" },
        ],
      },
    ],
    outputs: [
      { name: "totalStamps", type: "uint256" },
      { name: "totalPoints", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "previewStamps",
    stateMutability: "view",
    inputs: [
      { name: "establishmentId", type: "uint256" },
      { name: "amountCents", type: "uint64" },
      { name: "productBoostBps", type: "uint16" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "walletOf",
    stateMutability: "view",
    inputs: [
      { name: "establishmentId", type: "uint256" },
      { name: "customer", type: "address" },
    ],
    outputs: [
      { name: "balance", type: "uint256" },
      { name: "lifetime", type: "uint256" },
      { name: "lifetimeCents", type: "uint256" },
      { name: "streakCurrent", type: "uint32" },
      { name: "streakBest", type: "uint32" },
      { name: "visits", type: "uint32" },
      { name: "lastVisitAt", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "StampsIssued",
    inputs: [
      { name: "establishmentId", type: "uint256", indexed: true },
      { name: "customer", type: "address", indexed: true },
      { name: "operator", type: "address", indexed: true },
      { name: "stamps", type: "uint256", indexed: false },
      { name: "points", type: "uint256", indexed: false },
      { name: "amountCents", type: "uint64", indexed: false },
      { name: "saleRef", type: "bytes32", indexed: false },
      { name: "newBalance", type: "uint256", indexed: false },
      { name: "streakCurrent", type: "uint32", indexed: false },
    ],
  },
] as const;
