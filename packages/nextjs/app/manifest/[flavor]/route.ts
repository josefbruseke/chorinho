import { NextResponse } from "next/server";
import { INICIO } from "~~/utils/rotas";

/**
 * Três aplicativos instaláveis, um código.
 *
 * O `app/manifest.ts` do Next só permite um manifesto por projeto, e aqui são
 * três públicos com necessidades diferentes: o cliente instala a vitrine do
 * bairro, o atendente instala o balcão, o lojista instala o painel. Cada um
 * abre na sua tela inicial e aparece com o nome certo na gaveta.
 *
 * As `start_url` vêm de `INICIO`: instalar o aplicativo e cair na página de
 * apresentação — que era o que acontecia com o cliente — é a primeira coisa que
 * faz alguém desinstalar.
 */

const ICONES = [
  { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

const MANIFESTOS = {
  cliente: {
    name: "Chorinho — comércio do bairro",
    short_name: "Chorinho",
    description: "Os comércios do seu bairro, sua cartela de carimbos e suas recompensas.",
    start_url: INICIO.cliente,
    // O cliente às vezes chega por link compartilhado; barra de navegação
    // ajuda ele a voltar.
    display: "standalone",
    background_color: "#fbf8f2",
    theme_color: "#c2410c",
    shortcuts: [
      { name: "Meu passe", short_name: "Passe", url: "/passe" },
      { name: "Minhas cartelas", short_name: "Cartelas", url: "/carteira" },
    ],
  },
  pdv: {
    name: "Chorinho Balcão",
    short_name: "Balcão",
    description: "Registre a venda e carimbe o cliente, com ou sem internet.",
    start_url: INICIO.pos,
    // Sem barra nenhuma: o tablet do caixa é um aparelho de uma função só, e
    // um botão de voltar visível é um jeito de o atendente se perder.
    display: "fullscreen",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#261c14",
    shortcuts: [{ name: "Fila de envio", short_name: "Fila", url: "/pdv/fila" }],
  },
  lojista: {
    name: "Chorinho para lojistas",
    short_name: "Chorinho Loja",
    description: "Acompanhe carimbos, recompensas e clientes da sua loja.",
    start_url: INICIO.merchant,
    display: "standalone",
    background_color: "#fbf8f2",
    theme_color: "#261c14",
  },
} as const;

type Flavor = keyof typeof MANIFESTOS;

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(MANIFESTOS).map(flavor => ({ flavor }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ flavor: string }> }) {
  const { flavor } = await params;
  const base = MANIFESTOS[flavor as Flavor];
  if (!base) return NextResponse.json({ erro: "manifesto desconhecido" }, { status: 404 });

  return NextResponse.json(
    { ...base, id: `/?app=${flavor}`, scope: "/", lang: "pt-BR", dir: "ltr", icons: ICONES },
    { headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" } },
  );
}
