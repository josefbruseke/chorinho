<img src="public/og.png" alt="Chorinho" width="720">

# Chorinho

**Chorinho** é a digitalização daquele agrado que só o comércio de bairro sabe dar: a fatia extra de bolo na padaria, o refil de café no coador, a toalha quente na barbearia.

É um programa de fidelidade **compartilhado entre lojas**. O cliente mostra o passe, o caixa lê, e o carimbo cai na hora. Cartela cheia vira prêmio.

O caixa não digita nada. Passou no balcão, ganhou carimbo. Para o cliente é de graça; quem paga é o lojista, R$ 7 por mês.

**Next.js 16 · Supabase · Vercel · Stripe · Bun**

---

## Rodando na sua máquina

**Pré-requisitos:** [Bun](https://bun.sh) **1.3.14** e [Git](https://git-scm.com). A versão do Bun importa — veja [Sobre o `bun.lock`](#sobre-o-bunlock).

```bash
git clone <url-do-repositorio> chorinho
cd chorinho
bun install
cp .env.example .env.local   # e preencha
bun run dev
```

Sobe em http://localhost:3000. Não há blockchain para subir nem contrato para publicar: o que a aplicação precisa é de um projeto Supabase e das três variáveis dele.

### Subindo o banco do zero

O schema inteiro está versionado em `supabase/migrations/` — 14 arquivos, na ordem em que rodam. Contra um projeto novo:

```bash
bunx supabase link --project-ref <seu-projeto>
bunx supabase db push
```

Sem a CLI logada, dá para aplicar um a um com `psql` na connection string do pooler (caractere especial na senha precisa ser percent-encoded: `@` vira `%40`):

```bash
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
```

As migrations criam as 15 tabelas, as 38 políticas de RLS, os quatro enums, o schema `private` com os auxiliares de RLS, o trigger que cria o perfil quando nasce um `auth.users`, o bucket `midia` e a publicação de Realtime. Banco recém-migrado já atende o app — só não tem nenhuma loja.

> **Migration nasce aqui, versionada.** Até setembro de 2026 o schema existia só no projeto hospedado, aplicado pelo painel, e quase se perdeu numa troca de região. Não aplique SQL pelo painel sem salvar o arquivo.

### Testando o fluxo inteiro

1. **Crie uma conta** em `/entrar`.
2. **Abra seu passe** em `/passe`. É o QR que o caixa lê; ele se renova a cada 100 segundos.
3. **Abra o balcão** em `/pdv`, em outra aba. Leia o QR, ou digite o código de 6 dígitos que aparece embaixo dele.
4. **Veja o carimbo cair** em `/carteira`. A tela acende sozinha, sem recarregar.
5. **Entregue um prêmio** em `/pdv/resgatar`: leia o passe de novo e escolha o que o cliente já pode levar.
6. **Confira a auditoria** em `/painel/auditoria`: cada carimbo e de qual terminal saiu.

Para o seu usuário virar lojista e admin da plataforma, insira as linhas correspondentes em `establishment_members` e `platform_admins` no painel da Supabase. **Isso é temporário** — o cadastro self-service do comerciante é o próximo marco, e existe exatamente para ninguém precisar fazer isso na mão.

### Testando o balcão sem internet

Com o PDV aberto, desligue o wifi e registre três vendas. Elas ficam em `/pdv/fila`. Religue: a fila sobe sozinha, em lote, sem carimbar ninguém duas vezes.

---

## Comandos

```bash
bun run dev           # servidor de desenvolvimento
bun run build         # lint + next build + serwist build
bun run serve         # sobe o build de produção
bun run lint          # eslint
bun run check-types   # tsc --noEmit
bun run format        # prettier
bun run db:types      # regera services/database/types.ts a partir da Supabase
```

Os apelidos `next:build`, `next:lint`, `next:check-types`, `next:format` e `next:serve` continuam existindo porque o CI e o hábito os usam — apontam para os de cima.

> **`bun run test`, nunca `bun test`.** Sem o `run`, `test` é comando embutido do Bun: ele varre o sistema de arquivos e roda o que não devia. Hoje o script é só um marcador — **não existe teste automatizado neste repositório**.

### Sobre o `bun.lock`

A imagem de build da Vercel roda **bun 1.3.14**, e isso não se configura: nem `packageManager` nem `BUN_VERSION` mudam. Um bun 1.4+ regrava o lockfile como `lockfileVersion: 2`, que a 1.3.14 não lê — e ela **não falha**, apenas avisa `Ignoring lockfile` e resolve tudo de novo, então o que foi publicado deixa de ser o que está travado aqui. O CI, que usa `--frozen-lockfile`, aí sim quebra.

Se precisar mexer em dependência com um bun mais novo, regere o lockfile com o 1.3.14 antes de commitar:

```bash
curl -sL -o bun.zip https://github.com/oven-sh/bun/releases/download/bun-v1.3.14/bun-darwin-aarch64.zip
unzip -q bun.zip && ./bun-darwin-aarch64/bun install --lockfile-only
```

---

## Estrutura

Um projeto Next.js na raiz. Não há monorepo nem workspaces.

```
app/            rotas (App Router), divididas em route groups
  api/          38 route handlers — toda escrita passa por aqui
components/     design-system/ + um diretório por flavor
services/       database, pdv, passe, billing, merchant, admin
supabase/       migrations versionadas + config.toml
hooks/ utils/   o que sobra, sem dono de domínio
public/         ícones, og.png, service worker gerado
proxy.ts        o middleware do Next 16 (renomeado; runtime nodejs, sem edge)
```

### Os seis flavors

Um app, seis públicos. Cada um é um route group com layout, navegação e tema próprios.

| Onde | Para quem | O que faz |
|---|---|---|
| `(site)` | visitante | vitrine, mapa, como funciona, entrar |
| `(app)` | cliente | mapa, cartelas, prêmios, passe, perfil |
| `(pos)` | caixa | balcão: ler passe, carimbar, entregar prêmio, fila offline |
| `(merchant)` | lojista | loja, regra, recompensas, terminais, equipe, assinatura, auditoria |
| `(admin)` | plataforma | estabelecimentos, auditoria |
| `(legal)` | qualquer um | privacidade, termos, cookies |

### A regra da camada de dados

**Nenhuma escrita sai do navegador.** O cliente do browser é leitura e Realtime, e só; todo INSERT e UPDATE passa por um route handler que valida o papel no servidor. RLS é a segunda linha de defesa, nunca a única. Detalhes em `services/database/README.md`.

O papel não é uma coluna: **cliente** é qualquer conta autenticada, **lojista** é linha ativa em `establishment_members`, **operador** é o cookie de terminal pareado, **admin** é linha em `platform_admins`.

---

## O balcão

A parte que mais importa e a que mais apanha da realidade: o tablet do caixa fica no sol, a internet cai, e a fila não espera.

- **O passe é assinado, curto e de uso único.** HMAC-SHA256 sobre o id do cliente, um nonce e a expiração. Vale 100 segundos e queima na leitura — fotografar a tela não serve para nada.
- **Um código de 6 dígitos** aparece embaixo do QR, para quando a câmera não colabora. Vive cinco minutos, porque digitar demora mais que apontar.
- **O terminal não tem sessão.** É pareado uma vez, por um código de 8 caracteres, e guarda um cookie `httpOnly` de um ano. No banco fica só o hash.
- **Sem internet, a venda entra numa fila** no próprio aparelho e sobe quando a conexão volta — em lote, com idempotência pelo `sale_ref`, gerado no aparelho.
- **A tela do cliente reage** no instante em que o caixa lê o passe.

---

## Como o lojista paga

Um produto, preço pelo número de caixas, **nenhum recurso bloqueado**:

| Caixas | Preço |
|---|---|
| até 3 | R$ 7/mês |
| 4 ou mais | R$ 10/mês |

Quinze dias de teste, sem cartão. Cartão ou **Pix Automático**, no mesmo checkout — nesse ticket o cartão custa 10,3% (3,99% + R$ 0,39 + 0,7% de Billing) e o Pix custa 1,9%, sem contestação.

A cobrança fica atrás de uma porta (`services/billing/`), com o provedor escolhido por variável de ambiente. O `manual` continua existindo depois do Stripe entrar: loja em teste, cortesia e caso de suporte precisam de uma saída que não passe por cartão.

**A cobrança ainda não está no ar.** O adaptador do Stripe é um esqueleto e `/painel/assinatura` mostra os preços sem cobrar de ninguém.

---

## Privacidade

Não é convenção, é estrutura. **O lojista vê contagem e agregado, nunca identidade** — para ele o cliente é um uuid. O que é sensível fica fora do schema exposto ao PostgREST, e o que ele lê é view projetada.

Não coletamos o que não precisamos: nome e foto do cliente são opcionais, e o e-mail existe só para recuperar a conta. Não há analytics, telemetria nem rastreio de comportamento em lugar nenhum do código.

Apagar a conta apaga de verdade — o que, com a blockchain fora, passou a ser possível pela primeira vez.

> As páginas em `/privacidade`, `/termos` e `/cookies` ainda carregam a tarja **"rascunho pendente de revisão jurídica"**. O texto descreve o produto com fidelidade, mas o controlador e o CNPJ não estão preenchidos e nenhum advogado revisou.

---

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável; o navegador só lê com ela |
| `SUPABASE_SECRET_KEY` | `service_role`, ignora RLS, **nunca** com prefixo público |
| `PASS_HMAC_SECRET` | assina o passe do balcão; mínimo 32 caracteres |
| `NEXT_PUBLIC_SITE_URL` | base dos links absolutos |
| `NEXT_PUBLIC_MAP_TILE_URL` | tiles do mapa |
| `NEXT_PUBLIC_MAP_TILE_ATTRIBUTION` | exigência de licença do OpenStreetMap |
| `BILLING_PROVIDER` | `manual` ou `stripe` |
| `CHORINHO_MODO_TESTE` | abre a demonstração num endereço público |
| `CHORINHO_MODO_TESTE_CHAVE` | a chave que destranca o modo de teste |

`.env.example` traz todas, com um comentário explicando o porquê de cada uma.

---

## Publicando

A integração Git da Vercel **não está conectada**: o repositório é privado, pertence a outra conta, e instalar o app da Vercel nele exige `admin`. Até isso mudar, publica-se pela CLI, da raiz, com a árvore limpa e sincronizada:

```bash
bunx vercel --prod --yes
```

**Nunca dê o deploy por feito sem conferir uma rota que só exista na versão nova.** Já aconteceu de estar no ar código de horas antes.

O CI (`.github/workflows/ci.yaml`) roda lint, tipos, build e uma guarda que falha se `wagmi`, `viem`, `privy`, `rainbowkit`, `scaffold-eth` ou `deployedContracts` reaparecerem no código.

---

## O que ainda não existe

Honestidade sobre o estado, para ninguém descobrir clicando:

- **Cobrança.** O Stripe é um esqueleto: nenhuma loja é cobrada, nenhuma é bloqueada por falta de pagamento.
- **Cadastro do comerciante.** `/cadastro` é um stub; a equipe libera loja à mão no painel da Supabase.
- **Pontos da cidade.** Viviam num contrato e não têm tabela: os saldos voltam zerados e marcados como indisponíveis.
- **Peças colecionáveis e entrega de conquistas.** Mesma história — `/api/pos/peca` e `/api/carteira/conquistas/[id]` respondem 503, honestamente, em vez de fingir.
- **Regra de carimbo.** `/painel/regras` é somente leitura: hoje a regra é a mesma em toda loja (um carimbo por visita, sem carência).
- **Transferência.** O lojista vai poder decidir se carimbo e prêmio podem ser passados adiante, como presente para um amigo, ou ficam presos a quem ganhou. Ainda não está implementado: hoje tudo é intransferível.
- **Testes.** Não há nenhum. Os 36 que existiam eram dos contratos e foram embora com eles.

---

## Documentação do projeto

- **`AGENTS.md`** — como trabalhar aqui: arquitetura, convenções e as armadilhas que já custaram tempo.
- **`DESIGN_SYSTEM.md`** — identidade, paleta, tipografia e primitivas de interface.
- **`services/database/README.md`** — a camada de dados e a regra de que nenhuma escrita sai do navegador.

---

## História

Até setembro de 2026 o Chorinho rodava sobre Scaffold-ETH 2: nove contratos Solidity, carteira embutida criada no cadastro e um relayer patrocinando o gás. Funcionava, e nunca chegou a produção.

A blockchain cobrava caro em três moedas — gás, doze segundos de espera por carimbo, e uma carteira que ninguém tinha pedido — e não comprava nada que o Postgres não fizesse melhor aqui. Uma delas era passivo direto: registro imutável contra o direito de eliminação da LGPD.

Não havia, aliás, uma única chamada de contrato no cliente: todo o I/O de cadeia morava em três módulos de servidor. O resto era peso morto no bundle.

Hoje é Supabase (em São Paulo), Vercel e Stripe. O carimbo cai instantâneo, apagar a conta apaga de verdade, e o cliente nunca mais precisa ouvir a palavra carteira.

---

Licença MIT. Veja `LICENCE`.
