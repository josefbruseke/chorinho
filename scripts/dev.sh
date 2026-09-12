#!/usr/bin/env bash
set -e

export PATH="$HOME/.foundry/bin:$PATH"

# Este script não escolhe rede — quem escolhe é o `.env.local`. Ele só conta
# qual saiu escolhida, porque a resposta não é óbvia: o servidor lê
# CHORINHO_CHAIN_ID e o navegador lê NEXT_PUBLIC_CHORINHO_CHAIN_ID, duas
# variáveis distintas. Configurar só uma deixa metade da aplicação falando com
# a outra rede, e nada na tela denuncia isso.
#
# Havia um anvil subindo aqui, com deploy e seed a cada `bun dev`. Era ótimo
# enquanto a cadeia era detalhe de implementação: bloco instantâneo, ETH de
# graça, tudo recomeçando do zero. E era exatamente por isso que ele escondia o
# que a Sepolia cobra — espera de doze segundos, nonce disputado entre dois
# envios, teto de tempo da função. Cada um desses apareceu publicado, nunca
# aqui. Por isso subir a cadeia virou passo explícito, e não automático.

ENV_LOCAL=packages/nextjs/.env.local

if [ ! -f "$ENV_LOCAL" ]; then
  echo "⚠️  $ENV_LOCAL não existe."
  echo "   Copie packages/nextjs/.env.example e preencha — sem ele o app sobe sem banco e sem rede."
  echo
fi

le_var() { [ -f "$ENV_LOCAL" ] && grep -E "^$1=" "$ENV_LOCAL" | tail -1 | cut -d= -f2- | tr -d '"'"'"' '; }

REDE_SERVIDOR=$(le_var CHORINHO_CHAIN_ID)
REDE_NAVEGADOR=$(le_var NEXT_PUBLIC_CHORINHO_CHAIN_ID)
: "${REDE_SERVIDOR:=31337}"
: "${REDE_NAVEGADOR:=31337}"   # o padrão de scaffold.config.ts em desenvolvimento

nome_da_rede() {
  case "$1" in
    31337) echo "anvil local" ;;
    11155111) echo "Sepolia da Ethereum" ;;
    84532) echo "Base Sepolia" ;;
    8453) echo "Base" ;;
    *) echo "chain $1" ;;
  esac
}

if [ "$REDE_SERVIDOR" != "$REDE_NAVEGADOR" ]; then
  echo "⚠️  Servidor e navegador em redes DIFERENTES:"
  echo "   CHORINHO_CHAIN_ID=$REDE_SERVIDOR ($(nome_da_rede "$REDE_SERVIDOR"))"
  echo "   NEXT_PUBLIC_CHORINHO_CHAIN_ID=$REDE_NAVEGADOR ($(nome_da_rede "$REDE_NAVEGADOR"))"
  echo "   O carimbo vai para uma rede e a tela lê da outra."
  echo
fi

if [ "$REDE_SERVIDOR" = "31337" ] && ! curl -s -o /dev/null -m 2 \
  -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://127.0.0.1:8545; then
  echo "⚠️  Nada responde em 127.0.0.1:8545."
  echo "   Rode 'bun run chain' noutro terminal, e depois 'bun run deploy && bun run seed:tudo'."
  echo
fi

echo "✨ Iniciando o frontend Next.js (rede: $(nome_da_rede "$REDE_SERVIDOR"))..."
exec bun run start
