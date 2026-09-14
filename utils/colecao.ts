import { formatarCentavos } from "~~/utils/dinheiro";

/**
 * A camada de peças dita em português.
 *
 * Na cadeia tudo é número: `kind` 0 ou 1, `baseBenefit` em pontos-base ou
 * centavos, `criterion` de 0 a 4. Nenhuma dessas telas é para quem escreve
 * contrato — é para o dono da padaria e para quem toma café nela. Traduzir num
 * lugar só evita que "10%" vire "1000" em alguma delas.
 */

export type TipoDePrograma = "percentual" | "valor";

/** O desconto de uma peça: base × nível, com o teto do programa aparecendo. */
export const beneficioEmTexto = (tipo: TipoDePrograma, beneficioBase: number, nivel: number, tetoCentavos: number) => {
  if (tipo === "valor") return formatarCentavos(beneficioBase * nivel);

  const percentual = (beneficioBase * nivel) / 100;
  const texto = `${Number.isInteger(percentual) ? percentual : percentual.toFixed(2).replace(".", ",")}%`;
  return tetoCentavos > 0 ? `${texto} até ${formatarCentavos(tetoCentavos)}` : texto;
};

/** Espelha `Achievements.Criterion`. A ordem é a do enum — não reordene. */
export const CRITERIOS = [
  {
    valor: 0,
    rotulo: "Carimbos acumulados",
    ajuda: "quem juntar este tanto de carimbos na sua loja, somando tudo o que já veio",
    unidade: "carimbos",
  },
  {
    valor: 1,
    rotulo: "Sequência de visitas",
    ajuda: "quem mantiver esta sequência sem deixar a cartela esfriar",
    unidade: "visitas seguidas",
  },
  {
    valor: 2,
    rotulo: "Número de visitas",
    ajuda: "quem voltar este tanto de vezes",
    unidade: "visitas",
  },
  {
    valor: 3,
    rotulo: "Total gasto",
    ajuda: "quem já tiver gasto este valor na sua loja, somando tudo",
    unidade: "centavos",
  },
  {
    valor: 4,
    rotulo: "Uma compra específica",
    // Vale o aviso na tela: é o único critério que a cadeia não confere
    // sozinha, e o lojista merece saber onde está confiando em quem.
    ajuda: "quem fizer uma compra deste valor — atestado pelo nosso servidor, não pela cadeia",
    unidade: "centavos",
  },
] as const;

export const criterioEmTexto = (criterio: number, alvo: number) => {
  switch (criterio) {
    case 0:
      return `${alvo} ${alvo === 1 ? "carimbo" : "carimbos"} acumulados`;
    case 1:
      return `${alvo} ${alvo === 1 ? "visita seguida" : "visitas seguidas"}`;
    case 2:
      return `${alvo} ${alvo === 1 ? "visita" : "visitas"}`;
    case 3:
      return `${formatarCentavos(alvo)} gastos na loja`;
    case 4:
      return `uma compra de ${formatarCentavos(alvo)}`;
    default:
      return `${alvo}`;
  }
};

/** O critério pede dinheiro? Muda o teclado e o rótulo do campo. */
export const criterioEmDinheiro = (criterio: number) => criterio === 3 || criterio === 4;

/** "restam 12 de 50", ou "sem limite" quando a tiragem é aberta. */
export const tiragemEmTexto = (tiragem: number, emCirculacao: number) =>
  tiragem === 0 ? `${emCirculacao} em circulação` : `restam ${Math.max(0, tiragem - emCirculacao)} de ${tiragem}`;

export const dataCurta = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : undefined;
