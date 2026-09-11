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
  // Os erros customizados precisam estar aqui: sem eles o viem devolve apenas
  // o seletor cru (`0x1ef1e92d`) e o balcao mostra "nao foi possivel enviar"
  // quando o problema era so a compra estar abaixo do piso da loja.
  { type: "error", name: "NotAdmin", inputs: [] },
  { type: "error", name: "NotOperator", inputs: [] },
  { type: "error", name: "SubscriptionInactive", inputs: [] },
  { type: "error", name: "EstablishmentInactive", inputs: [] },
  { type: "error", name: "RuleInactive", inputs: [] },
  { type: "error", name: "SaleAlreadyProcessed", inputs: [] },
  {
    type: "error",
    name: "TicketBelowFloor",
    inputs: [
      { name: "amountCents", type: "uint64" },
      { name: "minTicketCents", type: "uint64" },
    ],
  },
  { type: "error", name: "CooldownActive", inputs: [{ name: "secondsRemaining", type: "uint64" }] },
  { type: "error", name: "BoostTooHigh", inputs: [{ name: "boostBps", type: "uint16" }] },
  { type: "error", name: "InvalidRule", inputs: [] },
  {
    type: "error",
    name: "InsufficientStamps",
    inputs: [
      { name: "balance", type: "uint256" },
      { name: "requested", type: "uint256" },
    ],
  },
  { type: "error", name: "NothingToIssue", inputs: [] },
] as const;

/** O pedaço do PointsVault que o servidor lê: só o saldo de uma classe de ponto. */
export const ABI_PONTOS = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [
      { name: "account", type: "address" },
      { name: "id", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** O pedaço do RewardCatalog que o balcão usa na entrega. */
export const ABI_CATALOGO = [
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "rewardId", type: "uint256" },
      { name: "customer", type: "address" },
      { name: "claimRef", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "canClaim",
    stateMutability: "view",
    inputs: [
      { name: "rewardId", type: "uint256" },
      { name: "customer", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "RewardClaimed",
    inputs: [
      { name: "rewardId", type: "uint256", indexed: true },
      { name: "establishmentId", type: "uint256", indexed: true },
      { name: "customer", type: "address", indexed: true },
      { name: "stampCost", type: "uint256", indexed: false },
      { name: "pointCost", type: "uint256", indexed: false },
      { name: "claimRef", type: "bytes32", indexed: false },
    ],
  },
  { type: "error", name: "UnknownReward", inputs: [] },
  { type: "error", name: "RewardInactive", inputs: [] },
  { type: "error", name: "RewardNotStarted", inputs: [] },
  { type: "error", name: "RewardEnded", inputs: [] },
  { type: "error", name: "RewardSoldOut", inputs: [] },
  { type: "error", name: "ClaimAlreadyProcessed", inputs: [] },
  { type: "error", name: "NotOperator", inputs: [] },
  {
    type: "error",
    name: "InsufficientStamps",
    inputs: [
      { name: "balance", type: "uint256" },
      { name: "requested", type: "uint256" },
    ],
  },
] as const;
