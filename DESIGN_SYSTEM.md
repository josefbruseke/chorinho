# Sistema de Design — Chorinho

> **Diretriz de Produto:** O Design System existe como arquitetura de código padronizada e documentação técnica neste arquivo. Ele **não deve** ser exibido como página pública ou banner na interface do cliente final, mantendo a experiência do usuário 100% focada no comércio local de bairro.

---

## 1. Filosofia & Identidade

O **Chorinho** é a digitalização do afeto presencial do comércio físico brasileiro.

- **O que é o "Chorinho"?** É aquele agrado cortesia que só o comércio de bairro sabe dar: a fatia extra de bolo na padaria, o refil de café no coador, a toalha quente na barbearia.
- **Não-Hightech:** Afastamento radical da estética fria "crypto/cyberpunk" (fundos pretos com neon, texto em monospace cru, IDs hexadecimais expostos).
- **Calor Humano & Tátil:** Interfaces que lembram papéis kraft, xícaras de cerâmica, carimbos manuais de tinta e recibos perfurados.

---

## 2. Tipografia

A tipografia do Chorinho combina a expressividade acolhedora de um clássico serif editorial com a legibilidade rápida de uma sans moderna em telas de celular sob luz natural.

| Família | Uso | Fonte | Variável CSS |
| :--- | :--- | :--- | :--- |
| **Display / Títulos** | Títulos h1 a h3, nomes de estabelecimentos, destaques | **Fraunces** (Google Fonts Variable Serif) | `--font-fraunces` (`font-serif`) |
| **Interface / Textos** | Corpo de texto, botões, números, valores, formulários | **Plus Jakarta Sans** (Google Fonts) | `--font-plus-jakarta-sans` (`font-sans`) |

---

## 3. Cores & Tokens

Localizados em `packages/nextjs/components/design-system/tokens.ts` e refletidos nas variáveis de tema DaisyUI / Tailwind em `globals.css`:

### Paleta Principal

- **Verde da Cana (`#76c112` / `primary`):** Cor primária da marca. Evoca a folha nova da cana e o frescor da garapa no balcão. Por ser clara, recebe sempre tinta escura.
- **Tinta Oliva (`#1c2010` / `secondary`):** Tom de alto contraste para textos nobres, títulos escuros e botões de destaque.
- **Amarelo do Caldo (`#d8b301` / `accent`):** Destaque das recompensas, estrelas e celebração do "Chorinho da Casa". O amarelo-lima `#d6cc3e` é o `warning`.
- **Papel Claro (`#fbfaf1` / `base-200`):** Fundo acolhedor da aplicação, substituindo brancos clínicos.
- **Bagaço (`#cec69c` / `base-300`):** Divisórias e contornos suaves táteis.
- **Verde Fechado (`#3f7d05` / `success`):** Validações de balcão e selo de estabelecimento verificado.

---

## 4. Diretriz de Ícones (Zero Emojis)

> **REGRA FUNDAMENTAL:** Nunca utilize emojis (como ☕, ✨, 🥐, 💈, 📚, 🛍️) na interface do usuário.

- Toda iconografia deve utilizar componentes vetoriais de bibliotecas oficiais, primariamente `@heroicons/react/24/outline` e `@heroicons/react/24/solid`.
- Categorias utilizam o componente `CategoryIcon` (`~~/components/vitrine/CategoryIcon`):
  - **Cafés & Gastronomia:** `BuildingStorefrontIcon`
  - **Lazer & Experiências:** `SunIcon`
  - **Barbearias & Estética:** `ScissorsIcon`
  - **Cultura & Livros:** `BookOpenIcon`
  - **Mercados & Lojas:** `ShoppingBagIcon`

---

## 5. Primitivas do Design System

Todos os componentes primitivos estão exportados em `~~/components/design-system`:

```tsx
import {
  Button,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  StampCard,
  ReceiptTicket,
  CounterPad,
  Heading,
  Text,
  chorinhoTokens,
} from "~~/components/design-system";
```

### Componentes Chave

1. **`StampCard`** (`StampCard.tsx`):
   - Cartela de carimbos física digitalizada.
   - Suporta contagem customizável de slots (ex: 5 ou 10).
   - Efeito visual de carimbo de tinta prensado (`scale-105 rotate-[-2deg] bg-primary`).
   - Estado de comemoração ao completar a cartela com instrução clara para o balcão.

2. **`ReceiptTicket`** (`ReceiptTicket.tsx`):
   - Bilhete estilo cupom fiscal de papel com entalhes perfurados semicirculares nas laterais.
   - Área de QR Code, código de balcão e contagem de usos restantes.

3. **`CounterPad`** (`CounterPad.tsx`):
   - Teclado numérico grande de alta usabilidade pensado especificamente para lojistas e atendentes operando celulares ou tablets no balcão físico de forma rápida.

4. **`Button`** (`Button.tsx`):
   - Variantes: `primary`, `secondary`, `accent`, `outline`, `ghost`.
   - Cantos generosos `rounded-2xl` com micro-interação tátil `active:scale-[0.98]`.

5. **`Card`** (`Card.tsx`):
   - Elevação tátil suave, bordas de bagaço `#cec69c` e opção `notched={true}` para recortes laterais de bilhete.

6. **`FeaturedCarousel`** (`FeaturedCarousel.tsx`):
   - Carrossel tátil com rolagem suave por snap, setas de navegação, indicadores de posição e cards visuais de alta fidelidade para os comércios do bairro.

