"use client";

import { useCallback, useEffect, useState } from "react";
import { TrophyIcon } from "@heroicons/react/24/outline";
import { CRITERIOS, criterioEmDinheiro, criterioEmTexto, dataCurta } from "~~/utils/colecao";

type Conquista = {
  id: string;
  onchainId: number | null;
  titulo: string;
  descricao: string | null;
  criterio: number;
  alvo: number;
  terminaEm: string | null;
  maxConquistadores: number;
  conquistadores: number;
  pecaId: string | null;
  entregaSelo: boolean;
  ativa: boolean;
  rascunho: boolean;
};

type PecaDisponivel = { id: string; titulo: string; nivel: number; disponivel: boolean };

type Dados = { loja: { nome: string; registrada: boolean }; conquistas: Conquista[]; pecas: PecaDisponivel[] };

type Formulario = {
  titulo: string;
  descricao: string;
  criterio: string;
  alvo: string;
  maxConquistadores: string;
  pecaId: string;
  entregaSelo: boolean;
  terminaEm: string;
};

const FORM_VAZIO: Formulario = {
  titulo: "",
  descricao: "",
  criterio: "2",
  alvo: "10",
  maxConquistadores: "0",
  pecaId: "",
  entregaSelo: true,
  terminaEm: "",
};

/**
 * As conquistas que a loja define.
 *
 * O critério é conferido pela cadeia na hora da entrega: o contrato lê a
 * cartela do cliente sozinho e recusa quem não bateu, mesmo que o nosso
 * servidor mande entregar. O lojista escreve a regra e pronto — não existe
 * caminho em que alguém ganhe sem ter cumprido, e ninguém precisa auditar
 * entrega nenhuma depois.
 *
 * "Uma compra específica" é a exceção, e a tela diz isso na cara.
 */
export const ConquistasDaLoja = () => {
  const [dados, setDados] = useState<Dados>();
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/conquistas");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar as conquistas");
      return;
    }
    setErro(undefined);
    setDados(await r.json());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const criterio = Number(form.criterio);
  const emDinheiro = criterioEmDinheiro(criterio);
  const alvoBruto = Number(form.alvo.replace(",", ".")) || 0;
  // Critério de dinheiro viaja em centavos; os outros em unidades inteiras.
  const alvo = emDinheiro ? Math.round(alvoBruto * 100) : Math.round(alvoBruto);

  const criar = async () => {
    setCriando(true);
    setErro(undefined);
    setAviso(undefined);
    try {
      const r = await fetch("/api/merchant/conquistas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titulo: form.titulo,
          descricao: form.descricao,
          criterio,
          alvo,
          maxConquistadores: Number(form.maxConquistadores) || 0,
          pecaId: form.pecaId || null,
          entregaSelo: form.entregaSelo,
          terminaEm: form.terminaEm ? new Date(form.terminaEm).toISOString() : null,
        }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível criar a conquista");
        return;
      }
      if (corpo.aviso) setAviso(corpo.aviso);
      setForm(FORM_VAZIO);
      await carregar();
    } finally {
      setCriando(false);
    }
  };

  const alternar = async (c: Conquista) => {
    setOcupado(c.id);
    setErro(undefined);
    setAviso(undefined);
    try {
      const r = await fetch(`/api/merchant/conquistas/${c.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ativa: !c.ativa }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) setErro(corpo?.erro ?? "não foi possível atualizar a conquista");
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

  const escolhido = CRITERIOS[criterio] ?? CRITERIOS[0];
  const pecasProntas = dados.pecas.filter(p => p.disponivel);
  const tituloValido = form.titulo.trim().length >= 2;
  const entregaAlgo = form.entregaSelo || Boolean(form.pecaId);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Conquistas</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          Você escreve a regra; a rede confere sozinha quem bateu. Ninguém recebe sem ter cumprido, e você não precisa
          conferir nada depois.
        </p>
      </header>

      <form
        className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
        onSubmit={e => {
          e.preventDefault();
          if (tituloValido && alvo > 0 && entregaAlgo) void criar();
        }}
      >
        <input
          value={form.titulo}
          onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
          maxLength={80}
          placeholder="Nome da conquista (ex.: Cliente da casa)"
          aria-label="Nome da conquista"
          className="input input-bordered h-12 w-full text-base"
        />
        <textarea
          value={form.descricao}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          maxLength={280}
          rows={2}
          placeholder="Descrição curta (opcional)"
          aria-label="Descrição da conquista"
          className="textarea textarea-bordered w-full text-base"
        />

        <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
          Critério
          <select
            value={form.criterio}
            onChange={e => setForm(f => ({ ...f, criterio: e.target.value }))}
            aria-label="Critério"
            className="select select-bordered h-12 w-full text-base"
          >
            {CRITERIOS.map(c => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
          <span className="font-normal opacity-70">{escolhido.ajuda}</span>
        </label>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            {emDinheiro ? "Valor em reais" : "Quantidade"}
            <input
              inputMode="decimal"
              value={form.alvo}
              onChange={e => setForm(f => ({ ...f, alvo: e.target.value }))}
              aria-label="Alvo da conquista"
              className="input input-bordered h-12 w-full text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Máximo de pessoas (0 = sem limite)
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={form.maxConquistadores}
              onChange={e => setForm(f => ({ ...f, maxConquistadores: e.target.value }))}
              aria-label="Máximo de conquistadores"
              className="input input-bordered h-12 w-full text-base"
            />
          </label>
        </div>

        {criterio === 4 && (
          <p className="m-0 rounded-xl border border-warning bg-warning/10 p-3 text-xs font-semibold">
            Este é o único critério que a rede não confere sozinha. A cartela guarda o acumulado, não o valor de cada
            compra — aqui quem atesta é o nosso servidor.
          </p>
        )}

        <fieldset className="flex flex-col gap-2 rounded-xl bg-base-200 p-3">
          <legend className="px-1 text-xs font-black uppercase tracking-wide opacity-70">O que ela entrega</legend>

          <label className="flex min-h-12 items-center gap-3">
            <input
              type="checkbox"
              checked={form.entregaSelo}
              onChange={e => setForm(f => ({ ...f, entregaSelo: e.target.checked }))}
              className="checkbox checkbox-primary"
            />
            <span className="text-sm font-semibold">
              Selo de conquista
              <span className="block text-xs font-normal opacity-70">
                Fica com quem conquistou, para sempre. Não se transfere nem se vende.
              </span>
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Peça da coleção (opcional)
            <select
              value={form.pecaId}
              onChange={e => setForm(f => ({ ...f, pecaId: e.target.value }))}
              aria-label="Peça entregue"
              className="select select-bordered h-12 w-full text-base"
            >
              <option value="">Nenhuma</option>
              {pecasProntas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.titulo} (nível {p.nivel})
                </option>
              ))}
            </select>
          </label>

          {!entregaAlgo && (
            <p className="m-0 text-xs font-semibold text-warning">
              escolha ao menos uma coisa — uma conquista que não entrega nada é uma barra de progresso que termina em
              nada
            </p>
          )}
        </fieldset>

        <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
          Vale até (opcional)
          <input
            type="date"
            value={form.terminaEm}
            onChange={e => setForm(f => ({ ...f, terminaEm: e.target.value }))}
            aria-label="Validade da conquista"
            className="input input-bordered h-12 w-full text-base"
          />
        </label>

        <button
          type="submit"
          disabled={!tituloValido || alvo <= 0 || !entregaAlgo || criando}
          className="btn btn-primary h-14 gap-1.5 rounded-2xl font-black disabled:opacity-40"
        >
          <TrophyIcon className="h-5 w-5" />
          Criar conquista
        </button>
      </form>

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erro}</p>}
      {aviso && (
        <p className="m-0 rounded-2xl border border-honey-edge bg-honey-soft p-3 text-sm font-semibold text-honey-ink">
          {aviso}
        </p>
      )}

      {dados.conquistas.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
          Nenhuma conquista ainda. Uma meta visível é o que transforma um “já vim aqui umas vezes” num “faltam três”.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dados.conquistas.map(c => (
            <li
              key={c.id}
              className="flex items-start justify-between gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
            >
              <div className="min-w-0 flex-1">
                <strong className="block truncate text-base text-secondary">{c.titulo}</strong>
                <p className="m-0 mt-0.5 text-xs leading-snug opacity-70">
                  {criterioEmTexto(c.criterio, c.alvo)}
                  {c.terminaEm && ` • até ${dataCurta(c.terminaEm)}`}
                </p>
                <p className="m-0 mt-1 text-xs font-bold text-secondary">
                  {c.conquistadores} {c.conquistadores === 1 ? "pessoa conquistou" : "pessoas conquistaram"}
                  {c.maxConquistadores > 0 && ` de ${c.maxConquistadores}`}
                  {c.entregaSelo && " • entrega selo"}
                  {c.pecaId && " • entrega peça"}
                </p>
                {c.rascunho && (
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-warning bg-warning/10 px-2 py-0.5 text-xs font-bold text-warning">
                    rascunho — ainda não existe na rede
                  </span>
                )}
              </div>
              <label className="flex min-h-12 shrink-0 items-center gap-2">
                <span className="sr-only">{c.ativa ? `Desligar ${c.titulo}` : `Ligar ${c.titulo}`}</span>
                <input
                  type="checkbox"
                  checked={c.ativa}
                  disabled={ocupado === c.id}
                  onChange={() => void alternar(c)}
                  className="toggle toggle-primary"
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
