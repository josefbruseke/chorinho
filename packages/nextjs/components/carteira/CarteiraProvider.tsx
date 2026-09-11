"use client";

import { PonteSupabasePrivy } from "./PonteSupabasePrivy";
import { PrivyProvider } from "@privy-io/react-auth";

const APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

/**
 * A carteira do cliente, invisível.
 *
 * O login continua sendo o da Supabase — e-mail ou Google. O Privy não pede
 * nada ao usuário: ele recebe o JWT que a Supabase já emite e cria a carteira
 * embutida sozinho, sem seed phrase, sem extensão, sem tela a mais.
 *
 * `createOnLogin: "all-users"` garante que todo mundo sai do cadastro com
 * endereço. `showWalletUIs: false` esconde a interface do provedor: quem usa o
 * Chorinho nunca deve ver a palavra "carteira" onde não precisa.
 *
 * Sem `NEXT_PUBLIC_PRIVY_APP_ID` o provider some do caminho em vez de quebrar
 * a aplicação — o resto do app funciona sem carteira, só não credita carimbo.
 */
export const CarteiraProvider = ({ children }: { children: React.ReactNode }) => {
  if (!APP_ID) return <>{children}</>;

  return (
    <PrivyProvider
      appId={APP_ID}
      config={{
        embeddedWallets: {
          // Na v3 o createOnLogin mora sob a rede. A doc publica ainda mostra a
          // forma antiga, plana -- os tipos da versao instalada e que mandam.
          ethereum: { createOnLogin: "all-users" },
          showWalletUIs: false,
        },
      }}
    >
      <PonteSupabasePrivy />
      {children}
    </PrivyProvider>
  );
};

/** true quando dá para criar carteira — usado para degradar a interface. */
export const carteiraConfigurada = () => Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
