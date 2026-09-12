<img src="packages/nextjs/public/og.png" alt="Chorinho" width="720">

# Chorinho

**Chorinho** é a digitalização daquele agrado que só o comércio de bairro sabe dar: a fatia extra de bolo na padaria, o refil de café no coador, a toalha quente na barbearia.

É um programa de fidelidade **compartilhado entre lojas**. O caixa digita o valor da venda, lê o passe do cliente, e os carimbos caem na hora — pelas regras daquele comerciante. Carimbo vira produto, desconto e selo de conquista, e tudo fica registrado na blockchain.

O cliente não precisa saber que existe blockchain por trás. Entra com e-mail ou Google e pronto: a carteira nasce junto, invisível.

---

## Rodando na sua máquina

**Pré-requisitos:** [Bun](https://bun.sh) 1.3+, [Foundry](https://getfoundry.sh) e [Git](https://git-scm.com).

```bash
git clone <url-do-repositorio> chorinho
cd chorinho
bun install
cp packages/nextjs/.env.example packages/nextjs/.env.local   # e preencha
bun dev
```

A aplicação sobe em http://localhost:3000 apontando para a **Sepolia da
Ethereum** — a mesma rede da demonstração, com os contratos já publicados. Não
há blockchain local para subir.

Isso é uma escolha, e ela custa doze segundos por venda. O anvil é ótimo
enquanto a cadeia é detalhe de implementação, e é exatamente por isso que ele
escondia o que a rede de verdade cobra: a espera do bloco, o nonce disputado
entre dois envios, o teto de tempo da função. Cada um desses defeitos apareceu
publicado, nunca na máquina de quem programou.

<details>
<summary>Voltar ao anvil por um momento (depurar um contrato, por exemplo)</summary>

```bash
bun run chain                          # num terminal
bun run deploy && bun run seed:tudo    # noutro
CHORINHO_CHAIN_ID=31337 bun run start
```

Lembre de trocar `targetNetworks` em `packages/nextjs/scaffold.config.ts` para
`chains.foundry` enquanto estiver assim — e de voltar depois.

</details>

### Testando o fluxo inteiro

Depois de `bun dev`, em http://localhost:3000:

1. **Crie uma conta** em `/entrar` (e-mail e senha). A carteira é criada sozinha; confira em `/perfil`.
2. **Abra seu passe** em `/passe`. É o QR que o caixa lê — ele se renova a cada dois minutos.
3. **Abra o balcão** em `/pdv`, em outra aba. Digite o valor da compra, depois o código de 6 dígitos que aparece embaixo do QR.
4. **Veja o carimbo cair** em `/carteira`. A tela acende sozinha, sem recarregar.
5. **Entregue um prêmio** em `/pdv/resgatar`: leia o passe de novo e escolha o que o cliente já pode levar.
6. **Confira a auditoria** em `/painel/auditoria`: cada carimbo, de qual terminal saiu e qual transação o registrou.

Para que seu usuário seja lojista e admin da plataforma, insira as linhas correspondentes em `establishment_members` e `platform_admins` no painel da Supabase.

### Testando o balcão sem internet

Com o PDV aberto, desligue o wifi e registre três vendas. Elas ficam em `/pdv/fila`. Religue: a fila sobe sozinha, em lote, numa transação só.

---

## Comandos

### Dia a dia

| Comando | O que faz |
| :--- | :--- |
| `bun dev` | Sobe o frontend apontando para a Sepolia |
| `bun run test` | Roda os testes dos contratos (precisa do `run` — `test` é comando embutido do Bun) |
| `bun run lint` | Verifica contratos e frontend |
| `bun run format` | Formata contratos e frontend |
| `bun run next:build` | Build de produção do frontend, incluindo o service worker |

### Blockchain

| Comando | O que faz |
| :--- | :--- |
| `bun chain` | Só a blockchain local |
| `bun run deploy` | Publica os contratos e regenera os tipos do frontend |
| `bun compile` | Compila os contratos |
| `bun run seed:balcao` | Registra as oito lojas, assinaturas e regras de carimbo |
| `bun run seed:recompensas` | Dez prêmios de exemplo, com ids fixos |
| `bun run seed:colecao` | Programas de desconto, peças, conquistas e a troca por carimbos |
| `bun run seed:tudo` | Os três acima, na ordem (rede local) |
| `bun run deploy:sepolia` | Publica os nove contratos na Sepolia |
| `bun run seed:sepolia` | Os três seeds, na Sepolia |
| `bun account` | Mostra a conta usada nos deploys |
| `bun generate` | Cria uma conta nova de deploy |
| `bun account:import` | Importa uma chave privada existente |

### Banco de dados

| Comando | O que faz |
| :--- | :--- |
| `bun run db:types` | Regenera `services/database/types.ts` a partir do schema da Supabase (exige `SUPABASE_ACCESS_TOKEN`) |

---

## Publicando

### Frontend

**O deploy sai do repositório, não da linha de comando.** A Vercel observa o
GitHub: publicar é `git push` do branch que ela acompanha. Assim o que está no
ar é sempre um commit que existe — um `vercel --prod` sobe o que está na máquina
de quem rodou o comando, e ninguém consegue dizer, olhando o repositório, o que
foi publicado.

A CLI da Vercel serve só para **configurar**:

```bash
bun run vercel:login                       # uma vez, na primeira máquina
bunx vercel link                           # amarra a pasta ao projeto
bunx vercel env add NOME production        # cada variável, uma por vez
```

O diretório raiz do projeto na Vercel é `packages/nextjs`. As variáveis são as
mesmas de `packages/nextjs/.env.local`, descritas abaixo — dá para configurá-las
pelo painel (Settings → Environment Variables) em vez da CLI. **Nunca** dê o
prefixo `NEXT_PUBLIC_` a um segredo: tudo com esse prefixo é enviado ao
navegador.

### Contratos

A demonstração roda na **Sepolia da Ethereum** (chain id 11155111).

```bash
bun run deploy:sepolia    # publica os nove contratos
bun run seed:sepolia      # lojas, prêmios e a coleção de exemplo
```

Os dois leem `DEPLOYER_PRIVATE_KEY` e `ALCHEMY_API_KEY` de
`packages/foundry/.env`. A conta precisa de pelo menos **0,3 ETH de teste** —
são nove deploys mais algumas dezenas de transações de seed. Faucets:
[Google Cloud](https://cloud.google.com/application/web3/faucet/ethereum/sepolia),
[pk910](https://sepolia-faucet.pk910.de) (sem conta).

Depois do deploy, aponte a aplicação para lá com `CHORINHO_CHAIN_ID=11155111` e
`targetNetworks: [chains.sepolia]` em `packages/nextjs/scaffold.config.ts`.
Nessa ordem: virar a rede antes de publicar deixa o front falando com contrato
que não existe.

Para outra rede pública, o caminho do kit continua valendo:
`bun run deploy --network <rede>` com keystore e senha.

---

## As sete experiências

O aplicativo é um só, dividido em sete experiências ("flavors"). Cada uma tem navegação, tema e manifesto de instalação próprios, sobre a mesma paleta da marca.

| Flavor | Rotas | Para quem |
| :--- | :--- | :--- |
| **Site** | `/`, `/como-funciona`, `/para-comerciantes`, `/ajuda`, `/entrar` | Visitante — site e aquisição |
| **Legal** | `/privacidade`, `/termos`, `/carteira-e-seguranca`, `/cookies` | Quem quer ler as regras |
| **Cliente** | `/explorar` (entrada), `/mapa`, `/local/[slug]`, `/carteira`, `/carteira/[slug]`, `/passe`, `/recompensas`, `/perfil` | Quem compra no bairro |
| **Balcão** | `/pdv`, `/pdv/fila`, `/pdv/resgatar` | Atendente no caixa |
| **Lojista** | `/painel`, `/painel/loja`, `/painel/regras`, `/painel/recompensas`, `/painel/pdv`, `/painel/equipe`, `/painel/assinatura`, `/painel/auditoria` | Dono da loja |
| **Admin** | `/admin`, `/admin/estabelecimentos`, `/admin/pontos`, `/admin/relayer`, `/admin/auditoria` | Nossa equipe |
| **Dev** | `/debug`, `/blockexplorer` | Ferramentas do Scaffold-ETH (o explorador só serve à cadeia local) |

Cada flavor vive num route group em `packages/nextjs/app/` — `(site)`, `(legal)`, `(app)`, `(pos)`, `(merchant)`, `(admin)` e `(dev)` — com layout, navegação e par de temas próprios.

Três deles são instaláveis como aplicativo: o cliente (`/manifest/cliente`), o balcão (`/manifest/pdv`) e o painel do lojista (`/manifest/lojista`).

---

## O balcão

O PDV é a parte do produto que mais precisa funcionar quando tudo o mais falha.

**Não tem login.** Pedir e-mail e senha ao atendente a cada troca de turno é a forma mais confiável de o programa morrer — a senha vira papel colado no monitor, ou o caixa simplesmente para de carimbar. Em vez disso: o lojista cria um terminal em `/painel/pdv`, recebe um código de oito letras, digita uma vez no tablet. Aquele aparelho vira um caixa, para sempre. Some? O lojista desliga pelo painel e ele para de carimbar na hora.

**Funciona sem internet.** A venda é gravada no aparelho primeiro e sobe depois, em lote. O atendente vê o que está pendente em `/pdv/fila`. Quando a conexão volta, tudo drena numa transação só — e a mesma venda nunca credita duas vezes, porque a referência dela é conferida no banco e no contrato.

**O cliente não assina nada.** Quem envia a transação e paga o gás é o relayer da plataforma. A integridade do programa não depende dessa chave: o contrato é que aplica piso de ticket, teto de carimbos por venda, intervalo mínimo e assinatura ativa.

---

## Contratos

Em `packages/foundry/contracts/`:

| Contrato | O que faz |
| :--- | :--- |
| `EstablishmentRegistry` | Diretório de lojas, donos, operadores e papéis da plataforma |
| `SubscriptionManager` | Espelho on-chain da assinatura, agnóstico de gateway |
| `StampLedger` | O núcleo: carimbos, regras com piso de ticket, sequências e idempotência por venda |
| `PointsVault` | Pontos da rede (ERC-1155 intransferível), com escopo configurável por cidade, bairro ou categoria |
| `RewardCatalog` | O que os carimbos e pontos compram; queima as duas moedas na mesma transação |
| `BonusNFT` | Selo de conquista intransferível, por trilha e por tempo de casa |
| `DiscountNFT` | Campanhas e cupons (ERC-1155) — o modelo anterior, ainda em uso |

Rode `bun run test` para os testes. Depois de `bun run deploy`, os tipos aparecem sozinhos em `packages/nextjs/contracts/deployedContracts.ts` — **nunca edite esse arquivo à mão.**

---

## Variáveis de ambiente

**`packages/nextjs/.env.local`** — o que a aplicação lê.

| Variável | Obrigatória | Para quê |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | Endereço do projeto na Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | Chave pública do navegador; só alcança o que a RLS permitir |
| `SUPABASE_SECRET_KEY` | sim | Chave de servidor, para as escritas do sistema. **Nunca com prefixo público** |
| `NEXT_PUBLIC_PRIVY_APP_ID` | sim | Carteira embutida criada no cadastro |
| `PRIVY_APP_SECRET` | sim | Lado servidor do Privy |
| `PASS_HMAC_SECRET` | sim | Assina o passe do cliente. Sem ele, qualquer um forja um passe |
| `RELAYER_PRIVATE_KEY` | sim | A conta que paga o gás dos carimbos |
| `CHORINHO_ADMIN_PRIVATE_KEY` | não | Conta que escreve regra e registro. Em desenvolvimento usa a do relayer |
| `CHORINHO_CHAIN_ID` | não | 31337 (local), 11155111 (Sepolia), 84532 (Base Sepolia), 8453 (Base). Padrão: 31337 |
| `CHORINHO_RPC_URL` | não | RPC próprio; vazio usa o padrão da rede |
| `NEXT_PUBLIC_SITE_URL` | não | Onde a aplicação responde. Só o metadado das peças precisa: carteira e marketplace não adivinham o domínio. Na Vercel cai na URL de produção |
| `NEXT_PUBLIC_MAP_TILE_URL` | não | Servidor de ladrilhos do mapa. Padrão: OpenStreetMap |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | não | RPC próprio em redes públicas |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | não | Conectar carteira externa (uso avançado) |

Gere um `PASS_HMAC_SECRET` com `openssl rand -base64 48`.

**`packages/foundry/.env`** — só para publicar contratos.

| Variável | Para quê |
| :--- | :--- |
| `ALCHEMY_API_KEY` | Deploy em redes públicas |
| `ETHERSCAN_API_KEY` | Verificar contratos no explorador |
| `SITE_URL` | Base da URI de metadado que o `seed:colecao` grava nas peças. Padrão: `http://localhost:3000` |

> Nunca versione um `.env`. O `.gitignore` já bloqueia todos eles, e nenhum segredo pode carregar o prefixo `NEXT_PUBLIC_`.

---

## Como o lojista paga

**Ainda não está decidido** — e isso é de propósito. A cobrança fica atrás de uma interface única (`BillingProvider`), com cinco caminhos pré-engatilhados. Trocar de gateway é trocar uma variável, não refazer código.

```bash
BILLING_PROVIDER=manual        # padrão — a equipe libera a loja à mão, sem gateway
BILLING_PROVIDER=stripe        # cartão nacional e internacional, com portal de autoatendimento
BILLING_PROVIDER=mercadopago   # cartão, Pix, boleto e saldo MP — o lojista já tem conta
BILLING_PROVIDER=asaas         # Pix, boleto e cartão, com régua de inadimplência inclusa
BILLING_PROVIDER=pix           # Pix Automático (Banco Central) — custo por transação quase zero
BILLING_PROVIDER=crypto        # USDC na Base — liquidação instantânea, sem chargeback
```

| Opção | Meios | Recorrência | Ponto forte | Ponto fraco |
| :--- | :--- | :--- | :--- | :--- |
| **Stripe** | Cartão | Nativa | Único com portal pronto para o lojista | Taxa mais alta no Brasil |
| **Mercado Pago** | Cartão, Pix, boleto | Nativa | O lojista já conhece e confia | API de assinatura mais rústica |
| **Asaas** | Pix, boleto, cartão | Nativa | Feito para PME brasileira, taxa baixa | Menos conhecido fora do Brasil |
| **Pix Automático** | Pix | Nativa | Custo quase zero por cobrança | Exige PSP habilitado |
| **USDC (Base)** | Stablecoin | Própria | Instantâneo e sem chargeback | Exige que o lojista tenha cripto |

O plano contratado define o teto de terminais da loja (dez por padrão) e é o piso da cobrança; o uso acima disso entra depois, medido pelas vendas registradas.

**Assinatura vencida bloqueia a emissão de carimbo, mas nunca o resgate.** O cliente não pode ser punido pelo problema de cobrança do lojista.

Até a escolha do gateway, a equipe libera as lojas em `/admin/estabelecimentos` — nada no produto fica bloqueado por essa decisão.

---

## Branches

| Branch | Para quê |
| :--- | :--- |
| `main` | Produção. Só entra por PR com CI verde |
| `dev` | Integração. É para cá que vão os PRs do dia a dia |
| `testes` | QA com dados de exemplo. Pode forçar push à vontade |
| `ci` | Sandbox para mexer no pipeline sem queimar run de PR |

---

## Documentação do projeto

- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — identidade visual, tipografia, cores e componentes
- [`AGENTS.md`](./AGENTS.md) — convenções de código e instruções para agentes

---

Construído sobre [Scaffold-ETH 2](https://docs.scaffoldeth.io).
