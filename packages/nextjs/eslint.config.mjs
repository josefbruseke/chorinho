import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    // Bloco proprio: no flat config, `ignores` junto de `rules` so vale para
    // aquele bloco. Sozinho, vale para a execucao inteira.
    ignores: [".next/**", "next-env.d.ts", "public/sw.js", "public/swe-worker-*.js"],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-page-custom-font": "off",
      "prettier/prettier": [
        "warn",
        {
          endOfLine: "auto",
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-deprecated": "warn",
    },
  },
  {
    // Cor travada num tema e bug de contraste, nao questao de estilo: um hex cru
    // em className nao muda com o tema e deixa o componente ilegivel no escuro.
    // Use os tokens semanticos do daisyUI (primary, base-100, base-300...) ou os
    // tokens proprios definidos em styles/globals.css (kraft, craft, honey-*).
    files: ["**/*.tsx", "**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='className'] Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/]",
          message:
            "Cor fixa em className quebra o tema escuro. Use um token semantico do daisyUI (bg-base-100, text-primary, border-base-300) ou um token do Chorinho (kraft, craft, kraft-ink, kraft-edge, honey-soft, honey-edge, honey-ink).",
        },
        {
          selector: "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\[#[0-9a-fA-F]{3,8}\\]/]",
          message:
            "Cor fixa em className quebra o tema escuro. Use um token semantico do daisyUI (bg-base-100, text-primary, border-base-300) ou um token do Chorinho (kraft, craft, kraft-ink, kraft-edge, honey-soft, honey-edge, honey-ink).",
        },
      ],
    },
  },
]);
