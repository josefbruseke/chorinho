import "server-only";
import { supabaseAdmin } from "~~/services/database/admin";

/**
 * A autorização do back office da plataforma.
 *
 * Separada da autorização do lojista de propósito: aqui se aprova loja, se
 * concede papel na cadeia e se mexe em tipo de ponto. Confundir as duas seria
 * dar ao dono de uma padaria a chave do sistema inteiro.
 *
 * A lista de admins vive na tabela `platform_admins`, que não tem política de
 * escrita nenhuma — entra no banco por migração ou pelo painel da Supabase, à
 * mão. É pouca gente e deve continuar sendo.
 */
export class ErroDeAdmin extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export const exigirAdmin = async (userId: string | undefined) => {
  if (!userId) throw new ErroDeAdmin(401, "sem sessão");

  const { data } = await supabaseAdmin()
    .from("platform_admins")
    .select("profile_id")
    .eq("profile_id", userId)
    .maybeSingle();

  if (!data) throw new ErroDeAdmin(403, "esta conta não é da equipe da plataforma");
  return userId;
};
