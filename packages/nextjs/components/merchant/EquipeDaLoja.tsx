"use client";

import { useCallback, useEffect, useState } from "react";
import { InformationCircleIcon, ShieldCheckIcon, UserMinusIcon, UserPlusIcon } from "@heroicons/react/24/outline";
import type { Enums } from "~~/services/database/types";

type Papel = Enums<"papel_membro">;

type Membro = {
  id: string;
  nome: string | null;
  email: string | null;
  papel: Papel;
  ativo: boolean;
  souEu: boolean;
};

type Dados = { loja: { nome: string }; meuPapel: Papel; membros: Membro[] };

const PAPEL_LEGIVEL: Record<Papel, string> = { owner: "Dono", manager: "Gerente", operator: "Atendente" };

/**
 * A equipe que administra o painel desta loja.
 *
 * Não é a mesma coisa que quem carimba no balcão: atendente de caixa não
 * precisa de conta nenhuma quando usa um terminal pareado. Aqui só entra
 * quem vai de fato abrir o painel e fazer login.
 */
export const EquipeDaLoja = () => {
  const [dados, setDados] = useState<Dados>();
  const [erro, setErro] = useState<string>();
  const [email, setEmail] = useState("");
  const [papelNovo, setPapelNovo] = useState<Papel>("operator");
  const [enviando, setEnviando] = useState(false);
  const [processando, setProcessando] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/equipe");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar a equipe");
      return;
    }
    setErro(undefined);
    setDados(await r.json());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const adicionar = async () => {
    setEnviando(true);
    setErro(undefined);
    try {
      const r = await fetch("/api/merchant/equipe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, papel: papelNovo }),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível adicionar");
        return;
      }
      setEmail("");
      setPapelNovo("operator");
      await carregar();
    } finally {
      setEnviando(false);
    }
  };

  const mudar = async (membro: Membro, mudanca: { papel?: Papel; ativo?: boolean }) => {
    setProcessando(membro.id);
    setErro(undefined);
    try {
      const r = await fetch(`/api/merchant/equipe/${membro.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mudanca),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível atualizar");
        return;
      }
      await carregar();
    } finally {
      setProcessando(undefined);
    }
  };

  const desativar = async (membro: Membro) => {
    const rotulo = membro.nome ?? membro.email ?? "este membro";
    if (!window.confirm(`Desativar ${rotulo}? A pessoa perde o acesso ao painel imediatamente.`)) return;

    setProcessando(membro.id);
    setErro(undefined);
    try {
      const r = await fetch(`/api/merchant/equipe/${membro.id}`, { method: "DELETE" });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível desativar");
        return;
      }
      await carregar();
    } finally {
      setProcessando(undefined);
    }
  };

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

  const souDono = dados.meuPapel === "owner";

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Equipe do painel</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          Quem entra em {dados.loja.nome} para configurar regra, recompensa e conferir relatório.
        </p>
      </header>

      <p className="m-0 flex items-start gap-2 rounded-2xl border border-base-300 bg-base-200 p-4 text-sm opacity-80">
        <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-brand-ink" />
        Atendente de balcão não precisa de conta nenhuma: quem carimba no dia a dia usa um terminal pareado em{" "}
        <span className="font-semibold text-secondary">/painel/pdv</span>. Cadastre alguém aqui só se essa pessoa também
        vai abrir este painel.
      </p>

      <form
        className="flex flex-col gap-2 rounded-2xl border border-base-300 bg-base-100 p-4 sm:flex-row"
        onSubmit={e => {
          e.preventDefault();
          if (email.trim().includes("@")) void adicionar();
        }}
      >
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="e-mail de quem vai administrar"
          aria-label="E-mail para adicionar"
          className="input input-bordered h-12 flex-1 text-base"
        />
        <select
          value={papelNovo}
          onChange={e => setPapelNovo(e.target.value as Papel)}
          aria-label="Papel da nova pessoa"
          className="select select-bordered h-12"
        >
          <option value="operator">Atendente</option>
          <option value="manager" disabled={!souDono}>
            Gerente{!souDono ? " (só o dono adiciona)" : ""}
          </option>
        </select>
        <button
          type="submit"
          disabled={!email.trim().includes("@") || enviando}
          className="btn btn-primary h-14 gap-1.5 rounded-2xl font-black disabled:opacity-40"
        >
          <UserPlusIcon className="h-5 w-5" />
          Adicionar
        </button>
      </form>

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erro}</p>}

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {dados.membros.map(m => {
          const nivelAlto = m.papel === "owner" || m.papel === "manager";
          // Regra de segurança em duas camadas, espelhando a rota: ninguém
          // mexe no próprio papel, e só o dono mexe em dono ou gerente.
          const podeMexer = !m.souEu && (souDono || !nivelAlto);
          const podeEditarPapel = podeMexer && m.papel !== "owner";

          return (
            <li
              key={m.id}
              className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 sm:flex-row sm:items-center"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  m.ativo ? "bg-primary/10 text-brand-ink" : "bg-base-200 text-base-content/50"
                }`}
              >
                <ShieldCheckIcon className="h-6 w-6" />
              </span>

              <div className="min-w-0 flex-1">
                <strong className="block truncate text-base text-secondary">
                  {m.nome ?? m.email ?? "conta sem nome"}
                  {m.souEu && <span className="ml-2 text-xs font-semibold opacity-60">(você)</span>}
                </strong>
                <span className="block truncate text-xs opacity-70">
                  {m.email ?? "e-mail indisponível"}
                  {!m.ativo && " — inativo"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {podeEditarPapel ? (
                  <select
                    value={m.papel}
                    disabled={processando === m.id}
                    onChange={e => void mudar(m, { papel: e.target.value as Papel })}
                    aria-label={`Papel de ${m.nome ?? m.email ?? "membro"}`}
                    className="select select-bordered h-12 text-sm"
                  >
                    <option value="manager" disabled={!souDono}>
                      Gerente
                    </option>
                    <option value="operator">Atendente</option>
                  </select>
                ) : (
                  <span className="badge badge-lg h-12 rounded-xl px-4 font-bold">{PAPEL_LEGIVEL[m.papel]}</span>
                )}

                {podeMexer &&
                  (m.ativo ? (
                    <button
                      type="button"
                      onClick={() => void desativar(m)}
                      disabled={processando === m.id}
                      aria-label={`Desativar ${m.nome ?? m.email ?? "membro"}`}
                      className="btn btn-ghost btn-sm h-12 w-12 rounded-xl text-error"
                    >
                      <UserMinusIcon className="h-5 w-5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void mudar(m, { ativo: true })}
                      disabled={processando === m.id}
                      className="btn btn-ghost btn-sm h-12 rounded-xl font-bold text-success"
                    >
                      Reativar
                    </button>
                  ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
