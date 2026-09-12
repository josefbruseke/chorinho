"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLogout, usePrivy, useSubscribeToJwtAuthWithFlag, useWallets } from "@privy-io/react-auth";
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
  const [usuario, setUsuario] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const { ready, user } = usePrivy();
  const { logout } = useLogout();
  const { wallets } = useWallets();

  // `logout` troca de identidade a cada render do Privy. Guardar numa ref deixa
  // o efeito abaixo com dependência vazia: reinscrever no `onAuthStateChange` a
  // cada render perderia eventos na janela entre desinscrever e inscrever.
  const sairDoPrivy = useRef(logout);
  useEffect(() => {
    sairDoPrivy.current = logout;
  }, [logout]);

  // Acompanha a sessão da Supabase: entrar e sair precisam refletir no Privy.
  useEffect(() => {
    const supabase = supabaseBrowser();
    let vivo = true;
    // `undefined` = ainda não sabemos; `null` = sabemos que não há ninguém.
    let anterior: string | null | undefined = undefined;

    const aplicar = async (id: string | null) => {
      if (!vivo) return;

      // Trocou de pessoa no mesmo navegador — ou saiu — com a sessão do Privy
      // do anterior ainda viva. Sem encerrá-la aqui, o Privy entende o JWT novo
      // como pedido de VINCULAR a nova identidade à conta antiga e recusa
      // ("Linking not allowed for custom JWT accounts"). Enquanto ele não
      // desiste, `wallets[0]` ainda é a carteira de quem saiu, e a ponte abaixo
      // tentaria gravá-la no perfil de quem entrou. O índice único de
      // `wallet_address` barra a troca, mas o segundo usuário fica sem carteira
      // até a poeira baixar.
      if (anterior !== undefined && anterior !== null && anterior !== id) {
        await sairDoPrivy.current().catch(() => {
          // Falhar aqui não pode travar a entrada: o pior caso volta a ser o
          // comportamento antigo, que se resolve sozinho na próxima carga.
        });
        if (!vivo) return;
      }

      anterior = id;
      setUsuario(id);
      setCarregando(false);
    };

    supabase.auth.getSession().then(({ data }) => aplicar(data.session?.user.id ?? null));

    const { data: inscricao } = supabase.auth.onAuthStateChange((_evento, sessao) => aplicar(sessao?.user.id ?? null));

    return () => {
      vivo = false;
      inscricao.subscription.unsubscribe();
    };
  }, []);

  const autenticado = usuario !== null;

  const pegarJwt = useCallback(async () => {
    const { data } = await supabaseBrowser().auth.getSession();
    return data.session?.access_token;
  }, []);

  useSubscribeToJwtAuthWithFlag({
    isAuthenticated: autenticado,
    isLoading: carregando,
    getExternalJwt: pegarJwt,
  });

  // Assim que a carteira existe, guarda o endereço no perfil. `usuario` entra
  // nas dependências de propósito: trocar de conta precisa reenviar, e o efeito
  // não pode reaproveitar o endereço da sessão anterior.
  const endereco = wallets[0]?.address;
  useEffect(() => {
    if (!ready || !user || !endereco || !autenticado || carregando) return;

    fetch("/api/carteira/vincular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endereco }),
    }).catch(() => {
      // Falhar aqui não pode atrapalhar a navegação: a próxima carga tenta de
      // novo, e o endereço é sempre o mesmo.
    });
  }, [ready, user, endereco, autenticado, carregando, usuario]);

  return null;
};
