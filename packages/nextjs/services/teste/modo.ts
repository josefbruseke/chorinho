import "server-only";

/**
 * O modo de teste: entrar no balcão de qualquer loja sem pareamento.
 *
 * Existe para quem está construindo conseguir abrir o PDV de uma loja qualquer
 * e percorrer o fluxo — criar selo, ler o passe, ver o NFT cair — sem precisar
 * de um código de pareamento por loja e de uma conta por lojista.
 *
 * TRÊS CUIDADOS, e nenhum é decorativo:
 *
 * 1. A variável NÃO leva prefixo `NEXT_PUBLIC_`. Se levasse, iria no pacote do
 *    navegador e qualquer pessoa saberia que o atalho existe — e em alguns
 *    arranjos conseguiria ligá-lo.
 * 2. Falha fechada. Qualquer valor diferente de "1" deixa tudo como sempre foi.
 * 3. NÃO deve ficar ligada no endereço que você divulga. Com ela, quem abrir o
 *    site emite carimbo em nome de qualquer loja — e carimbo é dinheiro. O
 *    lugar dela é um deploy de prévia ou a máquina de quem programa.
 *
 * Note que ela não inventa uma porta nova: o que faz é criar um terminal de
 * verdade e entregar o mesmo cookie que o pareamento entrega. Toda a checagem
 * de loja ativa, assinatura e regra continua valendo, porque o caminho depois
 * daqui é exatamente o mesmo do balcão real.
 */
export const modoDeTesteLigado = () => process.env.CHORINHO_MODO_TESTE === "1";

/** O cookie que guarda a loja escolhida em `/teste`. */
export const COOKIE_DA_LOJA_DE_TESTE = "chorinho_loja_teste";

/**
 * A loja que o painel deve mostrar, quando o modo de teste está ligado.
 *
 * Devolve `undefined` com o modo desligado — e a checagem vem ANTES de ler o
 * cookie de propósito: um cookie esquecido no navegador não pode mudar nada
 * depois que o modo for desligado.
 *
 * O formato é conferido aqui e não só em quem grava: este valor vira filtro de
 * consulta, e aceitar qualquer texto seria confiar no navegador para montar
 * uma query.
 */
export const lojaEscolhidaParaTeste = async () => {
  if (!modoDeTesteLigado()) return undefined;
  const { cookies } = await import("next/headers");
  const valor = (await cookies()).get(COOKIE_DA_LOJA_DE_TESTE)?.value;
  return valor && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor) ? valor : undefined;
};
