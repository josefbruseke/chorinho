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

echo "⛓️  [1/3] Iniciando blockchain local (Anvil)..."
bun run chain &

echo "⏳ Aguardando Anvil ficar pronto..."
until curl -s http://127.0.0.1:8545 > /dev/null 2>&1; do
  sleep 0.5
done

echo "🚀 [2/3] Fazendo deploy dos contratos..."
bun run deploy

echo "✨ [3/3] Iniciando o frontend Next.js..."
bun run start
