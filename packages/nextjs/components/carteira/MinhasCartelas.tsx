"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SparklesIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { type Cartela, CartelaCard } from "~~/components/carteira/CartelaCard";
import { MinhaColecao } from "~~/components/carteira/MinhaColecao";
import { supabaseBrowser, supabaseConfigurado } from "~~/services/database/browser";
import { INICIO_DO_APP } from "~~/utils/rotas";

type Resposta = { carteira: string | null; cartelas: Cartela[]; pontos: number };

/**
 * As cartelas, com o saldo acendendo em tempo real.
 *
 * O cliente está de pé no balcão quando o atendente confirma. Fazer ele
 * recarregar a tela para acreditar que o carimbo entrou desperdiça o melhor
 * momento do produto — por isso a assinatura no Realtime.
 */
export const MinhasCartelas = () => {
  const [dados, setDados] = useState<Resposta>();
  const [erro, setErro] = useState<string>();

  const carregar = useCallback(async () => {
    try {
      const r = await fetch("/api/carteira/cartelas");
      if (r.status === 401) {
        setErro("Entre na sua conta para ver suas cartelas.");
        return;
      }
      if (!r.ok) {
        setErro("Não foi possível carregar suas cartelas agora.");
        return;
      }
      setErro(undefined);
      setDados(await r.json());
    } catch {
      setErro("Sem conexão. Tente de novo em instantes.");
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const carteira = dados?.carteira;
    if (!carteira || !supabaseConfigurado()) return;

    const canal = supabaseBrowser()
      .channel(`cartelas:${carteira}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stamp_balances_cache", filter: `wallet=eq.${carteira}` },
        () => void carregar(),
      )
      .subscribe();

    return () => {
      void supabaseBrowser().removeChannel(canal);
    };
  }, [dados?.carteira, carregar]);

  if (erro) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="m-0 max-w-xs text-sm opacity-75">{erro}</p>
        <Link href="/entrar" className="btn btn-primary rounded-2xl font-bold">
          Entrar
        </Link>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="m-0 font-serif text-2xl font-black text-secondary">Minhas cartelas</h1>
          <p className="m-0 mt-0.5 text-sm opacity-70">
            {dados.cartelas.length === 0
              ? "Cada compra vira carimbo"
              : `${dados.cartelas.length} ${dados.cartelas.length === 1 ? "loja" : "lojas"} do seu bairro`}
          </p>
        </div>

        {dados.pontos > 0 && (
          <Link
            href="/recompensas"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-honey-edge bg-honey-soft px-3 py-1.5 text-sm font-bold text-honey-ink no-underline"
          >
            <SparklesIcon className="h-4 w-4" />
            {dados.pontos} pontos
          </Link>
        )}
      </header>

      {dados.cartelas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-base-300 px-6 py-14 text-center">
          <p className="m-0 max-w-xs text-sm opacity-75">
            Sua primeira cartela nasce na primeira compra. Mostre seu passe no balcão de qualquer loja parceira.
          </p>
          <div className="flex flex-col gap-2">
            <Link href="/passe" className="btn btn-primary rounded-2xl font-bold">
              Abrir meu passe
            </Link>
            <Link href={INICIO_DO_APP} className="btn btn-ghost btn-sm gap-1.5 rounded-xl">
              <Squares2X2Icon className="h-4 w-4" />
              Ver os lugares
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {dados.cartelas.map(c => (
            <CartelaCard key={c.slug} cartela={c} />
          ))}
        </div>
      )}

      {/* Depois das cartelas: o carimbo é a razão de abrir esta tela, a peça é
          o que se descobre depois. A coleção some sozinha quando está vazia. */}
      <MinhaColecao />
    </div>
  );
};
