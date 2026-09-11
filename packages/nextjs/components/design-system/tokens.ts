/**
 * CHORINHO DESIGN SYSTEM — TOKENS
 *
 * Filosofia: "Calor humano, comércio de bairro e artesanato moderno".
 * Focado em uso sob luz do dia em balcões de lojas reais (cafés, padarias,
 * barbearias, empórios). Evita o cinismo 'hightech' ou 'crypto-cyberpunk',
 * priorizando texturas táteis, tipografia legível e contrastes acolhedores.
 */

export const chorinhoTokens = {
  colors: {
    // Tom terracota artesanal (Ação primária, argila, calor do balcão)
    terracotta: {
      50: "#fff7ed",
      100: "#ffedd5",
      200: "#fed7aa",
      300: "#fdba74",
      400: "#fb923c",
      500: "#f97316",
      600: "#ea580c",
      700: "#c2410c", // Cor primária de marca
      800: "#9a3412",
      900: "#7c2d12",
    },
    // Tom espresso torrado (Tipografia de alto contraste e sofisticação urbana)
    espresso: {
      950: "#1a120b",
      900: "#261c14", // Base de contraste / textos fortes
      800: "#38291e",
      700: "#4f3c2e",
      600: "#695343",
      500: "#856d5c", // Textos secundários
      400: "#a89483",
      300: "#ccaebc",
      200: "#e6dad0",
      100: "#f3ede7",
      50: "#faf7f4",
    },
    // Tom mel / rapadura / âmbar ("O Chorinho", agrado, recompensas e celebração)
    honey: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706", // Destaque de recompensas
      700: "#b45309",
    },
    // Superfícies de linho e papel kraft
    canvas: {
      linen: "#fbf8f2", // Fundo do app
      card: "#ffffff",
      cardWarm: "#fdfbf7",
      craft: "#f4ede2", // Cartela de carimbo / cupom destacado
      border: "#ebe3d5", // Borda tátil suave
      borderActive: "#d8c7b0",
    },
    // Verde sálvia / floresta (Validações de balcão e estabelecimentos certificados)
    sage: {
      50: "#f0fdf4",
      100: "#dcfce7",
      500: "#22c55e",
      600: "#16a34a",
      700: "#15803d",
      800: "#166534",
    },
  },
  radii: {
    badge: "rounded-full",
    button: "rounded-2xl",
    card: "rounded-2xl",
    modal: "rounded-3xl",
    ticket: "rounded-2xl",
    stamp: "rounded-full",
  },
  shadows: {
    card: "0 2px 10px -2px rgba(38, 28, 20, 0.05), 0 1px 3px 0 rgba(38, 28, 20, 0.03)",
    cardHover: "0 12px 28px -6px rgba(38, 28, 20, 0.10), 0 4px 10px -2px rgba(38, 28, 20, 0.05)",
    ticket: "0 4px 16px -2px rgba(194, 65, 12, 0.08)",
    stampActive: "0 4px 12px -1px rgba(194, 65, 12, 0.25)",
  },
  transitions: {
    tap: "transition-all duration-150 active:scale-[0.98]",
    card: "transition-all duration-200 ease-out",
  },
} as const;

export type ChorinhoColorToken = keyof typeof chorinhoTokens.colors;
