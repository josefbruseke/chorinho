import "server-only";
import { parseEther, toHex } from "viem";
import { clientePublico } from "~~/services/relayer/servidor";

/**
 * A torneira do ambiente de teste.
 *
 * Dá ETH de mentira a qualquer endereço, na hora, sem torneira pública e sem
 * esperar nada. Serve para abrir a MetaMask e cutucar os contratos direto, ou
 * para quem estiver testando não esbarrar em "saldo insuficiente" no meio de
 * uma demonstração.
 *
 * **O aplicativo não precisa disto.** Nenhuma tela do cliente, do lojista ou
 * do balcão pede assinatura de carteira: quem paga o gás de tudo é o relayer
 * da plataforma. Uma carteira recém-criada com zero ETH carimba, resgata
 * prêmio, recebe peça e reivindica conquista sem nunca ter um centavo. Isto
 * aqui é conforto de teste, não requisito.
 *
 * **Só funciona em cadeia que deixa.** `anvil_setBalance` é um método de nó de
 * desenvolvimento; numa rede pública de verdade ele simplesmente não existe, e
 * nem poderia — ninguém cunha ETH da Sepolia. Lá isto vira um silêncio, de
 * propósito: a falha nunca derruba o cadastro de ninguém.
 *
 * Desligada por padrão. `CHORINHO_TORNEIRA_ETH=1000` liga, e o número é quanto
 * cada endereço recebe. Estar atrás de uma variável, e não de uma checagem de
 * chain id, é o que impede alguém de descobrir tarde demais que a torneira
 * ficou aberta em produção.
 */

const quantoDar = () => {
  const bruto = process.env.CHORINHO_TORNEIRA_ETH;
  if (!bruto) return undefined;
  const valor = Number(bruto);
  return Number.isFinite(valor) && valor > 0 ? valor : undefined;
};

export const torneiraLigada = () => quantoDar() !== undefined;

/**
 * Deixa o endereço com o saldo configurado.
 *
 * `setBalance` e não "transferir": é uma atribuição, então rodar duas vezes não
 * acumula e não gasta de ninguém. Também não precisa de conta de origem com
 * saldo, o que seria mais uma coisa para manter abastecida.
 *
 * Devolve quanto ficou, ou `undefined` quando a cadeia não deixa — e a rota que
 * chamou segue a vida em qualquer um dos dois casos.
 */
export const abastecerParaTestes = async (endereco: string) => {
  const eth = quantoDar();
  if (!eth) return undefined;

  const saldo = toHex(parseEther(String(eth)));
  const publico = clientePublico();

  // `anvil_setBalance` no anvil, `hardhat_setBalance` no nó do Hardhat. Os dois
  // nomes existem porque os dois projetos chegaram ao mesmo método por caminhos
  // separados; tentar os dois custa uma chamada que falha rápido.
  for (const method of ["anvil_setBalance", "hardhat_setBalance"] as const) {
    try {
      await publico.request({ method, params: [endereco as `0x${string}`, saldo] } as never);
      return eth;
    } catch {
      // Próximo método, ou desiste. Ver a nota no topo: rede pública não tem
      // nenhum dos dois, e isso não é erro.
    }
  }

  return undefined;
};
