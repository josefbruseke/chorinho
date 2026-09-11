"use client";

import { useCallback, useEffect, useState } from "react";

type DiaDaSemana = "dom" | "seg" | "ter" | "qua" | "qui" | "sex" | "sab";

type HorarioDoDia = { abre: string; fecha: string; fechado: boolean };

type Horarios = Record<DiaDaSemana, HorarioDoDia>;

/** O formato que a rota devolve — colunas cruas de `establishments`. */
type Loja = {
  name: string;
  description: string | null;
  address_line: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  whatsapp: string | null;
  opening_hours: unknown;
  lat: number | null;
  lng: number | null;
};

/**
 * O estado do formulário usa as mesmas chaves que a rota aceita no PATCH —
 * assim salvar é só `JSON.stringify(formulario)`, sem tradução no meio.
 */
type Formulario = {
  name: string;
  description: string;
  address_line: string;
  neighborhood: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  whatsapp: string;
  opening_hours: Horarios;
  /** Guardadas como texto porque o campo é digitado; viram número só no envio. */
  lat: string;
  lng: string;
};

const DIAS: { chave: DiaDaSemana; rotulo: string }[] = [
  { chave: "dom", rotulo: "Domingo" },
  { chave: "seg", rotulo: "Segunda-feira" },
  { chave: "ter", rotulo: "Terça-feira" },
  { chave: "qua", rotulo: "Quarta-feira" },
  { chave: "qui", rotulo: "Quinta-feira" },
  { chave: "sex", rotulo: "Sexta-feira" },
  { chave: "sab", rotulo: "Sábado" },
];

/** Sete dias fechados — o ponto de partida antes de a loja preencher a agenda real. */
const horariosPadrao = (): Horarios =>
  DIAS.reduce((acc, { chave }) => {
    acc[chave] = { abre: "", fecha: "", fechado: true };
    return acc;
  }, {} as Horarios);

/**
 * O horário vem do banco como JSON livre. Se a loja nunca preencheu, ou o
 * formato mudar um dia, caímos nos sete dias fechados em vez de quebrar a
 * tela — o mesmo raciocínio de tolerância que a rota aplica ao validar.
 */
const normalizarHorarios = (bruto: unknown): Horarios => {
  const padrao = horariosPadrao();
  if (typeof bruto !== "object" || bruto === null) return padrao;

  const objeto = bruto as Record<string, unknown>;
  for (const { chave } of DIAS) {
    const entrada = objeto[chave];
    if (typeof entrada !== "object" || entrada === null) continue;
    const { abre, fecha, fechado } = entrada as Record<string, unknown>;
    padrao[chave] = {
      abre: typeof abre === "string" ? abre : "",
      fecha: typeof fecha === "string" ? fecha : "",
      fechado: typeof fechado === "boolean" ? fechado : true,
    };
  }
  return padrao;
};

const paraFormulario = (loja: Loja): Formulario => ({
  name: loja.name ?? "",
  description: loja.description ?? "",
  address_line: loja.address_line ?? "",
  neighborhood: loja.neighborhood ?? "",
  city: loja.city ?? "",
  state: loja.state ?? "",
  postal_code: loja.postal_code ?? "",
  phone: loja.phone ?? "",
  whatsapp: loja.whatsapp ?? "",
  opening_hours: normalizarHorarios(loja.opening_hours),
  lat: loja.lat === null || loja.lat === undefined ? "" : String(loja.lat),
  lng: loja.lng === null || loja.lng === undefined ? "" : String(loja.lng),
});

/** Junta os pedaços do endereço num texto só, para o aviso de posição no mapa. */
const enderecoCompleto = (f: Formulario) =>
  [f.address_line, f.neighborhood, [f.city, f.state].filter(Boolean).join(" - "), f.postal_code]
    .filter(parte => parte.trim().length > 0)
    .join(", ");

type EstadoDeSalvamento = "ocioso" | "salvando" | "salvo";

const Rotulo = ({ children, erro }: { children: React.ReactNode; erro?: string }) => (
  <div className="flex items-baseline justify-between gap-2">
    <span className="text-sm font-bold text-secondary">{children}</span>
    {erro && <span className="text-xs font-semibold text-error">{erro}</span>}
  </div>
);

/**
 * Os dados editáveis da loja: identidade, endereço, contato e horário.
 *
 * A posição no mapa é gravada como par de coordenadas. Não é o jeito mais
 * bonito de pedir isso — o certo seria arrastar um pino — mas é o jeito que
 * funciona hoje, e um campo feio que grava vale mais que um mapa bonito que
 * manda o lojista "falar com a equipe".
 */
export const DadosDaLoja = () => {
  const [formulario, setFormulario] = useState<Formulario>();
  const [estado, setEstado] = useState<EstadoDeSalvamento>("ocioso");
  const [erroGeral, setErroGeral] = useState<string>();
  const [erros, setErros] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    const r = await fetch("/api/merchant/loja");
    if (!r.ok) {
      const corpo = await r.json().catch(() => ({}));
      setErroGeral(corpo?.erro ?? "não foi possível carregar a loja");
      return;
    }
    setErroGeral(undefined);
    const corpo = await r.json();
    setFormulario(paraFormulario(corpo.loja));
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const campo = <K extends keyof Omit<Formulario, "opening_hours">>(chave: K, valor: Formulario[K]) => {
    setFormulario(atual => (atual ? { ...atual, [chave]: valor } : atual));
    setEstado("ocioso");
  };

  const horario = (dia: DiaDaSemana, valor: Partial<HorarioDoDia>) => {
    setFormulario(atual =>
      atual
        ? { ...atual, opening_hours: { ...atual.opening_hours, [dia]: { ...atual.opening_hours[dia], ...valor } } }
        : atual,
    );
    setEstado("ocioso");
  };

  const salvar = async () => {
    if (!formulario) return;
    setEstado("salvando");
    setErroGeral(undefined);
    setErros({});
    try {
      const r = await fetch("/api/merchant/loja", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        // As coordenadas só vão quando as duas estão preenchidas: meia posição
        // é um pino no lugar errado, que é pior que nenhum pino.
        body: JSON.stringify({
          ...formulario,
          lat: formulario.lat.trim() ? Number(formulario.lat.replace(",", ".")) : undefined,
          lng: formulario.lng.trim() ? Number(formulario.lng.replace(",", ".")) : undefined,
        }),
      });
      const corpo = await r.json().catch(() => ({}));
      if (!r.ok) {
        setEstado("ocioso");
        setErroGeral(corpo?.erro ?? "não foi possível salvar a loja");
        setErros(corpo?.campos ?? {});
        return;
      }
      if (corpo?.loja) setFormulario(paraFormulario(corpo.loja));
      setEstado("salvo");
    } catch {
      setEstado("ocioso");
      setErroGeral("não foi possível salvar a loja");
    }
  };

  if (erroGeral && !formulario) {
    return <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">{erroGeral}</p>;
  }

  if (!formulario) {
    return (
      <div className="flex justify-center py-16">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={e => {
        e.preventDefault();
        void salvar();
      }}
    >
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Minha loja</h1>
        <p className="m-0 mt-1 text-sm opacity-75">Os dados que aparecem para quem procura sua loja no Chorinho.</p>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
        <h2 className="m-0 text-sm font-bold uppercase tracking-wide opacity-70">Identidade</h2>

        <label className="flex flex-col gap-1.5">
          <Rotulo erro={erros.name}>Nome da loja</Rotulo>
          <input
            value={formulario.name}
            onChange={e => campo("name", e.target.value)}
            maxLength={80}
            className={`input input-bordered h-12 text-base ${erros.name ? "input-error" : ""}`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <Rotulo erro={erros.description}>Descrição</Rotulo>
          <textarea
            value={formulario.description}
            onChange={e => campo("description", e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="O que sua loja vende ou faz, numa frase que dá vontade de entrar."
            className={`textarea textarea-bordered min-h-24 text-base ${erros.description ? "textarea-error" : ""}`}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
        <h2 className="m-0 text-sm font-bold uppercase tracking-wide opacity-70">Endereço</h2>

        <label className="flex flex-col gap-1.5">
          <Rotulo erro={erros.address_line}>Rua e número</Rotulo>
          <input
            value={formulario.address_line}
            onChange={e => campo("address_line", e.target.value)}
            maxLength={120}
            className={`input input-bordered h-12 text-base ${erros.address_line ? "input-error" : ""}`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <Rotulo erro={erros.neighborhood}>Bairro</Rotulo>
          <input
            value={formulario.neighborhood}
            onChange={e => campo("neighborhood", e.target.value)}
            maxLength={60}
            className={`input input-bordered h-12 text-base ${erros.neighborhood ? "input-error" : ""}`}
          />
        </label>

        <div className="grid grid-cols-[1fr_5rem] gap-3">
          <label className="flex flex-col gap-1.5">
            <Rotulo erro={erros.city}>Cidade</Rotulo>
            <input
              value={formulario.city}
              onChange={e => campo("city", e.target.value)}
              maxLength={60}
              className={`input input-bordered h-12 text-base ${erros.city ? "input-error" : ""}`}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <Rotulo erro={erros.state}>UF</Rotulo>
            <input
              value={formulario.state}
              onChange={e => campo("state", e.target.value.toUpperCase())}
              maxLength={2}
              className={`input input-bordered h-12 text-base uppercase ${erros.state ? "input-error" : ""}`}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <Rotulo erro={erros.postal_code}>CEP</Rotulo>
          <input
            value={formulario.postal_code}
            onChange={e => campo("postal_code", e.target.value)}
            maxLength={9}
            inputMode="numeric"
            className={`input input-bordered h-12 max-w-40 text-base ${erros.postal_code ? "input-error" : ""}`}
          />
        </label>

        <div className="rounded-xl border border-dashed border-kraft-edge bg-kraft p-3 text-sm text-kraft-ink">
          <strong className="block text-secondary">Posição no mapa</strong>
          <p className="m-0 mt-1">{enderecoCompleto(formulario) || "Endereço ainda não preenchido."}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide opacity-80">Latitude</span>
              <input
                inputMode="decimal"
                value={formulario.lat}
                onChange={e => campo("lat", e.target.value)}
                placeholder="-23.5558"
                className={`input input-bordered h-12 w-36 font-mono text-base ${erros.lat ? "input-error" : ""}`}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wide opacity-80">Longitude</span>
              <input
                inputMode="decimal"
                value={formulario.lng}
                onChange={e => campo("lng", e.target.value)}
                placeholder="-46.6905"
                className={`input input-bordered h-12 w-36 font-mono text-base ${erros.lng ? "input-error" : ""}`}
              />
            </label>
          </div>
          <p className="m-0 mt-2 text-xs opacity-80">
            Abra o endereço no Google Maps, clique com o botão direito sobre a porta da loja e copie os dois números que
            aparecem. As duas coordenadas precisam ser salvas juntas.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
        <h2 className="m-0 text-sm font-bold uppercase tracking-wide opacity-70">Contato</h2>

        <label className="flex flex-col gap-1.5">
          <Rotulo erro={erros.phone}>Telefone</Rotulo>
          <input
            type="tel"
            value={formulario.phone}
            onChange={e => campo("phone", e.target.value)}
            maxLength={20}
            placeholder="(11) 4002-8922"
            className={`input input-bordered h-12 text-base ${erros.phone ? "input-error" : ""}`}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <Rotulo erro={erros.whatsapp}>WhatsApp</Rotulo>
          <input
            type="tel"
            value={formulario.whatsapp}
            onChange={e => campo("whatsapp", e.target.value)}
            maxLength={20}
            placeholder="(11) 90000-0000"
            className={`input input-bordered h-12 text-base ${erros.whatsapp ? "input-error" : ""}`}
          />
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-4">
        <h2 className="m-0 text-sm font-bold uppercase tracking-wide opacity-70">Horário de funcionamento</h2>
        {erros.opening_hours && <p className="m-0 text-xs font-semibold text-error">{erros.opening_hours}</p>}

        <div className="flex flex-col gap-2">
          {DIAS.map(({ chave, rotulo }) => {
            const dia = formulario.opening_hours[chave];
            return (
              <div key={chave} className="rounded-xl border border-base-300 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-secondary">{rotulo}</span>
                  <label className="flex min-h-12 items-center gap-2 text-sm font-semibold">
                    <input
                      type="checkbox"
                      checked={dia.fechado}
                      onChange={e => horario(chave, { fechado: e.target.checked })}
                      className="checkbox checkbox-sm"
                    />
                    Fechado
                  </label>
                </div>

                {!dia.fechado && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="time"
                      value={dia.abre}
                      onChange={e => horario(chave, { abre: e.target.value })}
                      aria-label={`${rotulo}: horário de abertura`}
                      className="input input-bordered h-12 flex-1 text-base"
                    />
                    <span className="text-sm opacity-60">até</span>
                    <input
                      type="time"
                      value={dia.fecha}
                      onChange={e => horario(chave, { fecha: e.target.value })}
                      aria-label={`${rotulo}: horário de fechamento`}
                      className="input input-bordered h-12 flex-1 text-base"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {erroGeral && (
        <p className="m-0 rounded-2xl border border-warning bg-warning/10 p-3 text-sm font-semibold">{erroGeral}</p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={estado === "salvando"}
          className="btn btn-primary h-14 rounded-2xl px-8 font-black disabled:opacity-60"
        >
          {estado === "salvando" ? "Salvando…" : "Salvar dados da loja"}
        </button>
        {estado === "salvo" && <span className="text-sm font-semibold text-success">Salvo.</span>}
      </div>
    </form>
  );
};
