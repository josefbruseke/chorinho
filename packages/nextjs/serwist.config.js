// @ts-check
import { serwist } from "@serwist/next/config";

/**
 * O service worker e construido por fora do Next, no modo configurador.
 *
 * O Next 16 usa Turbopack por padrao e o plugin de webpack do Serwist nao roda
 * nele. Aqui o `serwist build` le a saida do `next build` e escreve o
 * `public/sw.js` depois — o mesmo resultado, sem abrir mao do Turbopack.
 */

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
   *
   * Fora tambem as rotas do grupo (dev): elas respondem 404 em producao, e uma
   * unica entrada de precache que devolve 404 faz a instalacao INTEIRA do
   * service worker falhar -- o aplicativo fica sem modo offline por causa de
   * uma pagina de depuracao que ninguem usa.
   */
  manifestTransforms: [
    manifest => ({
      manifest: manifest.filter(
        entrada => !/\/chunks\/|\.map$/.test(entrada.url) && !/^\/(debug|blockexplorer)(\/|$)/.test(entrada.url),
      ),
      warnings: [],
    }),
  ],
});
