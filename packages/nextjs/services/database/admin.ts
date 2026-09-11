import type { Database } from "./types";
import { createClient } from "@supabase/supabase-js";
import "server-only";

/**
 * Cliente com a chave secreta, que ignora RLS.
 *
 * Existe para as escritas que a plataforma faz em nome do sistema — emitir
 * passe, registrar venda, espelhar assinatura. Nunca para servir dado ao
 * usuário: ali a RLS é a proteção, e passar por cima dela aqui anularia todo o
 * modelo de acesso.
 *
 * `server-only` garante que isto jamais entre num bundle de navegador.
 */
let cliente: ReturnType<typeof createClient<Database>> | undefined;

export const supabaseAdmin = () => {
  if (!cliente) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const chave = process.env.SUPABASE_SECRET_KEY;

    if (!url || !chave) {
      throw new Error("SUPABASE_SECRET_KEY ausente: as rotas de servidor não conseguem gravar.");
    }

    cliente = createClient<Database>(url, chave, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cliente;
};
