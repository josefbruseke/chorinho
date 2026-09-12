"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { beneficioEmTexto, dataCurta, tiragemEmTexto } from "~~/utils/colecao";

type Programa = {
  id: string;
  onchainId: number | null;
  nome: string;
  tipo: "percentual" | "valor";
  beneficioBase: number;
  tetoCentavos: number;
  ativo: boolean;
};

type Peca = {
  id: string;
  onchainId: number | null;
  titulo: string;
  descricao: string | null;
  nivel: number;
  tiragem: number;
  maxPorCarteira: number;
  terminaEm: string | null;
  ativa: boolean;
  programaId: string;
  emCirculacao: number;
  rascunho: boolean;
};

type Dados = { loja: { nome: string; registrada: boolean }; programas: Programa[]; pecas: Peca[] };

type Formulario = {
  programaId: string;
  titulo: string;
  descricao: string;
  nivel: string;
  tiragem: string;
  maxPorCarteira: string;
  terminaEm: string;
};

const FORM_VAZIO: Formulario = {
  programaId: "",
  titulo: "",
  descricao: "",
  nivel: "1",
  tiragem: "50",
  maxPorCarteira: "1",
  terminaEm: "",
};

/**
 * A coleção da loja.
 *
 * A peça não carrega regra: ela aponta para um programa e diz o próprio nível.
 * Bronze é 1, ouro é 3, e o desconto sai de base × nível com o teto do programa.
 * É assim que uma coleção inteira nasce de uma regra só — e por isso o
 * formulário começa escolhendo o programa, não o nome.
 *
 * A peça se obtém gastando os próprios carimbos (no catálogo de prêmios) ou
 * conquistando. Não há compra: nenhum dinheiro de cliente passa por nós.
 */
export const ColecaoDaLoja = () => {
  const [dados, setDados] = useState<Dados>();
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/colecao");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar a coleção");
      return;
    }
    setErro(undefined);
    const corpo: Dados = await r.json();
    setDados(corpo);
    setForm(f => (f.programaId ? f : { ...f, programaId: corpo.programas.find(p => p.onchainId)?.id ?? "" }));
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = async () => {
    setCriando(true);
    setErro(undefined);
    setAviso(undefined);
    try {
      const r = await fetch("/api/merchant/colecao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          programaId: form.programaId,
          titulo: form.titulo,
          descricao: form.descricao,
          nivel: Number(form.nivel) || 1,
          tiragem: Number(form.tiragem) || 0,
          maxPorCarteira: Number(form.maxPorCarteira) || 0,
          terminaEm: form.terminaEm ? new Date(form.terminaEm).toISOString() : null,
        }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível criar a peça");
        return;
      }
      if (corpo.aviso) setAviso(corpo.aviso);
      setForm(f => ({ ...FORM_VAZIO, programaId: f.programaId }));
      await carregar();
    } finally {
      setCriando(false);
    }
  };

  const alternar = async (peca: Peca) => {
    setOcupado(peca.id);
    setErro(undefined);
    setAviso(undefined);
    try {
      const r = await fetch(`/api/merchant/colecao/${peca.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ativa: !peca.ativa }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) setErro(corpo?.erro ?? "não foi possível atualizar a peça");
      else if (corpo.aviso) setAviso(corpo.aviso);
      await carregar();
    } finally {
      setOcupado(undefined);
    }
  };

  if (erro && !dados) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }
  if (!dados) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  const programaPorId = new Map(dados.programas.map(p => [p.id, p]));
  const escolhido = programaPorId.get(form.programaId);
  const tituloValido = form.titulo.trim().length >= 2;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Coleção</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          As peças que a sua loja emite. Tiragem fechada, validade própria, e o desconto vindo do programa. O cliente as
          consegue gastando carimbos ou conquistando — nunca comprando.
        </p>
      </header>

      {dados.programas.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
          Antes da peça vem a regra.{" "}
          <Link href="/painel/programas" className="link font-bold">
            Crie um programa de desconto
          </Link>{" "}
          e volte aqui.
        </p>
      ) : (
        <form
          className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
          onSubmit={e => {
            e.preventDefault();
            if (tituloValido && form.programaId) void criar();
          }}
        >
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Programa que esta peça aciona
            <select
              value={form.programaId}
              onChange={e => setForm(f => ({ ...f, programaId: e.target.value }))}
              aria-label="Programa"
              className="select select-bordered h-12 w-full text-base"
            >
              <option value="">Escolha o programa…</option>
              {dados.programas.map(p => (
                <option key={p.id} value={p.id} disabled={!p.onchainId}>
                  {p.nome}
                  {p.onchainId ? "" : " (ainda é rascunho)"}
                </option>
              ))}
            </select>
          </label>

          <input
            value={form.titulo}
            onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
            maxLength={80}
            placeholder="Nome da peça (ex.: Bronze do Clube)"
            aria-label="Nome da peça"
            className="input input-bordered h-12 w-full text-base"
          />
          <textarea
            value={form.descricao}
            onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
            maxLength={280}
            rows={2}
            placeholder="Descrição curta (opcional)"
            aria-label="Descrição da peça"
            className="textarea textarea-bordered w-full text-base"
          />

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
              Nível
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={100}
                value={form.nivel}
                onChange={e => setForm(f => ({ ...f, nivel: e.target.value }))}
                aria-label="Nível da peça"
                className="input input-bordered h-12 w-full text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
              Tiragem
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.tiragem}
                onChange={e => setForm(f => ({ ...f, tiragem: e.target.value }))}
                aria-label="Tiragem"
                className="input input-bordered h-12 w-full text-base"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
              Por pessoa
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.maxPorCarteira}
                onChange={e => setForm(f => ({ ...f, maxPorCarteira: e.target.value }))}
                aria-label="Limite por pessoa"
                className="input input-bordered h-12 w-full text-base"
              />
            </label>
          </div>

          {escolhido && (
            <p className="m-0 rounded-xl bg-base-200 p-3 text-sm">
              Esta peça vai descontar{" "}
              <strong className="text-secondary">
                {beneficioEmTexto(
                  escolhido.tipo,
                  escolhido.beneficioBase,
                  Number(form.nivel) || 1,
                  escolhido.tetoCentavos,
                )}
              </strong>{" "}
              pelo programa <strong>{escolhido.nome}</strong>.
            </p>
          )}

          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Tempo de vida da peça (opcional)
            <input
              type="date"
              value={form.terminaEm}
              onChange={e => setForm(f => ({ ...f, terminaEm: e.target.value }))}
              aria-label="Validade da peça"
              className="input input-bordered h-12 w-full text-base"
            />
            <span className="font-normal opacity-70">
              Depois desta data a peça não é mais emitida. Tiragem e validade juntas são o que fazem o seu passivo ter
              tamanho e prazo.
            </span>
          </label>

          <button
            type="submit"
            disabled={!tituloValido || !form.programaId || criando}
            className="btn btn-primary h-14 gap-1.5 rounded-2xl font-black disabled:opacity-40"
          >
            <SparklesIcon className="h-5 w-5" />
            Criar peça
          </button>
        </form>
      )}

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erro}</p>}
      {aviso && (
        <p className="m-0 rounded-2xl border border-honey-edge bg-honey-soft p-3 text-sm font-semibold text-honey-ink">
          {aviso}
        </p>
      )}

      {dados.pecas.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
          Nenhuma peça ainda.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dados.pecas.map(p => {
            const programa = programaPorId.get(p.programaId);
            return (
              <li
                key={p.id}
                className="flex items-start justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
              >
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-base text-secondary">{p.titulo}</strong>
                  <p className="m-0 mt-0.5 text-xs leading-snug opacity-70">
                    nível {p.nivel}
                    {programa &&
                      ` • ${beneficioEmTexto(programa.tipo, programa.beneficioBase, p.nivel, programa.tetoCentavos)}`}
                    {programa && ` • ${programa.nome}`}
                  </p>
                  <p className="m-0 mt-1 text-xs font-bold text-secondary">
                    {tiragemEmTexto(p.tiragem, p.emCirculacao)}
                    {p.maxPorCarteira > 0 && ` • ${p.maxPorCarteira} por pessoa`}
                    {p.terminaEm && ` • até ${dataCurta(p.terminaEm)}`}
                  </p>
                  {p.rascunho && (
                    <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-warning bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                      rascunho — ainda não existe na rede
                    </span>
                  )}
                </div>
                <label className="flex min-h-12 shrink-0 items-center gap-2">
                  <span className="sr-only">{p.ativa ? `Desligar ${p.titulo}` : `Ligar ${p.titulo}`}</span>
                  <input
                    type="checkbox"
                    checked={p.ativa}
                    disabled={ocupado === p.id}
                    onChange={() => void alternar(p)}
                    className="toggle toggle-primary"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
