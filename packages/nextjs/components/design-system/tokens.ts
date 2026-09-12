/**
 * CHORINHO DESIGN SYSTEM — TOKENS
 *
 * Este arquivo documenta a RAMPA DE COR da marca. Ele não é referência para
 * className: a interface usa os tokens semânticos do daisyUI (primary,
 * base-100, base-300, accent, success...) e os tokens próprios declarados em
 * `styles/globals.css` (kraft, craft, kraft-ink, kraft-edge, honey-*), que têm
 * valor distinto em cada tema. Cor fixa em className quebra o tema escuro e é
 * barrada pelo ESLint.
 *
 * Ao mexer num valor aqui, espelhe em `styles/globals.css` — e vice-versa.
 *
 * Filosofia: "Calor humano, comércio de bairro e artesanato moderno", com a
 * paleta tirada do caldo de cana: verde da cana, amarelo do caldo, bagaço.
 * Focado em uso sob luz do dia em balcões de lojas reais (cafés, padarias,
 * barbearias, empórios). Evita o cinismo 'hightech' ou 'crypto-cyberpunk',
 * priorizando texturas táteis, tipografia legível e contrastes acolhedores.
 */

export const chorinhoTokens = {
  colors: {
    // Verde da cana (ação primária, folha nova, frescor do balcão)
    cane: {
      50: "#f5fbe8",
      100: "#e8f6c9",
      200: "#d1ec99",
      300: "#b4e066",
      400: "#a3d94a",
      500: "#8fd42e",
      600: "#76c112", // Cor primária de marca
      700: "#6bb010",
      800: "#3f7d05", // success no claro / primary do admin
      900: "#006624", // success do balcão (7:1 com tinta clara)
    },
    // Tinta oliva (tipografia de alto contraste, era o espresso)
    olive: {
      950: "#0f1406",
      900: "#1c2010", // Base de contraste / textos fortes
      800: "#262b14",
      700: "#2e3318",
      600: "#3d4024",
      // Espelha --color-kraft-ink de globals.css (7:1 contra o fundo kraft
      // claro, exigido pelo tema pos-light sob luz do dia).
      500: "#57582a", // Textos secundários
      400: "#8a8a5c",
      300: "#b8b78f",
      200: "#d9d3b0",
      100: "#eeebd9",
      50: "#f9f8ee",
    },
    // Amarelo do caldo ("O Chorinho", agrado, recompensas e celebração)
    caldo: {
      50: "#fdfbe6",
      100: "#f7f2cc",
      200: "#e6dc8a",
      300: "#d6cc3e", // warning
      400: "#e3c21a",
      500: "#d9c236",
      600: "#d8b301", // Destaque de recompensas
      700: "#5a4a00", // honey-ink no claro
    },
    // Superfícies de papel e bagaço
    canvas: {
      linen: "#fbfaf1", // Fundo do app
      card: "#ffffff",
      cardWarm: "#fdfbf7",
      craft: "#f3f0e0", // Cartela de carimbo / cupom destacado
      border: "#cec69c", // Borda de bagaço
      borderActive: "#c4bc8f",
    },
    // Verde sálvia (validações fora da marca, mantido para os temas escuros)
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
    card: "0 2px 10px -2px rgba(28, 32, 16, 0.05), 0 1px 3px 0 rgba(28, 32, 16, 0.03)",
    cardHover: "0 12px 28px -6px rgba(28, 32, 16, 0.10), 0 4px 10px -2px rgba(28, 32, 16, 0.05)",
    ticket: "0 4px 16px -2px rgba(118, 193, 18, 0.08)",
    stampActive: "0 4px 12px -1px rgba(118, 193, 18, 0.25)",
  },
  transitions: {
    tap: "transition-all duration-150 active:scale-[0.98]",
    card: "transition-all duration-200 ease-out",
  },
} as const;

export type ChorinhoColorToken = keyof typeof chorinhoTokens.colors;
