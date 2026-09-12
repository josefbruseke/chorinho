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

/** O pedaço do SubscriptionManager que o painel do lojista lê. */
export const ABI_ASSINATURA = [
  {
    type: "function",
    name: "isActive",
    stateMutability: "view",
    inputs: [{ name: "establishmentId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "tierOf",
    stateMutability: "view",
    inputs: [{ name: "establishmentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "expiresAt",
    stateMutability: "view",
    inputs: [{ name: "establishmentId", type: "uint256" }],
    outputs: [{ name: "", type: "uint64" }],
  },
] as const;

/** A regra de acúmulo da loja, como o contrato a guarda. */
export const ABI_REGRA = [
  {
    type: "function",
    name: "rules",
    stateMutability: "view",
    inputs: [{ name: "establishmentId", type: "uint256" }],
    outputs: [
      { name: "minTicketCents", type: "uint64" },
      { name: "centsPerStamp", type: "uint64" },
      { name: "maxStampsPerTx", type: "uint16" },
      { name: "cooldownSeconds", type: "uint32" },
      { name: "streakWindowSeconds", type: "uint32" },
      { name: "pointsPerStamp", type: "uint32" },
      { name: "pointTypeId", type: "uint256" },
      { name: "active", type: "bool" },
    ],
  },
] as const;

/**
 * A escrita da regra de acúmulo.
 *
 * Separada da leitura porque o contrato recebe a regra como tupla: os campos
 * precisam estar exatamente nesta ordem, e um deslocamento silencioso aqui
 * viraria "toda compra vale 1 carimbo" numa loja inteira.
 */
export const ABI_REGRA_ESCRITA = [
  {
    type: "function",
    name: "setAccrualRule",
    stateMutability: "nonpayable",
    inputs: [
      { name: "establishmentId", type: "uint256" },
      {
        name: "rule",
        type: "tuple",
        components: [
          { name: "minTicketCents", type: "uint64" },
          { name: "centsPerStamp", type: "uint64" },
          { name: "maxStampsPerTx", type: "uint16" },
          { name: "cooldownSeconds", type: "uint32" },
          { name: "streakWindowSeconds", type: "uint32" },
          { name: "pointsPerStamp", type: "uint32" },
          { name: "pointTypeId", type: "uint256" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    outputs: [],
  },
  { type: "error", name: "InvalidRule", inputs: [] },
  { type: "error", name: "NotOperator", inputs: [] },
] as const;

/** O que o back office da plataforma escreve no registro de estabelecimentos. */
export const ABI_REGISTRO = [
  {
    type: "function",
    name: "registerEstablishment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "setEstablishmentActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "ownerOfEstablishment",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "event",
    name: "EstablishmentRegistered",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "metadataHash", type: "bytes32", indexed: false },
    ],
  },
] as const;

/** A assinatura escrita pelo oráculo de cobrança. */
export const ABI_ASSINATURA_ESCRITA = [
  {
    type: "function",
    name: "setSubscription",
    stateMutability: "nonpayable",
    inputs: [
      { name: "establishmentId", type: "uint256" },
      { name: "tier", type: "uint8" },
      { name: "validUntil", type: "uint64" },
      { name: "providerRefHash", type: "bytes32" },
    ],
    outputs: [],
  },
] as const;

// --------------------------------------------------------- a camada de peças
//
// Programa, peça e conquista. O mesmo raciocínio do topo do arquivo: só o que o
// servidor chama, tipado de verdade.

export const ABI_PROGRAMA = [
  {
    type: "function",
    name: "createProgram",
    stateMutability: "nonpayable",
    inputs: [
      { name: "ownerEstablishmentId", type: "uint256" },
      { name: "name", type: "bytes32" },
      { name: "kind", type: "uint8" },
      { name: "baseBenefit", type: "uint256" },
      { name: "capCents", type: "uint256" },
      { name: "product", type: "bytes32" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "joint", type: "bool" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "programId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setProgramActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "invite",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint256" },
      { name: "establishmentId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "acceptInvite",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint256" },
      { name: "establishmentId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "leaveProgram",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint256" },
      { name: "establishmentId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "validAt",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint256" },
      { name: "establishmentId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "discountFor",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint256" },
      { name: "level", type: "uint256" },
      { name: "billCents", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "ProgramCreated",
    inputs: [
      { name: "programId", type: "uint256", indexed: true },
      { name: "ownerEstablishmentId", type: "uint256", indexed: true },
      { name: "name", type: "bytes32", indexed: false },
      { name: "joint", type: "bool", indexed: false },
    ],
  },
  { type: "error", name: "NotEstablishmentOwner", inputs: [] },
  { type: "error", name: "ProgramIsNotJoint", inputs: [] },
  { type: "error", name: "UnknownProgram", inputs: [] },
  { type: "error", name: "UnknownEstablishment", inputs: [] },
  { type: "error", name: "NotInvited", inputs: [] },
  { type: "error", name: "NotAMember", inputs: [] },
  { type: "error", name: "AlreadyAMember", inputs: [] },
  { type: "error", name: "InvalidBenefit", inputs: [] },
  { type: "error", name: "InvalidWindow", inputs: [] },
] as const;

export const ABI_PECA = [
  {
    type: "function",
    name: "createPiece",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "programId", type: "uint256" },
          { name: "level", type: "uint256" },
          { name: "maxSupply", type: "uint256" },
          { name: "startTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
          { name: "maxPerWallet", type: "uint256" },
          { name: "uri", type: "string" },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setPieceActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "usePiece",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "tokenId", type: "uint256" },
      { name: "establishmentId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "redemptionRef", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOfBatch",
    stateMutability: "view",
    inputs: [
      { name: "accounts", type: "address[]" },
      { name: "ids", type: "uint256[]" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "discountFor",
    stateMutability: "view",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "billCents", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "PieceUsed",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "user", type: "address", indexed: true },
      { name: "establishmentId", type: "uint256", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "redemptionRef", type: "bytes32", indexed: false },
    ],
  },
  { type: "error", name: "NotEstablishmentOwner", inputs: [] },
  { type: "error", name: "NotOperator", inputs: [] },
  { type: "error", name: "PieceAlreadyExists", inputs: [{ name: "tokenId", type: "uint256" }] },
  { type: "error", name: "UnknownPiece", inputs: [{ name: "tokenId", type: "uint256" }] },
  { type: "error", name: "PieceNotActive", inputs: [{ name: "tokenId", type: "uint256" }] },
  {
    type: "error",
    name: "PieceExpired",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "endTime", type: "uint64" },
    ],
  },
  {
    type: "error",
    name: "MaxSupplyExceeded",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "requested", type: "uint256" },
      { name: "available", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "MaxPerWalletExceeded",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "requested", type: "uint256" },
      { name: "remaining", type: "uint256" },
    ],
  },
  { type: "error", name: "NotAllowedToMint", inputs: [] },
  { type: "error", name: "ZeroAmount", inputs: [] },
  {
    type: "error",
    name: "NotValidHere",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "establishmentId", type: "uint256" },
    ],
  },
  { type: "error", name: "UnknownProgram", inputs: [] },
  { type: "error", name: "InvalidLevel", inputs: [] },
  { type: "error", name: "InvalidWindow", inputs: [] },
] as const;

export const ABI_CONQUISTA = [
  {
    type: "function",
    name: "createAchievement",
    stateMutability: "nonpayable",
    inputs: [
      { name: "establishmentId", type: "uint256" },
      { name: "criterion", type: "uint8" },
      { name: "target", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "maxWinners", type: "uint32" },
      { name: "pieceId", type: "uint256" },
      { name: "grantsBadge", type: "bool" },
      { name: "routeId", type: "uint256" },
      { name: "uri", type: "string" },
      { name: "metadataHash", type: "bytes32" },
    ],
    outputs: [{ name: "achievementId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setAchievementActive",
    stateMutability: "nonpayable",
    inputs: [
      { name: "achievementId", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [
      { name: "achievementId", type: "uint256" },
      { name: "customer", type: "address" },
      { name: "claimRef", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "progressOf",
    stateMutability: "view",
    inputs: [
      { name: "achievementId", type: "uint256" },
      { name: "customer", type: "address" },
    ],
    outputs: [
      { name: "achieved", type: "uint256" },
      { name: "target", type: "uint256" },
      { name: "met", type: "bool" },
      { name: "alreadyClaimed", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "AchievementCreated",
    inputs: [
      { name: "achievementId", type: "uint256", indexed: true },
      { name: "establishmentId", type: "uint256", indexed: true },
      { name: "criterion", type: "uint8", indexed: false },
      { name: "target", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "AchievementClaimed",
    inputs: [
      { name: "achievementId", type: "uint256", indexed: true },
      { name: "establishmentId", type: "uint256", indexed: true },
      { name: "customer", type: "address", indexed: true },
      { name: "badgeTokenId", type: "uint256", indexed: false },
      { name: "pieceId", type: "uint256", indexed: false },
      { name: "claimRef", type: "bytes32", indexed: false },
    ],
  },
  { type: "error", name: "NotEstablishmentOwner", inputs: [] },
  { type: "error", name: "NotRelayer", inputs: [] },
  { type: "error", name: "UnknownAchievement", inputs: [] },
  { type: "error", name: "AchievementInactive", inputs: [] },
  { type: "error", name: "AchievementEnded", inputs: [] },
  { type: "error", name: "NoWinnersLeft", inputs: [] },
  { type: "error", name: "AlreadyClaimed", inputs: [] },
  { type: "error", name: "ClaimAlreadyProcessed", inputs: [] },
  {
    type: "error",
    name: "CriterionNotMet",
    inputs: [
      { name: "achieved", type: "uint256" },
      { name: "target", type: "uint256" },
    ],
  },
  { type: "error", name: "DeliversNothing", inputs: [] },
  { type: "error", name: "AchievementNotStarted", inputs: [] },
  { type: "error", name: "InvalidTarget", inputs: [] },
] as const;
