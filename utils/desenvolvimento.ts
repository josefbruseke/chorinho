/**
 * Se as ferramentas de desenvolvimento podem aparecer na tela.
 *
 * Torneira de ETH, link do explorador de blocos e "Debug Contracts" são úteis
 * enquanto se constrói e constrangedores num site publicado — pior ainda
 * porque a torneira tenta falar com `127.0.0.1:8545`, o anvil da máquina de
 * quem programou, e o visitante vê erro de rede no console.
 *
 * A checagem é só do ambiente de build, de propósito: amarrar isso à rede alvo
 * faz um deploy apontado para o anvil por engano publicar a torneira para o
 * mundo.
 */
export const emDesenvolvimento = () => process.env.NODE_ENV === "development";
