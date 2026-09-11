const path = require("path");

// Este repo usa o flavor Foundry: nao existe packages/hardhat.
// `bun --filter` roda scripts do package.json, nao binarios -- por isso
// o eslint e chamado via bunx a partir do diretorio do pacote.
const nextEslint = filenames => {
  const relativos = filenames
    .map(f => path.relative(path.join(process.cwd(), "packages", "nextjs"), f))
    .join(" ");
  return `cd packages/nextjs && bunx eslint --fix ${relativos}`;
};

const nextCheckTypes = () => "bun run next:check-types";

const forgeFmt = filenames => `forge fmt ${filenames.join(" ")}`;

const prettierFoundryScripts = filenames => `prettier --write ${filenames.join(" ")}`;

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [nextEslint, nextCheckTypes],
  "packages/foundry/{contracts,script,test}/**/*.sol": [forgeFmt],
  "packages/foundry/scripts-js/**/*.js": [prettierFoundryScripts],
};
