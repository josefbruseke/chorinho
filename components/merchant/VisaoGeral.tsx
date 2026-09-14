"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

type Janela = { vendas: number; carimbos: number; clientes: number };

type Resumo = {
  loja: { nome: string; papel: string };
  hoje: Janela;
  mes: Janela;
  terminais: { ativos: number; limite: number };
  recompensas: number;
  pendencias: { chave: string; texto: string; para: string }[];
};

/**
 * A visão geral do lojista.
 *
 * Primeiro o número de hoje, grande, porque é o que ele quer saber ao abrir.
 * Depois o que está travando a operação — terminal que falta, prêmio que não
 * existe — porque é a única coisa que exige ação dele. O resto é consulta.
 */
export const VisaoGeral = () => {
  const [dados, setDados] = useState<Resumo>();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    fetch("/api/merchant/resumo")
      .then(async r => {
        const corpo = await r.json();
        if (!r.ok) {
          setErro(
            r.status === 401
              ? "Entre com a conta da loja para ver o painel."
              : (corpo?.erro ?? "não foi possível carregar o painel"),
          );
          return;
        }
        setDados(corpo);
      })
      .catch(() => setErro("Sem conexão. Tente de novo em instantes."));
  }, []);

  if (erro) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">{erro}</h1>
        <Link href="/entrar?proximo=/painel" className="btn btn-primary h-14 rounded-2xl px-8 font-black">
          Entrar
        </Link>
      </div>
    );
  }

  if (!dados) {
    return (
      <div className="flex justify-center py-20">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 border-b border-base-300 pb-5 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <h1 className="m-0 font-serif text-2xl font-black tracking-tight text-secondary sm:text-3xl">
            {dados.loja.nome}
          </h1>
          {/* O que decide se o balcão carimba hoje é ter terminal ligado — e é
              o que cabe na linha embaixo do nome da loja. */}
          <p className="m-0 mt-1 text-sm opacity-75">
            {dados.terminais.ativos > 0
              ? `Balcão no ar — ${dados.terminais.ativos === 1 ? "1 terminal ligado" : `${dados.terminais.ativos} terminais ligados`}`
              : "Nenhum terminal ligado — o balcão ainda não carimba"}
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link
            href="/painel/auditoria"
            className="btn btn-ghost h-12 w-full justify-center gap-2 rounded-2xl font-bold sm:w-auto"
          >
            <ClipboardDocumentCheckIcon className="h-5 w-5" />
            Auditoria
          </Link>
          <Link
            href="/pdv"
            className="btn btn-primary h-14 w-full justify-center gap-2 rounded-2xl font-black sm:w-auto"
          >
            <QrCodeIcon className="h-5 w-5" />
            Abrir o balcão
          </Link>
        </div>
      </header>

      {dados.pendencias.length > 0 && (
        <section className="flex flex-col gap-2">
          {dados.pendencias.map(p => (
            <Link
              key={p.chave}
              href={p.para}
              className="flex min-h-14 items-center gap-3 rounded-2xl border border-warning bg-warning/10 p-4 no-underline"
            >
              <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-honey-ink" />
              <span className="flex-1 text-sm font-semibold">{p.texto}</span>
              <ArrowRightIcon className="h-5 w-5 shrink-0 opacity-60" />
            </Link>
          ))}
        </section>
      )}

      <section>
        <h2 className="m-0 mb-2 text-xs font-bold uppercase tracking-wide opacity-70">Hoje</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cartao rotulo="Carimbos" valor={String(dados.hoje.carimbos)} destaque />
          <Cartao rotulo="Vendas" valor={String(dados.hoje.vendas)} />
          <Cartao rotulo="Clientes" valor={String(dados.hoje.clientes)} />
        </div>
      </section>

      <section>
        <h2 className="m-0 mb-2 text-xs font-bold uppercase tracking-wide opacity-70">Últimos 30 dias</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cartao rotulo="Carimbos" valor={String(dados.mes.carimbos)} />
          <Cartao rotulo="Vendas" valor={String(dados.mes.vendas)} />
          <Cartao rotulo="Clientes" valor={String(dados.mes.clientes)} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/painel/pdv"
          className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 no-underline"
        >
          <span className="text-sm font-bold text-secondary">Terminais do balcão</span>
          <span className="font-mono text-lg font-black text-secondary">
            {dados.terminais.ativos}
            <span className="text-sm font-semibold opacity-60">/{dados.terminais.limite}</span>
          </span>
        </Link>

        <Link
          href="/painel/recompensas"
          className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 no-underline"
        >
          <span className="text-sm font-bold text-secondary">Prêmios no ar</span>
          <span className="font-mono text-lg font-black text-secondary">{dados.recompensas}</span>
        </Link>
      </section>
    </div>
  );
};

const Cartao = ({ rotulo, valor, destaque }: { rotulo: string; valor: string; destaque?: boolean }) => (
  <div className={`rounded-2xl border p-4 ${destaque ? "border-primary bg-primary/5" : "border-base-300 bg-base-100"}`}>
    <span className="block text-xs font-bold uppercase tracking-wide opacity-70">{rotulo}</span>
    <span className="mt-1 block font-mono text-3xl font-black leading-none text-secondary">{valor}</span>
  </div>
);
