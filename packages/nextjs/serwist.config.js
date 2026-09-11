// @ts-check
import { serwist } from "@serwist/next/config";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

/**
 * O service worker e construido por fora do Next, no modo configurador.
 *
 * O Next 16 usa Turbopack por padrao e o plugin de webpack do Serwist nao roda
 * nele. Aqui o `serwist build` le a saida do `next build` e escreve o
 * `public/sw.js` depois — o mesmo resultado, sem abrir mao do Turbopack.
 */

// Versao da pagina offline. Sem isso, um tablet que instalou o balcao em marco
// continuaria servindo a tela de marco para sempre.
const revisao = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() || randomUUID();

export default serwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/sem-conexao", revision: revisao }],
  /**
   * Fora do precache: os 400 pedacos de JavaScript do build.
   *
   * O padrao baixaria 18 MB no momento em que o atendente instala o aplicativo
   * -- num celular barato, em rede de bairro, isso e a instalacao inteira
   * falhando. Esses arquivos ja sao guardados em cache conforme vao sendo
   * usados (`next-static-js-assets` no runtime caching), entao o balcao fica
   * offline-capaz depois do primeiro uso com internet, que e como ele vai ser
   * usado de qualquer jeito.
   *
   * O que continua no precache: o CSS, os icones e a pagina de falta de
   * conexao -- poucos kilobytes, e o que garante que a tela nao apareca crua.
   */
  manifestTransforms: [
    manifest => ({
      manifest: manifest.filter(entrada => !/\/chunks\/|\.map$/.test(entrada.url)),
      warnings: [],
    }),
  ],
});
