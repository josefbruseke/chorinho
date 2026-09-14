import { cookies } from "next/headers";
import type { Database } from "./types";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente de servidor, ligado aos cookies da requisição — é ele que enxerga a
 * sessão do usuário em Server Components e Route Handlers.
 *
 * Continua sujeito à RLS: para escrever como plataforma (aprovar loja, gravar
 * venda), o Route Handler usa um cliente de service_role separado, que nunca
 * deve ser criado neste arquivo para não vazar por import descuidado.
 */
export const supabaseServer = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !chave) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em packages/nextjs/.env.local",
    );
  }

  const jar = await cookies();

  return createServerClient<Database>(url, chave, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: paraGravar => {
        try {
          paraGravar.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Component não pode gravar cookie. O middleware renova a
          // sessão, então ignorar aqui é o comportamento correto.
        }
      },
    },
  });
};
