import { type NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "~~/services/database/server";
import { abastecerParaTestes } from "~~/services/relayer/torneira";

const ENDERECO_EVM = /^0x[0-9a-fA-F]{40}$/;

/**
 * Grava o endereço da carteira embutida no perfil de quem está logado.
 *
 * Passa pelo servidor de propósito: o navegador só lê do banco, nunca escreve.
 * E o `profile_id` sai da sessão, nunca do corpo da requisição — senão qualquer
 * um apontaria a carteira de outra pessoa para si.
 */
export async function POST(request: NextRequest) {
  const supabase = await supabaseServer();

  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) {
    return NextResponse.json({ erro: "sem sessão" }, { status: 401 });
  }

  let endereco: unknown;
  try {
    ({ endereco } = await request.json());
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (typeof endereco !== "string" || !ENDERECO_EVM.test(endereco)) {
    return NextResponse.json({ erro: "endereço inválido" }, { status: 400 });
  }

  // Minúsculo: a coluna tem check de formato e unique, e checksum variando
  // criaria duas linhas para a mesma carteira.
  const { error } = await supabase.from("profiles").update({ wallet_address: endereco.toLowerCase() }).eq("id", userId);

  if (error) {
    // 23505 = unique_violation: a carteira já pertence a outro perfil.
    const status = error.code === "23505" ? 409 : 500;
    return NextResponse.json({ erro: error.message }, { status });
  }

  // Ambiente de teste: a carteira nasce com saldo. Nenhuma tela precisa disso
  // — o relayer paga o gás de tudo —, mas quem for cutucar os contratos pela
  // MetaMask não deveria esbarrar numa torneira pública antes. Em rede pública
  // esta chamada não faz nada e ninguém percebe.
  const abastecida = await abastecerParaTestes(endereco.toLowerCase());

  return NextResponse.json({ ok: true, ...(abastecida ? { saldoDeTeste: abastecida } : {}) });
}
