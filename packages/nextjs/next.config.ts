import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // As rotas mudaram de lugar na reestruturacao por flavor (M2). Link antigo
  // compartilhado ou salvo nos favoritos continua chegando no lugar certo.
  async redirects() {
    return [
      { source: "/meus-cupons", destination: "/carteira", permanent: true },
      { source: "/meus-cupons/:id", destination: "/carteira/:id", permanent: true },
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

const isIpfs = process.env.NEXT_PUBLIC_IPFS_BUILD === "true";

if (isIpfs) {
  nextConfig.output = "export";
  nextConfig.trailingSlash = true;
  nextConfig.images = {
    unoptimized: true,
  };
}

export default nextConfig;
