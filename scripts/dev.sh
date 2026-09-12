#!/usr/bin/env bash
set -e

export PATH="$HOME/.foundry/bin:$PATH"

# Desenvolvimento aponta para a Sepolia, a mesma rede da demonstração.
#
# Havia um anvil aqui, com deploy e seed a cada `bun dev`. Ele era ótimo
# enquanto a cadeia era detalhe de implementação: bloco instantâneo, ETH de
# graça, tudo recomeçando do zero. Mas era exatamente por isso que ele escondia
# o que a Sepolia cobra — espera de doze segundos, nonce disputado entre dois
# envios, teto de tempo da função. Cada um desses apareceu publicado, nunca
# aqui.
#
# Agora a máquina de quem programa fala com a mesma rede do balcão. Mais lento,
# e é o ponto: o que funciona aqui funciona lá.
#
# Para voltar ao anvil por um momento — depurar um contrato, por exemplo:
#   bun run chain              (num terminal)
#   bun run deploy && bun run seed:tudo
#   CHORINHO_CHAIN_ID=31337 bun run start

if [ ! -f packages/nextjs/.env.local ]; then
  echo "⚠️  packages/nextjs/.env.local não existe."
  echo "   Copie packages/nextjs/.env.example e preencha — sem ele o app sobe sem banco e sem rede."
  echo
fi

echo "✨ Iniciando o frontend Next.js (rede: Sepolia)..."
exec bun run start
