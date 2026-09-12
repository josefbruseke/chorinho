"use client";

import { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  DevicePhoneMobileIcon,
  PlusIcon,
  QrCodeIcon,
  SignalIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type Terminal = {
  id: string;
  nome: string;
  aparelho: string | null;
  pareadoEm: string | null;
  vistoEm: string | null;
  aguardandoPareamento: boolean;
  expirado: boolean;
  codigo: string | null;
  expiraEm: string | null;
};

const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

/**
 * Os aparelhos que carimbam nesta loja.
 *
 * O trabalho desta tela é instalar N tablets, não um. Antes ela era feita para
 * um: você criava o terminal, o código aparecia UMA vez numa faixa no topo, e
 * fechar a tela cedo demais custava uma vaga do plano — o único jeito de
 * recuperar era criar outro terminal.
 *
 * Agora o código mora na linha do próprio terminal enquanto o pareamento está
 * em aberto. O lojista cria os seis caixas de uma vez, anda pela loja com o
 * painel na mão e pareia um por um, lendo o QR da linha da vez com o tablet da
 * vez. Venceu o prazo, gera outro código sem perder o terminal nem o nome.
 */
export const TerminaisDePdv = () => {
  const [dados, setDados] = useState<{ loja: { nome: string; limite: number }; terminais: Terminal[] }>();
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string>();
  const [aberto, setAberto] = useState<string>();
  const [copiado, setCopiado] = useState<string>();

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/terminais");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível carregar os terminais");
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
    try {
      const r = await fetch("/api/merchant/terminais", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome }),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível criar o terminal");
        return;
      }
      setNome("");
      // Nasce com o pareamento aberto: quem acabou de criar quer parear.
      setAberto(corpo.id);
      await carregar();
    } finally {
      setCriando(false);
    }
  };

  const novoCodigo = async (id: string) => {
    setErro(undefined);
    const r = await fetch(`/api/merchant/terminais/${id}`, { method: "POST" });
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErro(corpo?.erro ?? "não foi possível gerar outro código");
      return;
    }
    setAberto(id);
    await carregar();
  };

  const remover = async (id: string, nomeDoTerminal: string) => {
    if (!window.confirm(`Desligar "${nomeDoTerminal}"? O aparelho para de carimbar imediatamente.`)) return;
    await fetch(`/api/merchant/terminais/${id}`, { method: "DELETE" });
    await carregar();
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

  const ativos = dados.terminais.length;
  const noLimite = ativos >= dados.loja.limite;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Terminais do balcão</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          {ativos} de {dados.loja.limite} aparelhos ativos. Cada caixa, tablet ou celular que carimba é um terminal.
        </p>
      </header>

      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={e => {
          e.preventDefault();
          if (!noLimite) void criar();
        }}
      >
        <input
          value={nome}
          onChange={e => setNome(e.target.value)}
          maxLength={40}
          placeholder={`Nome do terminal (vazio vira "Caixa ${ativos + 1}")`}
          aria-label="Nome do terminal"
          className="input input-bordered h-14 flex-1 text-base"
        />
        <button
          type="submit"
          disabled={criando || noLimite}
          className="btn btn-primary h-14 gap-1.5 rounded-2xl font-black disabled:opacity-40"
        >
          <PlusIcon className="h-5 w-5" />
          Novo terminal
        </button>
      </form>

      {erro && <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erro}</p>}

      {dados.terminais.length === 0 ? (
        <p className="m-0 rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70">
          Nenhum aparelho ligado ainda. Crie o primeiro terminal — o código aparece aqui mesmo, com um QR para o tablet
          ler.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dados.terminais.map(t => (
            <li key={t.id} className="flex flex-col rounded-2xl border border-base-300 bg-base-100">
              <div className="flex items-center gap-2 p-4">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    t.pareadoEm ? "bg-success/15 text-success" : "bg-base-200 text-base-content/70"
                  }`}
                >
                  {t.pareadoEm ? <SignalIcon className="h-6 w-6" /> : <DevicePhoneMobileIcon className="h-6 w-6" />}
                </span>

                <div className="min-w-0 flex-1">
                  <strong className="block truncate text-base text-secondary">{t.nome}</strong>
                  <span className="block text-xs opacity-70">
                    {t.pareadoEm
                      ? `último uso ${quando(t.vistoEm)}`
                      : t.aguardandoPareamento
                        ? "esperando o aparelho ler o código"
                        : "o código venceu"}
                  </span>
                </div>

                {t.aguardandoPareamento && (
                  <button
                    type="button"
                    onClick={() => setAberto(a => (a === t.id ? undefined : t.id))}
                    aria-expanded={aberto === t.id}
                    className="btn btn-primary btn-sm h-12 shrink-0 gap-1.5 rounded-xl font-bold"
                  >
                    <QrCodeIcon className="h-5 w-5" />
                    {aberto === t.id ? "Fechar" : "Parear"}
                  </button>
                )}

                {t.expirado && (
                  <button
                    type="button"
                    onClick={() => void novoCodigo(t.id)}
                    className="btn btn-secondary btn-sm h-12 shrink-0 gap-1.5 rounded-xl font-bold"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                    Novo código
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => void remover(t.id, t.nome)}
                  aria-label={`Desligar ${t.nome}`}
                  className="btn btn-ghost btn-sm h-12 w-12 shrink-0 rounded-xl text-error"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>

              {aberto === t.id && t.codigo && (
                <Pareamento
                  codigo={t.codigo}
                  expiraEm={t.expiraEm}
                  copiado={copiado === t.id}
                  aoCopiar={async () => {
                    await navigator.clipboard.writeText(t.codigo!);
                    setCopiado(t.id);
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * As três formas de ligar um aparelho, da mais curta para a mais longa.
 *
 * A primeira serve ao lojista que só tem um telefone: ele pareia o próprio
 * aparelho num toque. A segunda serve ao tablet do caixa, que não é onde o
 * painel está aberto — a câmera dele lê o QR e o balcão abre já pareado. A
 * terceira existe para quando a câmera não abre.
 */
const Pareamento = ({
  codigo,
  expiraEm,
  copiado,
  aoCopiar,
}: {
  codigo: string;
  expiraEm: string | null;
  copiado: boolean;
  aoCopiar: () => Promise<void>;
}) => {
  // Montada do `origin` do navegador, e não de um domínio escrito à mão: em
  // desenvolvimento o QR precisa apontar para o localhost de quem está
  // testando, e publicado, para o domínio de verdade.
  const url = `${typeof window === "undefined" ? "" : window.location.origin}/pdv?parear=${codigo}`;
  // A hora de vencimento, e não "faltam N minutos": o relógio corre e um
  // número relativo desenhado uma vez fica mentindo na tela. Também é o que
  // deixa esta função pura — ler `Date.now()` durante o render é justamente o
  // que o compilador do React recusa.
  const vence = expiraEm
    ? new Date(expiraEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col gap-4 border-t border-base-300 p-4">
      <a href={`/pdv?parear=${codigo}`} className="btn btn-primary h-14 gap-2 rounded-2xl font-black">
        <DevicePhoneMobileIcon className="h-5 w-5" />
        Usar este aparelho como balcão
      </a>

      <div className="flex flex-col items-center gap-2 rounded-2xl bg-qr-surface p-4">
        <span className="text-center text-xs font-bold uppercase tracking-wide text-qr-muted">
          Ou aponte a câmera do outro aparelho
        </span>
        <QRCodeSVG value={url} size={176} level="M" bgColor="#ffffff" fgColor="#261c14" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-wide opacity-70">Ou digite no aparelho</span>
          <p className="m-0 mt-0.5 font-mono text-2xl font-black tracking-[0.2em] text-secondary">{codigo}</p>
        </div>
        <button
          type="button"
          onClick={() => void aoCopiar()}
          className="btn btn-ghost h-12 gap-1.5 rounded-xl font-bold"
        >
          <ClipboardDocumentIcon className="h-5 w-5" />
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>

      <p className="m-0 text-xs opacity-65">
        {vence ? `Vale até ${vence}` : "Vale por pouco tempo"} e só funciona uma vez. Venceu, é só gerar outro — o
        terminal continua aqui.
      </p>
    </div>
  );
};
