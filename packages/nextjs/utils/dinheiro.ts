/**
 * Dinheiro, no balcão, em centavos inteiros.
 *
 * Nada de `number` em reais: 0,1 + 0,2 não dá 0,3 em ponto flutuante, e a
 * primeira vez que isso aparecer vai ser num recibo, na frente do cliente. O
 * contrato também raciocina em centavos — usar a mesma unidade de ponta a
 * ponta elimina a conversão que mais tarde alguém esqueceria de fazer.
 */

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatarCentavos = (centavos: number) => brl.format(centavos / 100);

/** O que o teclado do PDV monta: dígitos crus viram centavos. */
export const digitosParaCentavos = (digitos: string) => Number(digitos.replace(/\D/g, "").slice(0, 9)) || 0;

/** `1250` → `"12,50"`, para o visor do teclado, sem o símbolo da moeda. */
export const centavosParaVisor = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
