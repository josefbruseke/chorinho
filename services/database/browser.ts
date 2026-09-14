"use client";

import type { Database } from "./types";
import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente do navegador. Usa a chave publishable, que é feita para ser pública:
 * ela só alcança o que a RLS permitir.
 *
 * Este cliente é somente leitura e Realtime por opção de arquitetura. Toda
 * escrita passa por Route Handler no servidor, que valida papel antes de
 * gravar — isso elimina uma classe inteira de erro de política.
 *
 * Sem opção `cookies`: a documentação diz explicitamente para não configurar,
 * porque o pacote já cuida disso. O aviso de depreciação do ESLint é falso
 * positivo — `createBrowserClient` tem duas sobrecargas e só a que recebe
 * `get`/`set`/`remove` está depreciada, mas a regra resolve para a última.
 * https://supabase.com/docs/guides/auth/server-side/creating-a-client
 */
// eslint-disable-next-line @typescript-eslint/no-deprecated -- sobrecarga errada; ver comentário acima
let cliente: ReturnType<typeof createBrowserClient<Database>> | undefined;

export const supabaseBrowser = () => {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !chave) {
      throw new Error(
        "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em packages/nextjs/.env.local",
      );
    }

    cliente = createBrowserClient<Database>(url, chave);
  }
  return cliente;
};

/** true quando dá para conversar com a Supabase — usado para degradar a UI. */
export const supabaseConfigurado = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
