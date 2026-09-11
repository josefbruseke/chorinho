"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy, useSubscribeToJwtAuthWithFlag, useWallets } from "@privy-io/react-auth";
import { supabaseBrowser } from "~~/services/database/browser";

/**
 * Liga a sessão da Supabase à carteira do Privy, sem pedir nada ao usuário.
 *
 * O Privy aceita o JWT de outro provedor de autenticação — e a Supabase já
 * publica JWKS com chave assimétrica, que é o que ele valida. Então o login
 * continua sendo um só: quem entra com e-mail ou Google sai com endereço.
 *
 * Quando a carteira aparece, o endereço é gravado em `profiles.wallet_address`
 * por rota de servidor. O navegador nunca escreve no banco direto.
 */
export const PonteSupabasePrivy = () => {
  const [autenticado, setAutenticado] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const { ready, user } = usePrivy();
  const { wallets } = useWallets();

  // Acompanha a sessão da Supabase: entrar e sair precisam refletir no Privy.
  useEffect(() => {
    const supabase = supabaseBrowser();
    let vivo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setAutenticado(Boolean(data.session));
      setCarregando(false);
    });

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      setAutenticado(Boolean(sessao));
      setCarregando(false);
    });

    return () => {
      vivo = false;
      inscricao.subscription.unsubscribe();
    };
  }, []);

  const pegarJwt = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getSession();
    return data.session?.access_token;
  }, []);

  useSubscribeToJwtAuthWithFlag({
    isAuthenticated: autenticado,
    isLoading: carregando,
    getExternalJwt: pegarJwt,
  });

  // Assim que a carteira existe, guarda o endereço no perfil.
  const endereco = wallets[0]?.address;
  useEffect(() => {
    if (!ready || !user || !endereco || !autenticado) return;

    fetch("/api/carteira/vincular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endereco }),
    }).catch(() => {
      // Falhar aqui não pode atrapalhar a navegação: a próxima carga tenta de
      // novo, e o endereço é sempre o mesmo.
    });
  }, [ready, user, endereco, autenticado]);

  return null;
};
