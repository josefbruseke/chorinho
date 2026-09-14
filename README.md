<img src="public/og.png" alt="Chorinho" width="720">

# Chorinho

**Chorinho** é a digitalização daquele agrado que só o comércio de bairro sabe dar: a fatia extra de bolo na padaria, o refil de café no coador, a toalha quente na barbearia.

É um programa de fidelidade **compartilhado entre lojas**. O cliente mostra o passe, o caixa lê, e o carimbo cai na hora — pelas regras daquele comerciante. Carimbo vira produto, desconto e selo de conquista.

O caixa não digita nada. Passou no balcão, ganhou carimbo.

---

## Rodando na sua máquina

**Pré-requisitos:** [Bun](https://bun.sh) 1.3+ e [Git](https://git-scm.com).

```bash
git clone <url-do-repositorio> chorinho
cd chorinho
bun install
cp .env.example .env.local   # e preencha
bun run dev
```

A aplicação sobe em http://localhost:3000. Não há cadeia para subir, nem
contrato para publicar: o que ela precisa é de um projeto Supabase e das três
variáveis dele.

### Testando o fluxo inteiro

1. **Crie uma conta** em `/entrar`.
2. **Abra seu passe** em `/passe`. É o QR que o caixa lê — ele se renova sozinho.
3. **Abra o balcão** em `/pdv`, em outra aba. Leia o QR, ou digite o código de 6 dígitos que aparece embaixo dele.
4. **Veja o carimbo cair** em `/carteira`. A tela acende sozinha, sem recarregar.
5. **Entregue um prêmio** em `/pdv/resgatar`: leia o passe de novo e escolha o que o cliente já pode levar.
6. **Confira a auditoria** em `/painel/auditoria`: cada carimbo e de qual terminal saiu.

Para que seu usuário seja lojista e admin da plataforma, insira as linhas
correspondentes em `establishment_members` e `platform_admins` no painel da
Supabase. **Isso é temporário** — o cadastro self-service do comerciante é o
próximo marco, e existe justamente para que ninguém precise fazer isso na mão.

### Testando o balcão sem internet

Com o PDV aberto, desligue o wifi e registre três vendas. Elas ficam em
`/pdv/fila`. Religue: a fila sobe sozinha, em lote.

---

## Comandos

```bash
bun run dev               # servidor de desenvolvimento
bun run next:build        # build de produção
bun run next:check-types  # tsc --noEmit
bun run next:lint         # eslint
bun run format            # prettier
bun run db:types          # regera services/database/types.ts a partir da Supabase
```

> **`bun run test`, nunca `bun test`.** Sem o `run`, `test` é comando embutido
> do Bun: ele varre o sistema de arquivos e roda o que não devia.

---

## As experiências

Um app, seis públicos. Cada um é um route group em `app/`, com layout,
navegação e tema próprios.

| Onde | Para quem | O que faz |
|---|---|---|
| `(site)` | visitante | vitrine, mapa, como funciona, entrar |
| `(app)` | cliente | mapa, cartelas, prêmios, passe, perfil |
| `(pos)` | caixa | balcão: ler passe, carimbar, entregar prêmio, fila offline |
| `(merchant)` | lojista | loja, regra, recompensas, terminais, equipe, assinatura, auditoria |
| `(admin)` | plataforma | estabelecimentos, auditoria |
| `(legal)` | qualquer um | privacidade, termos, cookies |

## O balcão

A parte que mais importa e a que mais apanha da realidade: o tablet do caixa
fica no sol, a internet cai, e a fila não espera.

- **O passe é assinado, curto e de uso único.** HMAC-SHA256 sobre o id do
  cliente, um nonce e a expiração. Vale por instantes e queima na leitura —
  fotografar a tela não serve para nada.
- **Um código de 6 dígitos** aparece embaixo do QR, para quando a câmera não
  colabora.
- **O terminal não tem sessão.** Ele é pareado uma vez, por um código de 8
  caracteres, e guarda um cookie `httpOnly` de um ano. No banco fica só o hash.
- **Sem internet, a venda entra numa fila** no próprio aparelho e sobe quando a
  conexão volta — em lote, sem carimbar ninguém duas vezes.
- **A tela do cliente reage** no instante em que o caixa lê o passe.

---

## Como o lojista paga

Um produto, preço pelo número de terminais, **nenhum recurso bloqueado**:

| Caixas | Preço |
|---|---|
| até 3 | R$ 7/mês |
| 4 ou mais | R$ 10/mês |

Quinze dias de teste, sem cartão. Cartão ou **Pix Automático**, no mesmo
checkout — o Pix custa 1,9% contra 10,3% do cartão nesse ticket, e não tem
contestação.

A cobrança fica atrás de uma porta (`services/billing/`), com o provedor
escolhido por variável de ambiente. O `manual` continua existindo depois do
Stripe entrar: loja em teste, cortesia e caso de suporte precisam de uma saída
que não passe por cartão.

---

## Variáveis de ambiente

| Variável | Para quê |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável, só leitura |
| `SUPABASE_SECRET_KEY` | `service_role`, só no servidor |
| `PASS_HMAC_SECRET` | assina o passe do balcão; mínimo 32 caracteres |
| `NEXT_PUBLIC_SITE_URL` | base dos links absolutos |
| `NEXT_PUBLIC_MAP_TILE_URL` | tiles do mapa |
| `BILLING_PROVIDER` | `manual` ou `stripe` |

---

## Publicando

A integração Git da Vercel não está conectada — o repositório é privado e
pertence a outra conta, e instalar o app da Vercel nele exige `admin`. Até isso
mudar, publica-se pela CLI, da raiz, com a árvore limpa:

```bash
bunx vercel --prod --yes
```

**Nunca dê o deploy por feito sem conferir uma rota que só exista na versão
nova.**

---

## Documentação do projeto

- **`AGENTS.md`** — como trabalhar neste repositório: arquitetura, convenções e as armadilhas que já custaram tempo.
- **`DESIGN_SYSTEM.md`** — identidade, paleta, tipografia e primitivas de interface.
- **`services/database/README.md`** — a camada de dados e a regra de que nenhuma escrita sai do navegador.

---

## História

Até setembro de 2026 o Chorinho rodava sobre Scaffold-ETH 2: nove contratos
Solidity, carteira embutida criada no cadastro e um relayer patrocinando o gás.
Funcionava, e nunca chegou a produção.

A blockchain cobrava caro em três moedas — gás, doze segundos de espera por
carimbo, e uma carteira que ninguém tinha pedido — e não comprava nada que o
Postgres não fizesse melhor aqui. Uma delas era passivo direto: registro
imutável contra o direito de eliminação da LGPD.

Hoje é Supabase, Vercel e Stripe. O carimbo cai instantâneo, apagar a conta
apaga de verdade, e o cliente nunca mais precisa ouvir a palavra carteira.

---

Licença MIT. Veja `LICENCE`.
