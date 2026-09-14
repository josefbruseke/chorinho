"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProgressBar as ProgressBar } from "next-nprogress-bar";
import { Toaster } from "react-hot-toast";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Só providers: o chrome (cabeçalho, rodapé, barra de abas) vive no layout de
 * cada route group, porque cada flavor tem navegação própria — o PDV não tem
 * cabeçalho nenhum, o cliente usa barra inferior, o site usa a de topo.
 *
 * O tema não passa por aqui. Quem aplica `data-theme` é o `ThemeProvider` no
 * layout raiz e o `FlavorTheme` dentro de cada flavor; este arquivo só existia
 * como cliente do `resolvedTheme` para pintar o RainbowKit, que não existe mais.
 */
export const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ProgressBar height="3px" color="var(--color-primary)" />
    {children}
    <Toaster />
  </QueryClientProvider>
);
