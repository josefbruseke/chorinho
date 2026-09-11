"use client";

import { useCallback, useEffect, useState } from "react";
import { notification } from "~~/utils/scaffold-eth";

type TipoDePonto = {
  id: string;
  nome: string;
  escopo: string;
  escopoId: string;
  ativo: boolean;
};

const ESCOPOS = ["Global", "Cidade", "Região", "Bairro", "Categoria", "Estabelecimento"] as const;

const FORM_VAZIO = { id: "", nome: "", escopo: "Estabelecimento" as (typeof ESCOPOS)[number], escopoId: "0" };

/**
 * O catálogo de tipos de ponto da rede. Cada linha é uma classe de ponto
 * separada da cadeia (ERC1155 id), com alcance próprio: da cidade inteira até
 * uma única loja.
 */
export const TiposDePonto = () => {
  const [tipos, setTipos] = useState<TipoDePonto[]>();
  const [indisponivel, setIndisponivel] = useState(false);
  const [erro, setErro] = useState<string>();
  const [alterando, setAlterando] = useState<string>();
  const [form, setForm] = useState(FORM_VAZIO);
  const [criando, setCriando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch("/api/admin/pontos");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar os tipos de ponto");
      return;
    }
    setErro(undefined);
    const corpo = (await r.json()) as { tipos: TipoDePonto[]; indisponivel: boolean };
    setTipos(corpo.tipos);
    setIndisponivel(corpo.indisponivel);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const alternar = async (tipo: TipoDePonto) => {
    setAlterando(tipo.id);
    try {
      const r = await fetch("/api/admin/pontos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: tipo.id, ativo: !tipo.ativo }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo?.erro ?? "a rede recusou a alteração");
      notification.success(`Ponto ${tipo.nome} agora está ${tipo.ativo ? "desativado" : "ativo"}.`);
      await carregar();
    } catch (e) {
      notification.error(e instanceof Error ? e.message : "falha ao alterar o tipo de ponto");
    } finally {
      setAlterando(undefined);
    }
  };

  const criar = async () => {
    setCriando(true);
    try {
      const r = await fetch("/api/admin/pontos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(corpo?.erro ?? "a rede recusou a criação");
      notification.success(`Tipo de ponto "${form.nome}" criado.`);
      setForm(FORM_VAZIO);
      await carregar();
    } catch (e) {
      notification.error(e instanceof Error ? e.message : "falha ao criar o tipo de ponto");
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Tipos de ponto</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          A moeda de fidelidade compartilhada da rede — cada tipo é uma classe própria, com alcance da cidade inteira
          até uma única loja.
        </p>
      </header>

      <p className="m-0 rounded-2xl border border-dashed border-kraft-edge bg-kraft p-4 text-sm text-kraft-ink">
        O id 1 é o <strong>Ponto da Cidade</strong>, criado no deploy da rede — não recrie nem desative sem um motivo
        forte, todo cliente que já acumulou depende dele. Ponto é intransferível por desenho: o contrato recusa qualquer
        transferência entre carteiras, então só existe para ser trocado por recompensa no balcão.
      </p>

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>}

      {indisponivel && !erro && (
        <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">
          Sem conexão com a rede agora — o catálogo e as ações abaixo ficam indisponíveis até o RPC voltar.
        </p>
      )}

      {!tipos && !erro ? (
        <div className="flex justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        tipos && (
          <section className="overflow-x-auto rounded-2xl border border-base-300">
            <table className="table table-sm m-0 bg-base-100">
              <thead>
                <tr className="text-xs uppercase tracking-wide">
                  <th>Id</th>
                  <th>Nome</th>
                  <th>Escopo</th>
                  <th>Id do escopo</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tipos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm opacity-70">
                      Nenhum tipo de ponto encontrado na rede.
                    </td>
                  </tr>
                ) : (
                  tipos.map(tipo => (
                    <tr key={tipo.id}>
                      <td className="font-mono font-black text-secondary">{tipo.id}</td>
                      <td className="font-bold">{tipo.nome}</td>
                      <td className="text-xs">{tipo.escopo}</td>
                      <td className="font-mono text-xs opacity-75">{tipo.escopoId}</td>
                      <td>
                        <span
                          className={`text-xs font-bold uppercase tracking-wide ${tipo.ativo ? "text-success" : "opacity-50"}`}
                        >
                          {tipo.ativo ? "Ativo" : "Desativado"}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          disabled={indisponivel || alterando === tipo.id}
                          onClick={() => alternar(tipo)}
                          className="btn btn-ghost btn-sm min-h-12 rounded-xl px-3 font-bold"
                        >
                          {alterando === tipo.id ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : tipo.ativo ? (
                            "Desativar"
                          ) : (
                            "Ativar"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-5">
        <h2 className="m-0 font-serif text-lg font-black text-secondary">Criar tipo de ponto</h2>
        <form
          onSubmit={e => {
            e.preventDefault();
            void criar();
          }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <label className="flex flex-col gap-1 text-sm font-bold">
            Id na cadeia
            <input
              type="number"
              min={2}
              required
              disabled={indisponivel}
              value={form.id}
              onChange={e => setForm({ ...form, id: e.target.value })}
              placeholder="ex.: 101"
              className="input input-bordered h-12 rounded-xl font-mono"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold">
            Nome
            <input
              type="text"
              required
              maxLength={32}
              disabled={indisponivel}
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="ex.: Ponto Padaria do Zé"
              className="input input-bordered h-12 rounded-xl"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold">
            Escopo
            <select
              disabled={indisponivel}
              value={form.escopo}
              onChange={e => setForm({ ...form, escopo: e.target.value as (typeof ESCOPOS)[number] })}
              className="select select-bordered h-12 rounded-xl"
            >
              {ESCOPOS.map(escopo => (
                <option key={escopo} value={escopo}>
                  {escopo}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm font-bold">
            Id do escopo
            <input
              type="number"
              min={0}
              disabled={indisponivel}
              value={form.escopoId}
              onChange={e => setForm({ ...form, escopoId: e.target.value })}
              placeholder="0 para Global"
              className="input input-bordered h-12 rounded-xl font-mono"
            />
          </label>

          <button
            type="submit"
            disabled={indisponivel || criando}
            className="btn btn-primary sm:col-span-2 h-14 rounded-2xl text-base font-bold"
          >
            {criando ? <span className="loading loading-spinner" /> : "Criar tipo de ponto"}
          </button>
        </form>
      </section>
    </div>
  );
};
