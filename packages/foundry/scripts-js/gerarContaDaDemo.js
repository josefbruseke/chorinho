import { spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

/**
 * A conta única da demonstração: deployer, admin e relayer ao mesmo tempo.
 *
 * Em produção essas três coisas teriam custódias diferentes — quem paga gás,
 * quem muda regra e quem publica contrato não precisam ser a mesma pessoa, e
 * não devem. Aqui é uma demonstração numa rede de teste, com uma conta que só
 * vai ter ETH de faucet, e três chaves para abastecer seria três vezes o
 * trabalho de quem for mostrar o produto.
 *
 * A chave é escrita em dois `.env`, os dois ignorados pelo git:
 *   packages/foundry/.env      DEPLOYER_PRIVATE_KEY   (publicar e semear)
 *   packages/nextjs/.env.local RELAYER_PRIVATE_KEY    (o balcão)
 *
 * Nunca imprime a chave. Só o endereço, que é o que precisa ser abastecido.
 *
 * Uso: node scripts-js/gerarContaDaDemo.js
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FOUNDRY = join(__dirname, "..", ".env");
const ENV_NEXT = join(__dirname, "..", "..", "nextjs", ".env.local");

/** Escreve uma variável sem mexer no resto do arquivo, nem nos comentários. */
const gravar = (caminho, chave, valor) => {
  const atual = existsSync(caminho) ? readFileSync(caminho, "utf-8") : "";
  const linha = `${chave}=${valor}`;
  const regex = new RegExp(`^${chave}=.*$`, "m");

  if (regex.test(atual)) {
    writeFileSync(caminho, atual.replace(regex, linha));
    return "atualizada";
  }
  writeFileSync(
    caminho,
    atual.endsWith("\n") || atual === ""
      ? `${atual}${linha}\n`
      : `${atual}\n${linha}\n`
  );
  return "criada";
};

const jaTem =
  existsSync(ENV_FOUNDRY) &&
  /^DEPLOYER_PRIVATE_KEY=0x[0-9a-fA-F]{64}$/m.test(
    readFileSync(ENV_FOUNDRY, "utf-8")
  );

if (jaTem && !process.argv.includes("--forcar")) {
  const chave = readFileSync(ENV_FOUNDRY, "utf-8").match(
    /^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})$/m
  )[1];
  const endereco = spawnSync(
    "cast",
    ["wallet", "address", "--private-key", chave],
    { encoding: "utf-8" }
  );
  console.log(`
✅ A conta da demonstração já existe.

   Endereço: ${endereco.stdout.trim()}

   Para gerar outra (a atual será descartada):  node scripts-js/gerarContaDaDemo.js --forcar
`);
  process.exit(0);
}

const nova = spawnSync("cast", ["wallet", "new"], { encoding: "utf-8" });
if (nova.status !== 0) {
  console.error(
    "\n❌ `cast wallet new` falhou. O Foundry está instalado e no PATH?\n",
    nova.stderr
  );
  process.exit(1);
}

const chave = nova.stdout.match(/Private key:\s*(0x[0-9a-fA-F]{64})/)?.[1];
const endereco = nova.stdout.match(/Address:\s*(0x[0-9a-fA-F]{40})/)?.[1];

if (!chave || !endereco) {
  console.error(
    "\n❌ Não consegui ler a chave nem o endereço da saída do cast."
  );
  process.exit(1);
}

gravar(ENV_FOUNDRY, "DEPLOYER_PRIVATE_KEY", chave);
gravar(ENV_NEXT, "RELAYER_PRIVATE_KEY", chave);

console.log(`
🔑 Conta da demonstração criada.

   Endereço: ${endereco}

   A chave foi gravada em packages/foundry/.env e packages/nextjs/.env.local,
   os dois ignorados pelo git. Ela não é impressa aqui de propósito.

Faltam duas coisas suas antes de publicar:

1. Abastecer este endereço com ETH de teste da Sepolia — **0,1 ETH basta**.

   O número vem de medir, não de chutar: o deploy dos nove contratos foi
   simulado contra a Sepolia e custa 0,036 ETH. Os três seeds somam outros
   ~0,02, e cada carimbo da demonstração sai por menos de um milésimo. Uma
   única torneira cobre tudo com folga.

   · https://cloud.google.com/application/web3/faucet/ethereum/sepolia
   · https://sepolia-faucet.pk910.de  (sem conta, mineração no navegador)

2. Uma chave própria da Alchemy para a Sepolia (gratuita, dashboard.alchemy.com).
   A que vem no kit é a pública do Scaffold-ETH, compartilhada por todo mundo
   que usa o starter — sob tráfego real ela limita, e o mapa e o balcão começam
   a falhar sem explicação.

   Grave em packages/foundry/.env:      ALCHEMY_API_KEY=...
   e em packages/nextjs/.env.local:     NEXT_PUBLIC_ALCHEMY_API_KEY=...

Depois disso:  bun run deploy:sepolia && bun run seed:sepolia
Para conferir o saldo:  cast balance ${endereco} --rpc-url sepolia
`);
