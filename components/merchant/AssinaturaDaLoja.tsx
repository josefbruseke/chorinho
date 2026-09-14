"use client";

import { useEffect, useState } from "react";
import { EnvelopeIcon, GiftIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { formatarCentavos } from "~~/utils/dinheiro";

type Plano = { nome: string; terminaisDe: number; terminaisAte: number | null; centavosPorMes: number };

type Dados = {
  loja: { nome: string };
  planos: readonly Plano[];
  // Nasce junto com a cobrança: enquanto não há onde guardar pagamento, não há
  // assinatura para mostrar — nem ativa, nem vencida.
  assinatura: null;
  motivo: string | null;
};

const terminais = (quantos: number) => `${quantos} ${quantos === 1 ? "terminal" : "terminais"}`;

/** A faixa dita em balcões, que é como o lojista conta os caixas dele. */
const faixaEmTexto = (p: Plano) => {
  if (p.terminaisAte === null) return `${terminais(p.terminaisDe)} ou mais no balcão`;
  if (p.terminaisDe === p.terminaisAte) return `${terminais(p.terminaisDe)} no balcão`;
  return `de ${p.terminaisDe} a ${terminais(p.terminaisAte)} no balcão`;
};

/**
 * O preço do Chorinho e o que muda quando a assinatura vence.
 *
 * O preço é um só, medido em terminais: nenhum prêmio, peça ou conquista fica
 * trancado atrás de faixa. O contrário obrigaria o lojista a descobrir no meio
 * do expediente que o plano dele não entrega o que ele já prometeu ao cliente.
 *
 * A outra metade da tela é a consequência do vencimento — o balcão para de dar
 * carimbo novo, mas nenhum prêmio já conquistado deixa de ser entregue. O
 * lojista precisa ler isso antes de vencer, não depois.
 */
export const AssinaturaDaLoja = () => {
  const [dados, setDados] = useState<Dados>();
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    fetch("/api/merchant/assinatura")
      .then(async r => {
        const corpo = await r.json();
        if (!r.ok) {
          setErro(r.status === 401 ? "Entre com a conta da loja." : (corpo?.erro ?? "não foi possível carregar"));
          return;
        }
        setDados(corpo);
      })
      .catch(() => setErro("Sem conexão."));
  }, []);

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

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Assinatura</h1>
        <p className="m-0 mt-1 text-sm opacity-75">O plano de {dados.loja.nome} no Chorinho.</p>
      </header>

      {/* Fundo neutro, e não de alerta: não há nada quebrado aqui para o
          lojista esperar voltar. A cobrança simplesmente ainda não começou. */}
      {dados.motivo && (
        <p className="m-0 flex items-start gap-2 rounded-2xl border border-base-300 bg-base-200 p-4 text-sm">
          <InformationCircleIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            Ainda não há assinatura para mostrar: {dados.motivo}. Ninguém está sendo cobrado, e o balcão da sua loja
            funciona igual. Os preços abaixo são os que vão valer quando a cobrança entrar no ar.
          </span>
        </p>
      )}

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="m-0 font-serif text-lg font-black text-secondary">O preço</h2>
          <p className="m-0 mt-1 text-sm opacity-75">
            É um produto só, e ele custa por terminal. Nada fica trancado atrás de plano: a padaria de um caixa tem as
            mesmas peças, prêmios e conquistas que a rede de dez. O que cresce com o tamanho da loja é quantos balcões
            carimbam ao mesmo tempo.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {dados.planos.map(p => (
            <div key={p.nome} className="flex flex-col gap-1 rounded-2xl border border-base-300 bg-base-100 p-4">
              <strong className="text-base text-secondary">{p.nome}</strong>
              <span className="text-sm opacity-70">{faixaEmTexto(p)}</span>
              <span className="mt-1 font-mono text-2xl font-black leading-none text-secondary">
                {formatarCentavos(p.centavosPorMes)}
                <span className="font-sans text-sm font-bold opacity-60"> por mês</span>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-200 p-5">
        <h2 className="m-0 flex items-center gap-2 font-serif text-lg font-black text-secondary">
          <GiftIcon className="h-5 w-5" />O que vai acontecer quando vencer
        </h2>
        <p className="m-0 text-sm leading-relaxed opacity-80">
          Quando a cobrança entrar no ar e uma assinatura vencer, o balcão para de{" "}
          <strong className="text-secondary">emitir carimbo novo</strong> — a venda deixa de somar na cartela. Mas
          nenhum prêmio já conquistado é perdido: a loja continua <strong className="text-secondary">entregando</strong>{" "}
          as recompensas que o cliente juntou antes do vencimento. É proposital — quem já ganhou, recebe.
        </p>
      </section>

      <a href="mailto:parceiros@chorinho.app" className="btn btn-primary h-14 w-fit gap-1.5 rounded-2xl font-black">
        <EnvelopeIcon className="h-5 w-5" />
        Falar com a gente
      </a>
    </div>
  );
};
