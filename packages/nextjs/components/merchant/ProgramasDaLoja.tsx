"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckIcon, TagIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { supabaseBrowser, supabaseConfigurado } from "~~/services/database/browser";
import { beneficioEmTexto, dataCurta } from "~~/utils/colecao";
import { formatarCentavos } from "~~/utils/dinheiro";

type Programa = {
  id: string;
  onchainId: number | null;
  nome: string;
  descricao: string | null;
  tipo: "percentual" | "valor";
  beneficioBase: number;
  tetoCentavos: number;
  produto: string | null;
  terminaEm: string | null;
  conjunto: boolean;
  ativo: boolean;
  rascunho: boolean;
  participacao: string | null;
};

type Convite = Programa & { deQuem: string };

type Dados = {
  loja: { id: string; nome: string; registrada: boolean };
  programas: Programa[];
  convites: Convite[];
};

type Vizinha = { id: string; name: string };

type Formulario = {
  nome: string;
  descricao: string;
  tipo: "percentual" | "valor";
  beneficio: string;
  teto: string;
  produto: string;
  conjunto: boolean;
  terminaEm: string;
};

const FORM_VAZIO: Formulario = {
  nome: "",
  descricao: "",
  tipo: "percentual",
  beneficio: "10",
  teto: "",
  produto: "",
  conjunto: false,
  terminaEm: "",
};

/**
 * Os programas de desconto da loja, e a pool com as vizinhas.
 *
 * O programa é a regra; a peça é o colecionável que aponta para ela. Separar os
 * dois é o que deixa a loja mexer no teto sem reemitir nada — e é por isso que
 * esta tela vem antes da coleção no menu.
 */
export const ProgramasDaLoja = () => {
  const [dados, setDados] = useState<Dados>();
  const [vizinhas, setVizinhas] = useState<Vizinha[]>([]);
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [criando, setCriando] = useState(false);
  const [ocupado, setOcupado] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [aviso, setAviso] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/programas");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar os programas");
      return;
    }
    setErro(undefined);
    setDados(await r.json());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // As vizinhas convidáveis saem do Supabase pelo cliente: é a mesma lista
  // pública da vitrine, e passá-la pelo servidor seria uma rota a mais para
  // dizer o que qualquer visitante já enxerga.
  useEffect(() => {
    if (!dados || !supabaseConfigurado()) return;
    supabaseBrowser()
      .from("establishments")
      .select("id, name")
      .eq("status", "ativo")
      .neq("id", dados.loja.id)
      .order("name")
      .limit(100)
      .then(({ data }) => setVizinhas(data ?? []));
  }, [dados]);

  const chamar = async (url: string, corpo: unknown, chave: string, method: "POST" | "PATCH" = "POST") => {
    setOcupado(chave);
    setErro(undefined);
    setAviso(undefined);
    try {
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const resposta = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(resposta?.erro ?? "não foi possível concluir");
        return false;
      }
      if (resposta?.aviso) setAviso(resposta.aviso);
      await carregar();
      return true;
    } finally {
      setOcupado(undefined);
    }
  };

  const criar = async () => {
    setCriando(true);
    try {
      const ok = await chamar(
        "/api/merchant/programas",
        {
          nome: form.nome,
          descricao: form.descricao,
          tipo: form.tipo,
          // Os dois caem em "x100" por coincidência de unidade: percentual vira
          // pontos-base (10% = 1000) e valor fixo vira centavos (R$ 5 = 500). O
          // lojista digita "10" ou "5,00" e não vê nenhum dos dois.
          beneficioBase: Math.round((Number(form.beneficio.replace(",", ".")) || 0) * 100),
          tetoCentavos: form.teto ? Math.round((Number(form.teto.replace(",", ".")) || 0) * 100) : 0,
          produto: form.produto,
          conjunto: form.conjunto,
          terminaEm: form.terminaEm ? new Date(form.terminaEm).toISOString() : null,
        },
        "criar",
      );
      if (ok) setForm(FORM_VAZIO);
    } finally {
      setCriando(false);
    }
  };

  const alternar = (p: Programa) => chamar(`/api/merchant/programas/${p.id}`, { ativo: !p.ativo }, p.id, "PATCH");

  if (erro && !dados) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }
  if (!dados) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  const nomeAparado = form.nome.trim();
  const bytesDoNome = new TextEncoder().encode(nomeAparado).length;
  const nomeValido = nomeAparado.length >= 2 && bytesDoNome <= 32;
  const beneficioValido = (Number(form.beneficio.replace(",", ".")) || 0) > 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Programas de desconto</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          A regra com nome que as suas peças acionam. Mexer aqui muda todas as peças já emitidas, sem reemitir nenhuma.
        </p>
      </header>

      {!dados.loja.registrada && (
        <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">
          Sua loja ainda não foi registrada na rede. Dá para criar o programa, mas ele fica como rascunho até lá.
        </p>
      )}

      <form
        className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4"
        onSubmit={e => {
          e.preventDefault();
          if (nomeValido && beneficioValido) void criar();
        }}
      >
        <input
          value={form.nome}
          onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
          placeholder="Nome do programa (ex.: Clube da Manhã)"
          aria-label="Nome do programa"
          className="input input-bordered h-12 w-full text-base"
        />
        {nomeAparado.length >= 2 && bytesDoNome > 32 && (
          <p className="m-0 text-xs font-semibold text-honey-ink">
            o nome não cabe na rede: são 32 caracteres, e cada acento conta por dois
          </p>
        )}

        <textarea
          value={form.descricao}
          onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
          maxLength={280}
          rows={2}
          placeholder="Descrição curta (opcional)"
          aria-label="Descrição do programa"
          className="textarea textarea-bordered w-full text-base"
        />

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Tipo de desconto
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value as Formulario["tipo"] }))}
              aria-label="Tipo de desconto"
              className="select select-bordered h-12 w-full text-base"
            >
              <option value="percentual">Percentual</option>
              <option value="valor">Valor fixo</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            {form.tipo === "percentual" ? "Percentual por nível" : "Reais por nível"}
            <input
              inputMode="decimal"
              value={form.beneficio}
              onChange={e => setForm(f => ({ ...f, beneficio: e.target.value }))}
              aria-label={form.tipo === "percentual" ? "Percentual por nível" : "Reais por nível"}
              className="input input-bordered h-12 w-full text-base"
            />
          </label>
        </div>

        {form.tipo === "percentual" && (
          <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
            Teto do desconto em reais (opcional, mas recomendado)
            <input
              inputMode="decimal"
              value={form.teto}
              onChange={e => setForm(f => ({ ...f, teto: e.target.value }))}
              placeholder="20,00"
              aria-label="Teto do desconto"
              className="input input-bordered h-12 w-full text-base"
            />
            <span className="font-normal opacity-70">
              Sem teto, 20% de uma conta grande é um prejuízo que você não viu chegando.
            </span>
          </label>
        )}

        <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
          Vale só num produto? (deixe vazio para a loja toda)
          <input
            value={form.produto}
            onChange={e => setForm(f => ({ ...f, produto: e.target.value }))}
            maxLength={60}
            placeholder="ex.: cappuccino"
            aria-label="Produto"
            className="input input-bordered h-12 w-full text-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold opacity-75">
          Vale até (opcional)
          <input
            type="date"
            value={form.terminaEm}
            onChange={e => setForm(f => ({ ...f, terminaEm: e.target.value }))}
            aria-label="Data de validade"
            className="input input-bordered h-12 w-full text-base"
          />
        </label>

        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-base-200 px-3">
          <input
            type="checkbox"
            checked={form.conjunto}
            onChange={e => setForm(f => ({ ...f, conjunto: e.target.checked }))}
            className="checkbox checkbox-primary"
          />
          <span className="text-sm font-semibold">
            Programa conjunto
            <span className="block text-xs font-normal opacity-70">
              Convide vizinhas: a peça vale em todas as que aceitarem.
            </span>
          </span>
        </label>

        <button
          type="submit"
          disabled={!nomeValido || !beneficioValido || criando}
          className="btn btn-primary h-14 gap-1.5 rounded-2xl font-black disabled:opacity-40"
        >
          <TagIcon className="h-5 w-5" />
          Criar programa
        </button>
      </form>

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erro}</p>}
      {aviso && (
        <p className="m-0 rounded-2xl border border-honey-edge bg-honey-soft p-3 text-sm font-semibold text-honey-ink">
          {aviso}
        </p>
      )}

      {dados.convites.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-sm font-black uppercase tracking-wide opacity-70">Convites das vizinhas</h2>
          {dados.convites.map(c => (
            <article key={c.id} className="flex flex-col gap-2 rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <div>
                <strong className="block text-base text-secondary">{c.nome}</strong>
                <p className="m-0 mt-0.5 text-xs opacity-75">
                  {c.deQuem} • {beneficioEmTexto(c.tipo, c.beneficioBase, 1, c.tetoCentavos)} por nível
                  {c.terminaEm && ` • até ${dataCurta(c.terminaEm)}`}
                </p>
              </div>
              {c.participacao === "convidada" ? (
                <button
                  type="button"
                  disabled={ocupado === c.id}
                  onClick={() => void chamar(`/api/merchant/programas/${c.id}`, { acao: "aceitar" }, c.id)}
                  className="btn btn-primary h-12 gap-1.5 rounded-xl font-black"
                >
                  <CheckIcon className="h-5 w-5" />
                  Aceitar e honrar este desconto
                </button>
              ) : c.participacao === "aceita" ? (
                <button
                  type="button"
                  disabled={ocupado === c.id}
                  onClick={() => void chamar(`/api/merchant/programas/${c.id}`, { acao: "sair" }, c.id)}
                  className="btn btn-ghost h-12 rounded-xl font-bold"
                >
                  Sair desta pool
                </button>
              ) : (
                <span className="text-xs font-bold opacity-60">você saiu desta pool</span>
              )}
            </article>
          ))}
        </section>
      )}

      {dados.programas.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
          Nenhum programa ainda. Crie o primeiro acima — sem ele, as peças da sua coleção não têm regra para acionar.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dados.programas.map(p => (
            <li key={p.id} className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-base text-secondary">{p.nome}</strong>
                  <p className="m-0 mt-0.5 text-xs leading-snug opacity-70">
                    {beneficioEmTexto(p.tipo, p.beneficioBase, 1, p.tetoCentavos)} por nível
                    {p.produto ? ` • só em ${p.produto}` : " • na loja toda"}
                    {p.terminaEm && ` • até ${dataCurta(p.terminaEm)}`}
                  </p>
                  {p.descricao && <p className="m-0 mt-1 text-xs leading-snug opacity-60">{p.descricao}</p>}
                </div>
                <label className="flex min-h-12 shrink-0 items-center gap-2">
                  <span className="sr-only">{p.ativo ? `Desligar ${p.nome}` : `Ligar ${p.nome}`}</span>
                  <input
                    type="checkbox"
                    checked={p.ativo}
                    disabled={ocupado === p.id}
                    onChange={() => void alternar(p)}
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              {p.rascunho && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full border border-warning bg-warning/10 px-2 py-0.5 text-xs font-bold text-honey-ink">
                  rascunho — ainda não existe na rede
                </span>
              )}

              {p.conjunto && !p.rascunho && <Pool programa={p} vizinhas={vizinhas} aoConvidar={carregar} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * A pool de um programa conjunto.
 *
 * Convidar é do dono do programa; aceitar é da vizinha, na tela dela. Essa
 * separação é o coração do arranjo: sem ela, uma loja poderia obrigar a outra a
 * dar desconto sem que ela soubesse.
 */
const Pool = ({
  programa,
  vizinhas,
  aoConvidar,
}: {
  programa: Programa;
  vizinhas: Vizinha[];
  aoConvidar: () => Promise<void>;
}) => {
  const [escolhida, setEscolhida] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [recado, setRecado] = useState<string>();

  const convidar = async () => {
    if (!escolhida) return;
    setEnviando(true);
    setRecado(undefined);
    try {
      const r = await fetch(`/api/merchant/programas/${programa.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "convidar", lojaId: escolhida }),
      });
      const corpo = await r.json().catch(() => ({}));
      setRecado(r.ok ? `convite enviado para ${corpo.convidada ?? "a loja"}` : (corpo?.erro ?? "não deu certo"));
      if (r.ok) {
        setEscolhida("");
        await aoConvidar();
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-base-200 p-3">
      <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide opacity-70">
        <UserGroupIcon className="h-4 w-4" />
        Convidar uma vizinha
      </span>
      <div className="flex flex-wrap gap-2">
        <select
          value={escolhida}
          onChange={e => setEscolhida(e.target.value)}
          aria-label={`Loja para convidar ao programa ${programa.nome}`}
          className="select select-bordered h-12 min-w-0 flex-1 text-base"
        >
          <option value="">Escolha a loja…</option>
          {vizinhas.map(v => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!escolhida || enviando}
          onClick={() => void convidar()}
          className="btn btn-secondary h-12 rounded-xl font-black disabled:opacity-40"
        >
          Convidar
        </button>
      </div>
      {recado && <span className="text-xs font-semibold opacity-75">{recado}</span>}
      <span className="text-xs opacity-60">
        A peça só vale onde a loja aceitar. Ela decide, e pode sair quando quiser —{" "}
        {/* A pergunta é sobre o número, não sobre o texto. Isto já comparou com
            a string "R$ 0,00" e nunca batia: o `Intl` separa o símbolo do valor
            com espaço não-quebrável, então um programa sem teto anunciava um
            teto de zero para a vizinha que ia decidir se entrava. */}
        {programa.tetoCentavos > 0
          ? `o desconto dela é limitado a ${formatarCentavos(programa.tetoCentavos)}.`
          : "o desconto sai do caixa dela."}
      </span>
    </div>
  );
};
