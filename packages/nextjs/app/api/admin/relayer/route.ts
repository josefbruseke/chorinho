import { NextResponse } from "next/server";
import { formatEther, parseEther } from "viem";
import deployedContracts from "~~/contracts/deployedContracts";
import { ErroDeAdmin, exigirAdmin } from "~~/services/admin/acesso";
import { supabaseAdmin } from "~~/services/database/admin";
import { supabaseServer } from "~~/services/database/server";
import { clientePublico, enderecoDoRelayer, relayerConfigurado } from "~~/services/relayer/servidor";

export const runtime = "nodejs";

/** Abaixo disto o balcão para de carimbar — é o piso que a tela alerta em vermelho. */
const SALDO_MINIMO = parseEther("0.05");

/** Venda parada em "enviada" por mais tempo que isto é envio que morreu no meio. */
const MINUTOS_DE_PACIENCIA = 10;

/**
 * A saúde da conta que paga o gás de toda a rede.
 *
 * Os números do Supabase (vendas travadas, vendas com falha) não dependem do
 * RPC e por isso saem sempre; o resto da tela — saldo, endereço, contratos —
 * é o que degrada quando a rede está fora do ar ou o relayer não está
 * configurado neste ambiente.
 */
export async function GET() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();

  try {
    await exigirAdmin(claims?.claims?.sub);
  } catch (e) {
    if (e instanceof ErroDeAdmin) return NextResponse.json({ erro: e.message }, { status: e.status });
    throw e;
  }

  const admin = supabaseAdmin();
  const limiteDePaciencia = new Date(Date.now() - MINUTOS_DE_PACIENCIA * 60 * 1000).toISOString();
  const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [travadas, falhas24h] = await Promise.all([
    admin
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("status", "enviada")
      .lt("created_at", limiteDePaciencia),
    admin.from("sales").select("id", { count: "exact", head: true }).eq("status", "falhou").gte("created_at", desde24h),
  ]);

  const base = { vendasTravadas: travadas.count ?? 0, vendasFalhas24h: falhas24h.count ?? 0 };

  if (!relayerConfigurado()) {
    return NextResponse.json({ ...base, redeConfigurada: false, redeIndisponivel: false });
  }

  try {
    const publico = clientePublico();
    const endereco = enderecoDoRelayer();
    const saldo = await publico.getBalance({ address: endereco });
    const chainId = publico.chain.id;

    const contratosDaRede = (deployedContracts as Record<number, Record<string, { address: string }>>)[chainId] ?? {};
    const contratos = Object.entries(contratosDaRede).map(([nome, info]) => ({ nome, endereco: info.address }));

    return NextResponse.json({
      ...base,
      redeConfigurada: true,
      redeIndisponivel: false,
      endereco,
      chainId,
      rede: publico.chain.name,
      saldoEth: formatEther(saldo),
      saldoBaixo: saldo < SALDO_MINIMO,
      contratos,
    });
  } catch {
    // RPC fora do ar: a tela ainda mostra o que veio do Supabase, só sem os
    // dados de cadeia.
    return NextResponse.json({ ...base, redeConfigurada: true, redeIndisponivel: true });
  }
}
