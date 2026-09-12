"use client";

import { useEffect, useState } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

type Regra = {
  ativa: boolean;
  intervaloSegundos: number;
  janelaDaSequenciaSegundos: number;
  pontosPorCarimbo: number;
};

const PADRAO: Regra = {
  ativa: true,
  intervaloSegundos: 0,
  janelaDaSequenciaSegundos: 7 * 24 * 60 * 60,
  pontosPorCarimbo: 10,
};

const JANELAS = [
  { valor: 3 * 24 * 60 * 60, rotulo: "3 dias" },
  { valor: 7 * 24 * 60 * 60, rotulo: "1 semana" },
  { valor: 15 * 24 * 60 * 60, rotulo: "15 dias" },
  { valor: 30 * 24 * 60 * 60, rotulo: "1 mês" },
];

const INTERVALOS = [
  { valor: 0, rotulo: "Sem intervalo" },
  { valor: 300, rotulo: "5 minutos" },
  { valor: 3600, rotulo: "1 hora" },
  { valor: 6 * 3600, rotulo: "6 horas" },
  { valor: 24 * 3600, rotulo: "1 dia" },
];

/**
 * A regra de carimbo da loja.
 *
 * É a decisão comercial mais importante do lojista, e a que ele mais erra
 * quando a tela não ajuda: piso baixo demais transforma cafezinho de R$ 3 em
 * carimbo e o programa não se paga. Por isso a tela mostra o resultado em
 * dinheiro, com exemplos, em vez de pedir números soltos.
 */
export const RegrasDeCarimbo = () => {
  const [regra, setRegra] = useState<Regra>();
  const [loja, setLoja] = useState<string>();
  const [motivo, setMotivo] = useState<string>();
  const [erro, setErro] = useState<string>();
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    fetch("/api/merchant/regras")
      .then(async r => {
        const corpo = await r.json();
        if (!r.ok) {
          setErro(r.status === 401 ? "Entre com a conta da loja." : (corpo?.erro ?? "falha ao carregar"));
          return;
        }
        setLoja(corpo.loja?.nome);
        setMotivo(corpo.motivo);
        // Loja ainda sem regra na rede: abrimos com um padrão sensato em vez de
        // campos vazios, porque "R$ 10 por carimbo" é um começo defensável e
        // zero não é.
        setRegra(corpo.regra ?? PADRAO);
      })
      .catch(() => setErro("Sem conexão."));
  }, []);

  const salvar = async () => {
    if (!regra) return;
    setSalvando(true);
    setErro(undefined);
    setSalvo(false);
    try {
      const r = await fetch("/api/merchant/regras", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(regra),
      });
      const corpo = await r.json();
      if (!r.ok) {
        setErro(corpo?.erro ?? "não foi possível gravar");
        return;
      }
      setSalvo(true);
    } catch {
      setErro("Sem conexão. A regra não foi gravada.");
    } finally {
      setSalvando(false);
    }
  };

  if (erro && !regra) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erro}</p>;
  }

  if (!regra) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-brand-ink" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Regra de carimbo</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          {loja ? `${loja} — ` : ""}quem passa no balcão ganha um carimbo. O valor da compra não entra na conta; o que
          você decide aqui é de quanto em quanto tempo a mesma pessoa pode ser carimbada.
        </p>
      </header>

      {motivo && (
        <p className="m-0 inline-flex items-start gap-2 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-honey-ink" />
          {motivo}
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-100 p-5">
        <Campo
          rotulo="Intervalo entre carimbos do mesmo cliente"
          ajuda="Sem valor de compra, é isto que impede carimbar a mesma pessoa várias vezes seguidas."
        >
          <select
            value={regra.intervaloSegundos}
            onChange={e => setRegra({ ...regra, intervaloSegundos: Number(e.target.value) })}
            className="select select-bordered h-12 w-48 text-base"
          >
            {INTERVALOS.map(i => (
              <option key={i.valor} value={i.valor}>
                {i.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          rotulo="Janela da sequência"
          ajuda="Quanto tempo o cliente tem para voltar sem perder a sequência de visitas."
        >
          <select
            value={regra.janelaDaSequenciaSegundos}
            onChange={e => setRegra({ ...regra, janelaDaSequenciaSegundos: Number(e.target.value) })}
            className="select select-bordered h-12 w-48 text-base"
          >
            {JANELAS.map(j => (
              <option key={j.valor} value={j.valor}>
                {j.rotulo}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Pontos da cidade por carimbo" ajuda="Pontos valem em qualquer loja da rede, não só na sua.">
          <input
            type="number"
            min={0}
            max={10000}
            value={regra.pontosPorCarimbo}
            onChange={e => setRegra({ ...regra, pontosPorCarimbo: Number(e.target.value) })}
            className="input input-bordered h-12 w-32 font-mono text-lg font-bold"
          />
        </Campo>
      </section>

      <section className="rounded-2xl border border-base-300 bg-kraft p-5">
        <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-kraft-ink">Como fica no balcão</h2>
        <p className="m-0 mt-2 text-sm leading-relaxed opacity-80">
          O caixa lê o passe e o carimbo cai — não digita valor nenhum. Se a mesma pessoa voltar antes do intervalo
          acima, a rede recusa o segundo carimbo e o balcão mostra quanto falta.
        </p>
      </section>

      {erro && <p className="m-0 rounded-2xl border border-error bg-error/10 p-4 text-sm font-semibold">{erro}</p>}

      {salvo && (
        <p className="m-0 inline-flex items-center gap-2 rounded-2xl border border-success bg-success/10 p-4 text-sm font-bold text-success">
          <CheckCircleIcon className="h-5 w-5" />
          Regra gravada na rede. Já vale para a próxima venda.
        </p>
      )}

      <button
        type="button"
        onClick={salvar}
        disabled={salvando}
        className="btn btn-primary h-14 rounded-2xl text-lg font-black disabled:opacity-40"
      >
        {salvando ? <span className="loading loading-spinner loading-sm" /> : "Salvar regra"}
      </button>
    </div>
  );
};

const Campo = ({ rotulo, ajuda, children }: { rotulo: string; ajuda: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 border-b border-base-300 pb-4 last:border-0 last:pb-0">
    <span className="text-sm font-bold text-secondary">{rotulo}</span>
    {children}
    <span className="text-xs opacity-70">{ajuda}</span>
  </div>
);
