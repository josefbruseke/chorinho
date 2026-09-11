#!/usr/bin/env bash
set -e

export PATH="$HOME/.foundry/bin:$PATH"

cleanup() {
  echo -e "\n🛑 Encerrando serviços..."
  # Kill all child processes belonging to this script
  kill 0 2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "⛓️  [1/4] Iniciando blockchain local (Anvil)..."
bun run chain &

echo "⏳ Aguardando Anvil ficar pronto..."
until curl -s http://127.0.0.1:8545 > /dev/null 2>&1; do
  sleep 0.5
done

echo "🚀 [2/4] Fazendo deploy dos contratos..."
bun run deploy

# As lojas, as regras de carimbo e as recompensas precisam existir na cadeia
# para o balcao funcionar. Sem isso o PDV abre e recusa toda venda com
# "a loja ainda nao configurou a regra de carimbos" -- e a primeira impressao
# de quem clonou o repositorio e que esta quebrado.
echo "🌱 [3/4] Populando a rede local (lojas, regras e recompensas)..."
bun run seed:tudo

echo "✨ [4/4] Iniciando o frontend Next.js..."
bun run start
