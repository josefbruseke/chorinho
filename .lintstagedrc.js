// O tsc roda sobre o projeto inteiro, não sobre os arquivos em stage: um import
// quebrado só aparece do outro lado da mudança.
module.exports = {
  "**/*.{ts,tsx}": ["eslint --fix", () => "bun run check-types"],
};
