"use client";

import { useCallback, useEffect, useState } from "react";
import { GiftIcon, SparklesIcon } from "@heroicons/react/24/outline";

type Recompensa = {
  id: string;
  onchainId: number | null;
  titulo: string;
  descricao: string | null;
  selos: number;
  pontos: number;
  ativa: boolean;
  maxResgates: number;
  resgatados: number;
  pecaId: string | null;
  rascunho: boolean;
};

type PecaDoCatalogo = { id: string; titulo: string; nivel: number };

type Formulario = { titulo: string; descricao: string; selos: string; pontos: string; pecaId: string };

const FORM_VAZIO: Formulario = { titulo: "", descricao: "", selos: "0", pontos: "0", pecaId: "" };

/**
 * O que os carimbos e os pontos da cidade compram nesta loja.
 *
 * Cartela sem prêmio no fim não faz ninguém voltar — é a página que fecha
 * esse ciclo. O contrato guarda o custo e o estoque; o Supabase guarda a foto
 * e o texto. Um prêmio sem `onchain_id` aparece marcado como rascunho: o
 * balcão ainda não sabe que ele existe.
 */
export const RecompensasDaLoja = () => {
  const [dados, setDados] = useState<{ loja: { nome: string }; recompensas: Recompensa[]; pecas: PecaDoCatalogo[] }>();
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [criando, setCriando] = useState(false);
  const [atualizando, setAtualizando] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/recompensas");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar as recompensas");
      return;
    }
    setErro(undefined);
    setDados(await r.json());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criar = async () => {
    setCriando(true);
    setErro(undefined);
    setAviso(undefined);
    try {
      const r = await fetch("/api/merchant/recompensas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao,
          selos: Number(form.selos) || 0,
          pontos: Number(form.pontos) || 0,
          pecaId: form.pecaId || null,
        }),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível criar o prêmio");
        return;
      }
      if (corpo.aviso) setAviso(corpo.aviso);
      setForm(FORM_VAZIO);
      await carregar();
    } finally {
      setCriando(false);
    }
  };

  const alternar = async (recompensa: Recompensa) => {
    setAtualizando(recompensa.id);
    setErro(undefined);
    setAviso(undefined);
    try {
      const r = await fetch(`/api/merchant/recompensas/${recompensa.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ativa: !recompensa.ativa }),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível atualizar o prêmio");
        return;
      }
      if (corpo.aviso) setAviso(corpo.aviso);
      await carregar();
    } finally {
      setAtualizando(undefined);
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

  const tituloAparado = form.titulo.trim();
  const tituloValido = tituloAparado.length >= 2 && tituloAparado.length <= 80;
  const semCusto = (Number(form.selos) || 0) === 0 && (Number(form.pontos) || 0) === 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Recompensas</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          O que os carimbos e os pontos da cidade compram na sua loja. Cartela sem prêmio no fim não faz ninguém voltar.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
        onSubmit={e => {
          e.preventDefault();
          if (tituloValido && !semCusto) void criar();
        }}
      >
        <input
          value={form.titulo}
          onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
          maxLength={80}
          placeholder="Nome do prêmio (ex.: Café coado com pão de queijo)"
          aria-label="Título do prêmio"
          className="input input-bordered h-12 w-full text-base"
        />
        <textarea
          value={form.descricao}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          maxLength={280}
          rows={2}
          placeholder="Descrição curta (opcional)"
          aria-label="Descrição do prêmio"
          className="textarea textarea-bordered w-full text-base"
        />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Custo em carimbos
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.selos}
              onChange={e => setForm(f => ({ ...f, selos: e.target.value }))}
              aria-label="Custo em carimbos"
              className="input input-bordered h-12 w-full text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Custo em pontos da cidade
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.pontos}
              onChange={e => setForm(f => ({ ...f, pontos: e.target.value }))}
              aria-label="Custo em pontos da cidade"
              className="input input-bordered h-12 w-full text-base"
            />
          </label>
        </div>

        {/* O gatilho direto: o cliente gasta os próprios carimbos e leva a
            peça junto do prêmio. É a única porta pela qual uma peça se compra,
            e a moeda é carimbo — nenhum dinheiro de cliente passa por nós. */}
        {dados.pecas.length > 0 && (
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Entregar também uma peça da coleção (opcional)
            <select
              value={form.pecaId}
              onChange={e => setForm(f => ({ ...f, pecaId: e.target.value }))}
              aria-label="Peça entregue com o prêmio"
              className="select select-bordered h-12 w-full text-base"
            >
              <option value="">Nenhuma</option>
              {dados.pecas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.titulo} (nível {p.nivel})
                </option>
              ))}
            </select>
          </label>
        )}

        {/* O aviso só aparece depois que o lojista começou a preencher: mostrar
            erro num formulário em branco faz a tela parecer quebrada antes de
            alguém ter feito nada. */}
        {semCusto && tituloValido && (
          <p className="m-0 text-xs font-semibold text-warning">
            defina carimbos, pontos, ou os dois — um prêmio de graça não é permitido
          </p>
        )}

        <button
          type="submit"
          disabled={!tituloValido || semCusto || criando}
          className="btn btn-primary h-14 gap-1.5 rounded-2xl font-black disabled:opacity-40"
        >
          <GiftIcon className="h-5 w-5" />
          Cadastrar prêmio
        </button>
      </form>

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erro}</p>}
      {aviso && (
        <p className="m-0 rounded-2xl border border-honey-edge bg-honey-soft p-3 text-sm font-semibold text-honey-ink">
          {aviso}
        </p>
      )}

      {dados.recompensas.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
          Nenhum prêmio cadastrado ainda. Sem um fim para a cartela, o cliente junta os carimbos e some — cadastre o
          primeiro prêmio acima.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dados.recompensas.map(r => (
            <li key={r.id} className="flex flex-col gap-2 rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-base text-secondary">{r.titulo}</strong>
                  {r.descricao && <p className="m-0 mt-0.5 text-xs leading-snug opacity-70">{r.descricao}</p>}
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-base-200 px-2.5 py-1 text-xs font-bold text-secondary">
                    {r.selos > 0 && `${r.selos} ${r.selos === 1 ? "carimbo" : "carimbos"}`}
                    {r.selos > 0 && r.pontos > 0 && " + "}
                    {r.pontos > 0 && (
                      <>
                        <SparklesIcon className="h-3.5 w-3.5" />
                        {r.pontos} pontos
                      </>
                    )}
                  </span>
                  {r.pecaId && (
                    <span className="mt-1.5 ml-1.5 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      <SparklesIcon className="h-3.5 w-3.5" />
                      vem com peça
                    </span>
                  )}
                </div>

                <label className="flex min-h-12 shrink-0 items-center gap-2">
                  <span className="sr-only">{r.ativa ? `Desligar ${r.titulo}` : `Ligar ${r.titulo}`}</span>
                  <input
                    type="checkbox"
                    checked={r.ativa}
                    disabled={atualizando === r.id}
                    onChange={() => void alternar(r)}
                    aria-label={r.ativa ? `Desligar ${r.titulo}` : `Ligar ${r.titulo}`}
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs opacity-75">
                <span>
                  {r.resgatados} {r.resgatados === 1 ? "resgate" : "resgates"}
                </span>
                {r.rascunho && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-warning bg-warning/10 px-2 py-0.5 font-bold text-warning">
                    rascunho — o balcão ainda não consegue entregar este prêmio
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
