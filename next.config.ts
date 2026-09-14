import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  /**
   * Quem pode pedir os recursos de desenvolvimento do Next.
   *
   * Este projeto se testa em tablet: o balcão é feito para ser aberto no
   * aparelho do caixa, não numa aba ao lado do editor. Sem esta lista, abrir
   * `http://192.168.0.x:3000/pdv` no tablet entrega a página, mas o Next
   * recusa os scripts — a tela aparece e nada responde, sem erro nenhum
   * visível. Perdi um bom tempo achando que era defeito do produto.
   *
   * Vale só em desenvolvimento. O build publicado não lê isto.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.0.0/16", "10.0.0.0/8", "172.16.0.0/12"],
  // As rotas mudaram de lugar na reestruturacao por flavor (M2). Link antigo
  // compartilhado ou salvo nos favoritos continua chegando no lugar certo.
  async redirects() {
    return [
      { source: "/meus-cupons", destination: "/carteira", permanent: true },
      // O cupom antigo era identificado por tokenId; a cartela e por loja.
      // Nao ha traducao possivel de um para o outro -- cai na lista.
      { source: "/meus-cupons/:id", destination: "/carteira", permanent: true },
      { source: "/parceiro", destination: "/pdv", permanent: true },
      // O scanner deixou de ser rota propria no M4: escanear e uma etapa da
      // venda, nao um destino.
      { source: "/pdv/escanear", destination: "/pdv", permanent: true },
    ];
  },
  typescript: {
    ignoreBuildErrors: process.env.NEXT_PUBLIC_IGNORE_BUILD_ERROR === "true",
  },
};

export default nextConfig;
