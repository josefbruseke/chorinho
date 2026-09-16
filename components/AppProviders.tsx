"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";

/**
 * Só providers: o chrome (cabeçalho, rodapé, barra de abas) vive no layout de
 * cada route group, porque cada flavor tem navegação própria — o PDV não tem
 * cabeçalho nenhum, o cliente usa barra inferior, o site usa a de topo.
 *
 * O tema não passa por aqui. Quem aplica `data-theme` é o `ThemeProvider` no
 * layout raiz e o `FlavorTheme` dentro de cada flavor.
 */
export const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <>
    <ProgressBar height="3px" color="var(--color-primary)" />
    {children}
    <Toaster />
  </>
);
