// @ts-check
import { serwist } from "@serwist/next/config";

/**
 * O service worker e construido por fora do Next, no modo configurador.
 *
 * O Next 16 usa Turbopack por padrao e o plugin de webpack do Serwist nao roda
 * nele. Aqui o `serwist build` le a saida do `next build` e escreve o
 * `public/sw.js` depois — o mesmo resultado, sem abrir mao do Turbopack.
 */

/**
 * O que fica de fora do precache.
 *
 * So alcanca os arquivos estaticos: as paginas do Next entram no manifesto
 * depois desta transformacao, entao nao adianta tentar remover rota daqui --
 * uma rota que nao pode ser precacheada precisa responder 200, e nao 404.
 */
const FORA_DO_PRECACHE = [
  // Os 400 pedacos de JavaScript do build. O padrao baixaria 18 MB no momento
  // em que o atendente instala o aplicativo -- num celular barato, em rede de
  // bairro, isso e a instalacao inteira falhando. Eles ja sao guardados em
  // cache conforme vao sendo usados, entao o balcao fica offline-capaz depois
  // do primeiro uso com internet, que e como ele vai ser usado de qualquer
  // jeito.
  /\/chunks\//,
  /\.map$/,
  // Manifestos de build que o Turbopack nao emite: respondem 404, e UMA
  // entrada de precache com 404 faz a instalacao INTEIRA do service worker
  // falhar -- o aplicativo fica sem modo offline por causa de um arquivo que
  // nem existe.
  /_(ssg|build|clientMiddleware)Manifest\.js$/,
];

export default serwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Nada de `additionalPrecacheEntries` para a pagina offline.
  //
  // O `@serwist/next` ja coloca todas as paginas do build no precache, com a
  // revisao derivada do conteudo. Acrescentar `/sem-conexao` a mao criava uma
  // SEGUNDA entrada para a mesma URL com outra revisao, e o Serwist recusa
  // entradas conflitantes lancando na avaliacao do script -- ou seja, o
  // service worker simplesmente nao registrava, e o aplicativo inteiro ficava
  // sem modo offline sem nenhum erro visivel na tela.
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
      manifest: manifest.filter(entrada => !FORA_DO_PRECACHE.some(padrao => padrao.test(entrada.url))),
      warnings: [],
    }),
  ],
});
