/**
 * O passe que o cliente mostra no balcão.
 *
 * A versão 1 era `{owner, tokenId}` em JSON puro, com um PIN derivado do próprio
 * endereço. Quem soubesse o endereço de alguém "era" essa pessoa no caixa. Esta
 * versão resolve isso com três propriedades:
 *
 * - **Assinado**: um HMAC do servidor prova que o passe saiu daqui.
 * - **Curto**: expira em dois minutos, então uma foto da tela não vale nada.
 * - **Uso único**: o nonce é queimado na primeira leitura.
 *
 * A assinatura é do SERVIDOR, não da carteira. Pedir assinatura ao usuário a
 * cada 90 segundos, de pé no balcão, seria uma experiência insuportável — e o
 * caixa já confere tudo contra a blockchain antes de creditar.
 *
 * O payload fica com ~120 caracteres de propósito: gera um QR de baixa
 * densidade, que câmera de celular barato lê de primeira. Num balcão movimentado
 * isso é a diferença entre escanear e segurar a fila.
 */

// Cem segundos. Curto o bastante para uma foto da tela não valer nada, longo o
// bastante para o cliente achar o app, destravar o telefone e chegar ao balcão.
export const PASSE_VALIDADE_SEGUNDOS = 100;

// Versão 3: o campo `a` deixou de ser endereço de carteira e passou a ser o id
// do perfil. O número sobe porque o formato mudou de verdade — passe da versão
// 2 que ainda esteja na fila offline de um tablet é recusado no decodificador,
// que é o comportamento certo: a carteira que ele aponta não existe mais.
export const PASSE_VERSAO = 3;

export type PassePayload = {
  /** Versão do formato. */
  v: number;
  /** Id do perfil do cliente. */
  a: string;
  /** Nonce de uso único. */
  n: string;
  /** Expiração, em segundos desde a época. */
  e: number;
  /** HMAC de `a|n|e`. */
  s: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Base64 seguro para URL e para QR: sem `+`, `/` nem `=`. */
const paraBase64Url = (texto: string) => btoa(texto).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const deBase64Url = (texto: string) => {
  const normalizado = texto.replace(/-/g, "+").replace(/_/g, "/");
  const resto = normalizado.length % 4;
  return atob(resto ? normalizado + "=".repeat(4 - resto) : normalizado);
};

/** O texto que o QR carrega. */
export const codificarPasse = (p: PassePayload) => paraBase64Url(JSON.stringify(p));

/** Inverso defensivo: qualquer coisa malformada vira undefined, nunca exceção. */
export const decodificarPasse = (texto: string): PassePayload | undefined => {
  try {
    const cru = JSON.parse(deBase64Url(texto.trim()));
    if (cru?.v !== PASSE_VERSAO) return undefined;
    if (typeof cru.a !== "string" || !UUID.test(cru.a)) return undefined;
    if (typeof cru.n !== "string" || cru.n.length < 8) return undefined;
    if (typeof cru.e !== "number" || !Number.isFinite(cru.e)) return undefined;
    if (typeof cru.s !== "string" || cru.s.length < 16) return undefined;
    return { v: cru.v, a: cru.a, n: cru.n, e: cru.e, s: cru.s };
  } catch {
    return undefined;
  }
};

/** Se o passe já venceu, sem precisar ir ao servidor. */
export const passeVencido = (p: PassePayload, agoraSegundos = Math.floor(Date.now() / 1000)) => p.e <= agoraSegundos;

/** Quantos segundos faltam — o que a tela do cliente mostra no contador. */
export const segundosRestantes = (p: PassePayload, agoraSegundos = Math.floor(Date.now() / 1000)) =>
  Math.max(0, p.e - agoraSegundos);

/**
 * Código de seis dígitos para quando a câmera do caixa não coopera.
 * Também de uso único, mas com validade maior: digitar na mão leva mais tempo
 * que apontar a câmera.
 */
export const CODIGO_CURTO_VALIDADE_SEGUNDOS = 300;

export const codigoCurtoValido = (codigo: string) => /^\d{6}$/.test(codigo.trim());
