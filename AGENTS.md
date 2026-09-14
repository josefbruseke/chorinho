# AGENTS.md

Guia para agentes que trabalham neste repositório.

## O que é o Chorinho

Fidelidade para comércio de bairro. O cliente mostra um QR no balcão, o caixa
lê, o carimbo cai na cartela. Quando a cartela fecha, vira prêmio. O lojista
paga uma assinatura barata; para o cliente é de graça.

Não é um app de cupom e não é cripto. Até setembro de 2026 rodava sobre
Scaffold-ETH 2, com nove contratos Solidity, carteira embutida e relayer
pagando gás. **Tudo isso foi removido.** Se você encontrar `wagmi`, `viem`,
`privy`, `rainbowkit`, `scaffold-eth`, `deployedContracts`, `relayer`,
`onchain_id` ou a palavra "blockchain" fora de um comentário histórico, é
resquício — apague, não estenda. O CI falha se algum deles voltar.

## Pilha

Um único projeto Next.js na raiz. Não há workspaces, não há monorepo.

- **Next.js 16**, App Router, React 19, TypeScript, Bun
- **Supabase** — Postgres, Auth, Storage, Realtime, PostGIS
- **Stripe** — assinatura do lojista (cartão e Pix Automático)
- **Vercel** — hospedagem
- **Tailwind v4 + DaisyUI 5** — configurados por CSS, em `styles/globals.css`;
  não existe `tailwind.config.js`
- **Leaflet** — mapa; **Serwist** — PWA e balcão offline

## Comandos

```bash
bun run dev              # servidor de desenvolvimento
bun run next:build       # build de produção (é o que pega erro de Server/Client Component)
bun run next:check-types # tsc --noEmit
bun run next:lint        # eslint
bun run format           # prettier
bun run db:types         # regera services/database/types.ts a partir do projeto Supabase
```

**`bun run test`, nunca `bun test`.** `test` é comando embutido do Bun: sem o
`run` ele varre o sistema de arquivos e roda o que não devia.

## Arquitetura

### Sete flavors, um app

`app/` é dividido em route groups, cada um com layout, navegação e tema
próprios:

| Grupo | Para quem | Navegação |
|---|---|---|
| `(site)` | visitante | topo |
| `(app)` | cliente | barra inferior (`TabBar`) |
| `(pos)` | caixa | nenhuma — tela cheia, retrato travado |
| `(merchant)` | lojista | `NavDeBackOffice` |
| `(admin)` | plataforma | `NavDeBackOffice` |
| `(legal)` | documentos | sumário lateral |

`components/FlavorTheme.tsx` aplica o tema de cada flavor. Ele só escreve
`data-theme` **depois de montar**: o servidor não sabe o tema do visitante, e se
chutar, o React 19 detecta divergência na hidratação e **não corrige atributo**.

### A regra que orienta toda a camada de dados

**Nenhuma escrita sai do navegador.** O cliente do browser
(`services/database/browser.ts`) é leitura e Realtime, e só. Todo INSERT e
UPDATE passa por um Route Handler que valida o papel no servidor, normalmente
com `supabaseAdmin()` (`services/database/admin.ts`, `service_role`, marcado
`server-only`).

RLS é a segunda linha de defesa, nunca a única.

### Papéis

Não existe coluna `role` em `profiles`. O papel é derivado:

- **cliente** — qualquer conta autenticada
- **lojista** — linha ativa em `establishment_members` com `role in ('owner','manager')`; use `lojaDoGestor` / `ErroDeGestao` de `services/merchant/acesso.ts`
- **operador** — cookie de terminal pareado (`pos_terminals`) ou membro ativo
- **admin** — linha em `platform_admins`; use `services/admin/acesso.ts`

### Middleware

Next 16 chama o arquivo de `proxy.ts`, não `middleware.ts`, e o export é
`proxy`. O runtime é `nodejs` e **não é configurável** — não existe edge aqui.

`proxy.ts` é conveniência de navegação, **nunca a barreira de segurança**: o
papel é validado no servidor em toda rota. `/pdv` fica de fora de propósito —
o tablet do caixa não tem sessão Supabase, opera por cookie de terminal.

Use sempre `supabase.auth.getClaims()` (verifica a assinatura do JWT contra o
JWKS do projeto), nunca `getSession()`.

### Privacidade não é convenção, é estrutura

O lojista vê contagem e agregado; **nunca a identidade do cliente**. Isso não é
"a gente não faz o join" — é schema: o que é sensível fica fora do schema
exposto ao PostgREST, e o lojista lê por view projetada.

Cuidado com views: no Postgres elas são `security definer` por padrão e
**furam a RLS**. Uma view sobre `sales` entrega exatamente as linhas que a
política existia para esconder.

Não colete o que não precisa. Nome e foto do cliente são opcionais; e-mail
existe só para recuperar a conta.

## Estilo

### Idioma

Código, comentários, identificadores, mensagens de erro e commits em
**português do Brasil**. Nomes de tabela e coluna em inglês, porque o schema já
é assim.

### Comentários

Comentário explica **por quê**, nunca o quê. Se descreve o que a linha abaixo
faz, apague. Este repositório tem comentários bons — leia os vizinhos antes de
escrever e acerte a densidade e a voz. Quando a documentação e o comportamento
local divergirem, a documentação ganha, e a divergência vira comentário com o
link.

### Convenções

| Estilo | Onde |
|---|---|
| `UpperCamelCase` | tipo, componente, enum |
| `lowerCamelCase` | variável, função, propriedade |
| `CONSTANT_CASE` | constante de módulo |

- `type`, não `interface`. Sem prefixo `T`: `Endereco`, não `TEndereco`.
- Alias `~~/` para tudo dentro do projeto.
- Não tipar o que o TypeScript infere.

### Interface

Leia `DESIGN_SYSTEM.md` antes de mexer em tela. O resumo que mais se esquece:

- **Zero emoji.** Só Heroicons. Categorias passam por `components/vitrine/CategoryIcon`.
- **`primary` preenche, `brand-ink` escreve.** `text-primary` só sobre fundo escuro.
- Primitivas em `components/design-system/` — `Button`, `Card`, `Badge`,
  `StampCard`, `ReceiptTicket`, `CounterPad`, `Typography`. Prefira DaisyUI a
  Tailwind cru quando o componente existe.
- O design system é código e documento. **Nunca vira página pública.**
- Alvo de toque mínimo 56px; o balcão é usado no sol, com pressa.

### Documentação

**Pesquise a documentação atual antes de implementar.** Não confie na memória e
não deduza API lendo `.d.ts` do `node_modules` — já custou tempo e código
errado neste repositório. Supabase pelo MCP e pelo changelog; o resto pelo
**Context7 MCP**.

## Armadilhas conhecidas

- **Service worker.** Entrada duplicada no precache derruba o registro inteiro,
  e uma única entrada 404 deixa o worker preso em `installing`. Depois de mexer
  em `serwist.config.js` ou `app/sw.ts`, rode `bun run next:build` + `bunx next start`
  e confira no navegador que o worker está `activated`.
- **Altura do mapa.** `relative` vence `absolute` na ordem do Tailwind; com
  posição relativa o `height: 100%` do Leaflet vira `auto` quando a altura do
  pai vem de `flex-1`. Tela branca, sem erro.
- **`moveend` do Leaflet não dispara na montagem.** A carga inicial precisa de
  `map.whenReady(...)` — antes disso `getBounds()` devolve retângulo degenerado.
- **O React Compiler recusa `useMemo` com `try/catch`.** Para ler
  `localStorage`, use inicializador preguiçoso do `useState`.
- **`createBrowserClient` do `@supabase/ssr` acusa depreciação falsa.** São duas
  sobrecargas e só a de `get`/`set`/`remove` está depreciada. A doc manda **não**
  passar `cookies`.
- **Componente usado em layout de route group precisa de `"use client"`** se
  tocar em hook.
- **`next-env.d.ts` alterna sozinho** entre `./.next/dev/types/routes.d.ts` e
  `./.next/types/routes.d.ts` conforme você rode `dev` ou `build`. É ruído
  gerado; reverta com `git checkout --`.
- **Não regere o `bun.lock` com bun 1.4+.** A imagem de build da Vercel roda
  **bun 1.3.14**, que não lê o `lockfileVersion: 2` que o 1.4 escreve. Ela não
  falha: avisa `Ignoring lockfile` e resolve tudo de novo — o que foi publicado
  deixa de ser o que está travado no repositório. O CI, que usa
  `--frozen-lockfile`, aí sim quebra. `BUN_VERSION` e `packageManager` **não**
  mudam o bun da Vercel. Se precisar mexer em dependência com um bun mais novo,
  regere o lockfile com o 1.3.14 antes de commitar:
  `curl -sL -o b.zip https://github.com/oven-sh/bun/releases/download/bun-v1.3.14/bun-darwin-aarch64.zip`
  e `./bun install --lockfile-only`.
- **Realtime.** `postgres_changes` é *best-effort*: cliente que desconecta 30s
  perde o evento e não há fila. Para o que não pode ser perdido, use Broadcast
  from Database em canal privado.

## Publicar

A integração Git da Vercel **não está conectada** — o repositório é privado e
pertence a outra conta, e instalar o app exige `admin`. Até isso mudar:

```bash
bunx vercel --prod --yes     # da raiz, com a árvore limpa e sincronizada
```

**Nunca afirme que publicou sem conferir uma rota que só exista na versão
nova.** Já aconteceu de estar no ar código de horas antes.
