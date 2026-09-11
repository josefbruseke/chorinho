"use client";

import { useEffect, useState } from "react";
import { Address } from "@scaffold-ui/components";
import { base, baseSepolia, foundry, sepolia } from "viem/chains";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

/** Espelha `REDES` de `services/relayer/servidor.ts` — não é importável do servidor para o cliente. */
const REDES = {
  [foundry.id]: foundry,
  [sepolia.id]: sepolia,
  [baseSepolia.id]: baseSepolia,
  [base.id]: base,
} as const;

type Saude = {
  vendasTravadas: number;
  vendasFalhas24h: number;
  redeConfigurada: boolean;
  redeIndisponivel: boolean;
  endereco?: `0x${string}`;
  chainId?: number;
  rede?: string;
  saldoEth?: string;
  saldoBaixo?: boolean;
  contratos?: { nome: string; endereco: string }[];
};

/**
 * A saúde da conta que paga o gás de toda a rede. Sem ela nenhum carimbo sai
 * do balcão — por isso o saldo baixo é a única coisa nesta tela que aparece
 * em vermelho antes de qualquer outra informação.
 */
/**
 * Quatro casas bastam para a pergunta que esta tela responde.
 *
 * `formatEther` devolve os dezoito dígitos inteiros, e "9999.988756814960796216"
 * não é um número que alguém lê — é um número que alguém ignora.
 */
const emEth = (valor?: string) =>
  valor === undefined ? "—" : Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 4 });

export const SaudeDoRelayer = () => {
  const [dados, setDados] = useState<Saude>();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    void (async () => {
      const r = await fetch("/api/admin/relayer");
      if (!r.ok) {
        const corpo = await r.json().catch(() => ({}));
        setErro(corpo?.erro ?? "não foi possível carregar a saúde do relayer");
        return;
      }
      setDados(await r.json());
    })();
  }, []);

  if (erro) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }

  if (!dados) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const chain = dados.chainId ? REDES[dados.chainId as keyof typeof REDES] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Saúde do relayer</h1>
        <p className="m-0 mt-1 text-sm opacity-75">A conta que paga o gás de todo carimbo emitido no balcão.</p>
      </header>

      {!dados.redeConfigurada && (
        <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">
          Relayer não configurado nesta rede — defina RELAYER_PRIVATE_KEY para o balcão conseguir emitir carimbos.
        </p>
      )}

      {dados.redeConfigurada && dados.redeIndisponivel && (
        <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">
          Não foi possível consultar a rede agora — os dados de saldo e contratos abaixo ficam indisponíveis até o RPC
          voltar.
        </p>
      )}

      {dados.saldoBaixo && (
        <p className="m-0 inline-flex items-start gap-2 rounded-2xl border border-error bg-error/10 p-4 text-sm font-bold text-error">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          Saldo do relayer abaixo de 0,05 ETH — o balcão para de carimbar quando isto zerar.
        </p>
      )}

      {dados.redeConfigurada && !dados.redeIndisponivel && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div
              className={`rounded-2xl border p-4 ${dados.saldoBaixo ? "border-error bg-error/10" : "border-primary bg-primary/5"}`}
            >
              <span className="block text-xs font-bold uppercase tracking-wide opacity-70">Saldo do relayer</span>
              <span
                className={`mt-1 block font-mono text-2xl font-black leading-none ${dados.saldoBaixo ? "text-error" : "text-secondary"}`}
              >
                {emEth(dados.saldoEth)} ETH
              </span>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <span className="block text-xs font-bold uppercase tracking-wide opacity-70">Rede</span>
              <span className="mt-1 block font-mono text-2xl font-black leading-none text-secondary">{dados.rede}</span>
              <span className="text-xs opacity-70">chain id {dados.chainId}</span>
            </div>
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <span className="block text-xs font-bold uppercase tracking-wide opacity-70">Endereço do relayer</span>
              <div className="mt-1">
                {dados.endereco && <Address address={dados.endereco} chain={chain} format="short" />}
              </div>
            </div>
          </section>

          {dados.contratos && dados.contratos.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="m-0 font-serif text-lg font-black text-secondary">Contratos implantados</h2>
              <div className="overflow-x-auto rounded-2xl border border-base-300">
                <table className="table table-sm m-0 bg-base-100">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide">
                      <th>Contrato</th>
                      <th>Endereço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.contratos.map(c => (
                      <tr key={c.nome}>
                        <td className="font-bold">{c.nome}</td>
                        <td>
                          <Address address={c.endereco as `0x${string}`} chain={chain} format="short" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div
          className={`rounded-2xl border p-4 ${dados.vendasTravadas > 0 ? "border-warning bg-warning/10" : "border-base-300 bg-base-100"}`}
        >
          <span className="block text-xs font-bold uppercase tracking-wide opacity-70">Envios travados (10+ min)</span>
          <span className="mt-1 block font-mono text-2xl font-black leading-none text-secondary">
            {dados.vendasTravadas}
          </span>
        </div>
        <div
          className={`rounded-2xl border p-4 ${dados.vendasFalhas24h > 0 ? "border-warning bg-warning/10" : "border-base-300 bg-base-100"}`}
        >
          <span className="block text-xs font-bold uppercase tracking-wide opacity-70">Falhas nas últimas 24h</span>
          <span className="mt-1 block font-mono text-2xl font-black leading-none text-secondary">
            {dados.vendasFalhas24h}
          </span>
        </div>
      </section>
    </div>
  );
};
