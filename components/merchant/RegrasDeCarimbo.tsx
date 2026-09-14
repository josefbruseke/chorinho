"use client";

import { useEffect, useState } from "react";
import { EnvelopeIcon, InformationCircleIcon } from "@heroicons/react/24/outline";

type Regra = {
  // Sempre ligada hoje: a regra é a mesma para todo mundo, e não existe onde
  // uma loja a desligaria.
  ativa: boolean;
  intervaloSegundos: number;
  janelaDaSequenciaSegundos: number;
  pontosPorCarimbo: number;
};

const HORA = 60 * 60;
const DIA = 24 * HORA;
const SEMANA = 7 * DIA;

/** Segundos viram a palavra que o lojista usaria: "1 semana", "6 horas". */
const duracaoEmTexto = (segundos: number) => {
  if (segundos <= 0) return "sem espera";
  if (segundos % SEMANA === 0) {
    const semanas = segundos / SEMANA;
    return `${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
  }
  if (segundos % DIA === 0) {
    const dias = segundos / DIA;
    return `${dias} ${dias === 1 ? "dia" : "dias"}`;
  }
  if (segundos % HORA === 0) {
    const horas = segundos / HORA;
    return `${horas} ${horas === 1 ? "hora" : "horas"}`;
  }
  const minutos = Math.round(segundos / 60);
  return `${minutos} ${minutos === 1 ? "minuto" : "minutos"}`;
};

/**
 * A regra de carimbo que vale no balcão.
 *
 * A tela só lê. Enquanto a regra for a mesma para todas as lojas, um formulário
 * aqui seria pior do que a falta dele: o lojista escolheria, veria "salvo" e o
 * caixa continuaria fazendo outra coisa — e ele só descobriria a diferença com
 * um cliente reclamando na frente.
 */
export const RegrasDeCarimbo = () => {
  const [regra, setRegra] = useState<Regra>();
  const [loja, setLoja] = useState<string>();
  const [motivo, setMotivo] = useState<string>();
  const [erro, setErro] = useState<string>();

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
        setRegra(corpo.regra);
      })
      .catch(() => setErro("Sem conexão."));
  }, []);

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

  const semEspera = regra.intervaloSegundos <= 0;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Regra de carimbo</h1>
        <p className="m-0 mt-1 text-sm opacity-75">
          {loja ? `${loja} — ` : ""}quem passa no balcão ganha um carimbo. O valor da compra não entra na conta. Abaixo
          está, em números, o que o seu caixa faz hoje.
        </p>
      </header>

      {/* Fundo neutro, e não de alerta: nada aqui está fora do ar — só ainda
          não chegou a vez de cada loja ter a sua regra. */}
      {motivo && (
        <p className="m-0 flex items-start gap-2 rounded-2xl border border-base-300 bg-base-200 p-4 text-sm">
          <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{motivo} Se a sua loja precisar de uma regra diferente, fale com a gente.</span>
        </p>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border border-base-300 bg-base-100 p-5">
        <Campo
          rotulo="Intervalo entre carimbos do mesmo cliente"
          ajuda={
            semEspera
              ? "Não há espera: quem voltar no mesmo dia ganha o carimbo do mesmo jeito."
              : "Quanto tempo o balcão espera antes de carimbar a mesma pessoa de novo."
          }
        >
          {duracaoEmTexto(regra.intervaloSegundos)}
        </Campo>

        <Campo rotulo="Janela da sequência" ajuda="Quanto tempo o cliente tem para voltar sem perder a sequência.">
          {duracaoEmTexto(regra.janelaDaSequenciaSegundos)}
        </Campo>

        <Campo rotulo="Pontos da cidade por carimbo" ajuda="Pontos valem em qualquer loja do Chorinho, não só na sua.">
          {`${regra.pontosPorCarimbo} pontos`}
        </Campo>
      </section>

      <section className="rounded-2xl border border-base-300 bg-kraft p-5">
        <h2 className="m-0 text-xs font-bold uppercase tracking-wide text-kraft-ink">Como fica no balcão</h2>
        <p className="m-0 mt-2 text-sm leading-relaxed opacity-80">
          O caixa lê o passe e o carimbo cai — não digita valor nenhum.{" "}
          {semEspera
            ? "A mesma pessoa pode ser carimbada de novo logo em seguida; quem controla isso é quem está atendendo."
            : "Se a mesma pessoa voltar antes do intervalo acima, o balcão recusa o segundo carimbo e mostra quanto falta."}
        </p>
      </section>

      <a href="mailto:parceiros@chorinho.app" className="btn btn-primary h-14 w-fit gap-1.5 rounded-2xl font-black">
        <EnvelopeIcon className="h-5 w-5" />
        Falar com a gente
      </a>
    </div>
  );
};

const Campo = ({ rotulo, ajuda, children }: { rotulo: string; ajuda: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5 border-b border-base-300 pb-4 last:border-0 last:pb-0">
    <span className="text-sm font-bold text-secondary">{rotulo}</span>
    <strong className="text-lg font-black text-secondary">{children}</strong>
    <span className="text-xs opacity-70">{ajuda}</span>
  </div>
);
