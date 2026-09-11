import "server-only";
import { supabaseAdmin } from "~~/services/database/admin";

/**
 * A loja que esta conta administra.
 *
 * Separado do acesso do balcão de propósito: operador carimba, gestor
 * configura. Quem opera o caixa não deve conseguir criar terminal nem mexer na
 * regra de acúmulo — é o mesmo raciocínio que separa caixa de gerente em
 * qualquer comércio.
 */
export class ErroDeGestao extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export type LojaGerida = { id: string; nome: string; onchainId: number | null; limiteDePdv: number; papel: string };

export const lojaDoGestor = async (userId: string): Promise<LojaGerida> => {
  const admin = supabaseAdmin();

  const { data: vinculo } = await admin
    .from("establishment_members")
    .select("establishment_id, role")
    .eq("profile_id", userId)
    .eq("active", true)
    .in("role", ["owner", "manager"])
    .limit(1)
    .maybeSingle();

  if (!vinculo) throw new ErroDeGestao(403, "esta conta não administra nenhuma loja");

  const { data: loja } = await admin
    .from("establishments")
    .select("id, name, onchain_id, pos_limit")
    .eq("id", vinculo.establishment_id)
    .maybeSingle();

  if (!loja) throw new ErroDeGestao(404, "loja não encontrada");

  return {
    id: loja.id,
    nome: loja.name,
    onchainId: loja.onchain_id,
    limiteDePdv: loja.pos_limit,
    papel: vinculo.role,
  };
};
