/**
 * Os números do balcão que o aparelho e o servidor precisam concordar.
 *
 * Mora fora de `services/pdv/emitir.ts` porque aquele módulo é `server-only`: a
 * fila do tablet precisa saber o tamanho do lote para fatiar o envio, e ela roda
 * no navegador.
 */

/**
 * Quantas vendas cabem numa requisição.
 *
 * Eram 25, escolhidas quando o alvo era o anvil e o único limite era o gás do
 * bloco. Na Sepolia o limite que aperta primeiro é outro: o teto de tempo da
 * função. Um lote de 25 que reverte vira 25 envios em série, e cada um espera um
 * bloco de ~12 segundos — cinco minutos, num lugar onde temos sessenta segundos.
 *
 * Oito é o que cabe na retentativa individual dentro do orçamento, ainda diluindo
 * o gás entre várias vendas. Fila maior sobe em levas.
 */
export const MAX_POR_LOTE = 8;
