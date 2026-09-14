import { SerwistProvider } from "@serwist/next/react";
import { AppProviders } from "~~/components/AppProviders";
import { DesligaServiceWorkerEmDev } from "~~/components/DesligaServiceWorkerEmDev";
import { ThemeProvider } from "~~/components/ThemeProvider";
import "~~/styles/globals.css";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Chorinho | Fidelidade & Recompensas no Comércio Local",
  description: "O programa de fidelidade do comércio de bairro: mostrou o passe no balcão, ganhou carimbo.",
});

const RaizDoChorinho = ({ children }: { children: React.ReactNode }) => {
  return (
    <html suppressHydrationWarning className="font-sans antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* O service worker e o que deixa o balcao abrir sem internet. Fica
            desligado em desenvolvimento: cache de rota antiga em dev vira
            "por que minha mudanca nao aparece?". */}
        {process.env.NODE_ENV === "development" && <DesligaServiceWorkerEmDev />}
        <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV === "development"}>
          {/* attribute="data-theme": o daisyUI aplica tema por [data-theme], nao
              por classe. Sem isso o next-themes escrevia class="dark" e o seletor
              de tema nao mudava cor nenhuma -- o escuro so aparecia se o sistema
              operacional estivesse escuro. */}
          <ThemeProvider attribute="data-theme" enableSystem>
            <AppProviders>{children}</AppProviders>
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
};

export default RaizDoChorinho;
