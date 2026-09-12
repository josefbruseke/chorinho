import type { Flavor } from "~~/components/FlavorTheme";

/**
 * Por onde se entra em cada flavor.
 *
 * A porta do aplicativo do cliente estava escrita à mão em oito lugares — o
 * retorno do login, a tela de entrar, o cabeçalho do site, três chamadas para
 * ação, o voltar de uma loja e a carteira vazia. Mudar qual é a tela inicial
 * significava caçar todas, e a que ficasse para trás só apareceria quando
 * alguém reclamasse de ter caído no lugar errado.
 */
export const INICIO: Record<Flavor, string> = {
  cliente: "/explorar",
  merchant: "/painel",
  pos: "/pdv",
  admin: "/admin",
};

/** A tela inicial do cliente: a grade de lugares. O mapa fica a um toque dela. */
export const INICIO_DO_APP = INICIO.cliente;
