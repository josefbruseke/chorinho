#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createPublicClient, http, parseEther, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Enche de ETH de mentira todas as carteiras do ambiente de teste.
 *
 * A rota de vínculo já abastece cada carteira nova no momento em que ela
 * nasce. Isto aqui é para o resto: as contas que já existiam antes, o relayer
 * da plataforma, e a hora em que você reinicia o anvil e o saldo de todo mundo
 * volta a zero.
 *
 * Só funciona onde `anvil_setBalance` existe — ou seja, num nó de
 * desenvolvimento. Na Sepolia pública ninguém cunha ETH, nem nós; lá o script
 * diz isso em voz alta em vez de fingir que funcionou.
 *
 * Uso:  bun run abastecer:testes
 */

// Mora dentro do pacote do frontend porque as dependências (viem, supabase)
// vivem aqui: da raiz do repositório o resolvedor não as acha.
//
// Lê o `.env` na mão em vez de usar `dotenv`: são duas linhas, e uma
// dependência a mais só para isto seria uma dependência a mais para manter.
const carregarEnv = caminho => {
  try {
    for (const linha of readFileSync(caminho, "utf-8").split("\n")) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // arquivo ausente é normal
  }
};

const raiz = new URL("../../..", import.meta.url).pathname;
carregarEnv(`${raiz}/packages/nextjs/.env.local`);
carregarEnv(`${raiz}/.env`);

const ETH = Number(process.env.CHORINHO_TORNEIRA_ETH ?? 1000);
const RPC = process.env.CHORINHO_RPC_URL || "http://127.0.0.1:8545";

const publico = createPublicClient({ transport: http(RPC) });

const encher = async endereco => {
  for (const method of ["anvil_setBalance", "hardhat_setBalance"]) {
    try {
      await publico.request({ method, params: [endereco, toHex(parseEther(String(ETH)))] });
      return true;
    } catch {
      // tenta o outro nome, ou desiste
    }
  }
  return false;
};

const enderecos = new Set();

// O relayer é o único endereço que o aplicativo REALMENTE precisa ter saldo:
// é ele que paga o gás de toda venda, todo resgate e toda conquista.
const chave = process.env.RELAYER_PRIVATE_KEY;
if (chave) {
  enderecos.add(privateKeyToAccount(chave.startsWith("0x") ? chave : `0x${chave}`).address);
}
if (process.env.CHORINHO_ADMIN_PRIVATE_KEY) {
  const k = process.env.CHORINHO_ADMIN_PRIVATE_KEY;
  enderecos.add(privateKeyToAccount(k.startsWith("0x") ? k : `0x${k}`).address);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const segredo = process.env.SUPABASE_SECRET_KEY;

if (url && segredo) {
  const { data } = await createClient(url, segredo, { auth: { persistSession: false } })
    .from("profiles")
    .select("wallet_address")
    .not("wallet_address", "is", null);

  for (const p of data ?? []) enderecos.add(p.wallet_address);
} else {
  console.log("⚠️  Sem credenciais da Supabase: abastecendo só as contas do .env.\n");
}

if (enderecos.size === 0) {
  console.log("Nenhum endereço para abastecer.");
  process.exit(0);
}

console.log(`\n💧 Dando ${ETH} ETH a ${enderecos.size} endereço(s) em ${RPC}\n`);

let deuCerto = 0;
for (const endereco of enderecos) {
  const ok = await encher(endereco);
  console.log(`   ${ok ? "✅" : "❌"}  ${endereco}`);
  if (ok) deuCerto++;
}

if (deuCerto === 0) {
  console.log(`
❌ Nenhum endereço foi abastecido.

   O método anvil_setBalance não existe em ${RPC}. Isso é esperado numa rede pública:
   ninguém cunha ETH da Sepolia, nem nós. Para ter saldo infinito, aponte
   CHORINHO_RPC_URL para um anvil — local (bun run chain) ou hospedado.
`);
  process.exit(1);
}

console.log(`\n✨ Pronto. ${deuCerto} de ${enderecos.size}.\n`);
