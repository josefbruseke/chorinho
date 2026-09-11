const path = require("path");

// Este repo usa o flavor Foundry: nao existe packages/hardhat.
//
// Os binarios (eslint, prettier) sao dependencias dos pacotes, nao da
// raiz, e `bun --filter` roda scripts do package.json em vez de binarios.
// Por isso cada tarefa entra no diretorio do pacote e chama via bunx.
const relativeTo = (pkg, filenames) =>
  filenames.map(f => path.relative(path.join(process.cwd(), "packages", pkg), f)).join(" ");

const nextEslint = filenames => `cd packages/nextjs && bunx eslint --fix ${relativeTo("nextjs", filenames)}`;

const nextCheckTypes = () => "bun run next:check-types";

// forge fmt precisa rodar DE DENTRO de packages/foundry: da raiz ele nao
// enxerga o foundry.toml e reformata os .sol com o estilo errado
// (bracket_spacing = true seria silenciosamente desfeito a cada commit).
const forgeFmt = filenames => `cd packages/foundry && forge fmt ${relativeTo("foundry", filenames)}`;

const foundryPrettier = filenames =>
  `cd packages/foundry && bunx prettier --write ${relativeTo("foundry", filenames)}`;

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [nextEslint, nextCheckTypes],
  "packages/foundry/{contracts,script,test}/**/*.sol": [forgeFmt],
  "packages/foundry/scripts-js/**/*.js": [foundryPrettier],
};
