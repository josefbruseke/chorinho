import { spawnSync } from "child_process";
import { config } from "dotenv";
import { existsSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * Publicar e semear na Sepolia sem prompt de senha.
 *
 * O `parseArgs.js` força keystore em qualquer rede pública e pede a senha no
 * terminal — o que é a decisão certa para quem publica com dinheiro de verdade,
 * e impossível de automatizar. Esta é uma demonstração numa rede de teste, com
 * uma conta que só tem ETH de faucet, então aqui a chave vem do `.env` e o
 * comando roda de uma vez.
 *
 * A chave mora em `packages/foundry/.env`, que é ignorado pelo git. Se este
 * arquivo um dia for usado com uma conta que tem valor, volte para o keystore.
 *
 * Uso:
 *   node scripts-js/sepolia.js                       publica os contratos
 *   node scripts-js/sepolia.js --file SeedBalcao.s.sol   roda um seed
 *   node scripts-js/sepolia.js --dry                 simula, sem enviar nada
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "..", ".env") });
config({ path: join(__dirname, "..", "..", "..", ".env") });

const args = process.argv.slice(2);
const valorDe = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};

const arquivo = valorDe("--file") ?? "Deploy.s.sol";
const simular = args.includes("--dry");

const chave = process.env.DEPLOYER_PRIVATE_KEY;
if (!chave) {
  console.error(`
❌ DEPLOYER_PRIVATE_KEY ausente em packages/foundry/.env

   Gere a conta com:  bun run account:generate
   Depois abasteça o endereço com ETH de teste da Sepolia.
`);
  process.exit(1);
}

if (!process.env.ALCHEMY_API_KEY) {
  console.error(`
❌ ALCHEMY_API_KEY ausente em packages/foundry/.env

   O endpoint da Sepolia no foundry.toml é montado com ela. A chave pública
   que vem no kit é compartilhada por todo mundo que usa o Scaffold-ETH e é
   limitada sob tráfego real — pegue uma sua em dashboard.alchemy.com.
`);
  process.exit(1);
}

/**
 * O `generateTsAbis.js` REESCREVE o `deployedContracts.ts` inteiro a partir do
 * que houver em `broadcast/`, sem mesclar — e `broadcast/*​/31337/` é ignorado
 * pelo git. Publicar a partir de um clone limpo apagaria o bloco 31337 do
 * arquivo, quebrando a compilação (`servidor.ts` indexa aquele id literal) e o
 * desenvolvimento local junto, sem erro nenhum durante o deploy.
 *
 * A checagem é aqui, antes de gastar gás, e não depois.
 */
const temBroadcastLocal = () => {
  const dir = join(__dirname, "..", "broadcast", "Deploy.s.sol", "31337");
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some((f) => /^run-\d+\.json$/.test(f));
};

if (arquivo === "Deploy.s.sol" && !simular && !temBroadcastLocal()) {
  console.error(`
❌ Falta o histórico do deploy local em broadcast/Deploy.s.sol/31337/

   Sem ele o gerador de ABIs apaga o bloco 31337 do deployedContracts.ts e o
   desenvolvimento local para de compilar. Rode antes, noutro terminal:

     bun run chain
     bun run deploy
`);
  process.exit(1);
}

/**
 * O `SeedColecao` grava esta URL DENTRO da URI dos NFTs, na cadeia. Como os
 * seeds são idempotentes, re-semear não conserta: uma peça criada apontando
 * para localhost aponta para localhost para sempre.
 */
if (arquivo === "SeedColecao.s.sol" && !simular && !process.env.SITE_URL) {
  console.error(`
❌ SITE_URL ausente em packages/foundry/.env

   O metadado das peças e dos selos seria gravado como
   http://localhost:3000/api/nft/… na cadeia, de forma permanente.

     SITE_URL=https://chorinho.vercel.app
`);
  process.exit(1);
}

const forgeArgs = [
  "script",
  `script/${arquivo}`,
  "--rpc-url",
  "sepolia",
  "--private-key",
  chave.startsWith("0x") ? chave : `0x${chave}`,
  "--ffi",
  "-vv",
];

// Cada transação espera um bloco de ~12 segundos. Sem `--slow` o forge
// despacha o lote inteiro de uma vez e as que dependem de uma anterior
// chegam ao nó antes dela — no anvil isso nunca apareceu.
if (!simular) forgeArgs.push("--broadcast", "--slow");

console.log(
  `\n🚀 ${simular ? "Simulando" : "Publicando"} script/${arquivo} na Sepolia…\n`
);

const resultado = spawnSync("forge", forgeArgs, {
  stdio: "inherit",
  shell: false,
  cwd: join(__dirname, ".."),
});

if (resultado.status !== 0) process.exit(resultado.status ?? 1);

// Só o deploy mexe nos endereços; um seed não tem ABI nova para gerar.
if (arquivo === "Deploy.s.sol" && !simular) {
  const abis = spawnSync("node", ["scripts-js/generateTsAbis.js"], {
    stdio: "inherit",
    cwd: join(__dirname, ".."),
  });
  process.exit(abis.status ?? 0);
}
