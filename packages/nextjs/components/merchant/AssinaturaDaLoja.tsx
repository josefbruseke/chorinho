"use client";

import { useEffect, useState } from "react";
import { CheckIcon, ClockIcon, EnvelopeIcon, ExclamationTriangleIcon, GiftIcon } from "@heroicons/react/24/outline";

type Plano = { tier: number; nome: string; resumo: string; recursos: readonly string[] };
type Assinatura = { ativa: boolean; plano: number; venceEm: number } | null;
type Dados = { loja: { nome: string }; planos: readonly Plano[]; assinatura: Assinatura; motivo: string | null };

const DIA_EM_SEGUNDOS = 24 * 60 * 60;
const AVISO_DE_VENCIMENTO_EM_DIAS = 7;

const formatarData = (epochSegundos: number) =>
  new Date(epochSegundos * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

/**
 * O plano da loja e o que muda quando a assinatura vence.
 *
 * A parte que mais importa nesta tela não é o preço — ainda a combinar — é a
 * consequência do vencimento: o balcão para de dar carimbo novo, mas nenhum
 * prêmio já conquistado deixa de ser entregue. É uma decisão de produto
 * deliberada, e o lojista precisa ler isso antes de a assinatura vencer, não
 * depois.
 */
export const AssinaturaDaLoja = () => {
  const [dados, setDados] = useState<Dados>();
  const [erro, setErro] = useState<string>();
  const [agoraEmSegundos, setAgoraEmSegundos] = useState(0);

  useEffect(() => {
    fetch("/api/merchant/assinatura")
      .then(async r => {
        const corpo = await r.json();
        if (!r.ok) {
          setErro(r.status === 401 ? "Entre com a conta da loja." : (corpo?.erro ?? "não foi possível carregar"));
          return;
        }
        setDados(corpo);
        // O relógio é lido aqui, junto com a resposta, e não no render: chamar
        // `Date.now()` durante o render deixa o resultado dependente de quando
        // o React resolve re-renderizar — e o React Compiler recusa.
        setAgoraEmSegundos(Math.floor(Date.now() / 1000));
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

  const { assinatura, planos, motivo } = dados;
  const planoAtual = assinatura ? planos.find(p => p.tier === assinatura.plano) : undefined;
  const diasParaVencer =
    assinatura && assinatura.venceEm > 0 ? Math.floor((assinatura.venceEm - agoraEmSegundos) / DIA_EM_SEGUNDOS) : null;
  const vencimentoProximo =
    Boolean(assinatura?.ativa) && diasParaVencer !== null && diasParaVencer < AVISO_DE_VENCIMENTO_EM_DIAS;

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="m-0 font-serif text-2xl font-black text-secondary">Assinatura</h1>
        <p className="m-0 mt-1 text-sm opacity-75">O plano de {dados.loja.nome} no Chorinho.</p>
      </header>

      {motivo && (
        <p className="m-0 flex items-start gap-2 rounded-2xl border border-warning bg-warning/10 p-4 text-sm font-semibold">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0 text-honey-ink" />
          Não deu para consultar o estado da assinatura agora ({motivo}). Os planos abaixo continuam valendo — só a
          validade atual não está disponível nesta tela.
        </p>
      )}

      {assinatura && (
        <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-100 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-wide opacity-60">Plano atual</span>
              <p className="m-0 font-serif text-xl font-black text-secondary">
                {planoAtual?.nome ?? "Sem plano ativo"}
              </p>
            </div>
            <span
              className={`badge badge-lg h-8 rounded-xl px-3 font-bold ${assinatura.ativa ? "badge-success" : "badge-error"}`}
            >
              {assinatura.ativa ? "Ativa" : "Vencida"}
            </span>
          </div>

          <p className="m-0 flex items-center gap-2 text-sm opacity-80">
            <ClockIcon className="h-4 w-4 shrink-0" />
            {assinatura.venceEm === 0
              ? "Esta loja nunca teve uma assinatura registrada."
              : `${assinatura.ativa ? "Vale até" : "Venceu em"} ${formatarData(assinatura.venceEm)}.`}
          </p>

          {vencimentoProximo && (
            <p className="m-0 flex items-start gap-2 rounded-xl border border-warning bg-warning/10 p-3 text-sm font-semibold">
              <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-honey-ink" />
              Vence em {diasParaVencer} dia(s). Fale com a gente para o carimbo do balcão não parar.
            </p>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-2xl border border-base-300 bg-base-200 p-5">
        <h2 className="m-0 flex items-center gap-2 font-serif text-lg font-black text-secondary">
          <GiftIcon className="h-5 w-5" />O que acontece quando vence
        </h2>
        <p className="m-0 text-sm leading-relaxed opacity-80">
          Passada a validade, o balcão para de <strong className="text-secondary">emitir carimbo novo</strong> — a venda
          deixa de somar na cartela. Mas nenhum prêmio já conquistado é perdido: a loja continua{" "}
          <strong className="text-secondary">entregando</strong> as recompensas que o cliente já tinha juntado antes do
          vencimento. É proposital — quem já ganhou, recebe.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="m-0 font-serif text-lg font-black text-secondary">Planos</h2>
          <p className="m-0 mt-1 text-sm opacity-70">
            Preço ainda a combinar — a cobrança está em definição. Hoje a contratação e a troca de plano são feitas com
            a nossa equipe, não por esta tela.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {planos.map(p => (
            <div
              key={p.tier}
              className={`flex flex-col gap-2 rounded-2xl border p-4 ${
                planoAtual?.tier === p.tier ? "border-primary bg-primary/5" : "border-base-300 bg-base-100"
              }`}
            >
              <strong className="text-base text-secondary">{p.nome}</strong>
              <span className="text-sm opacity-70">{p.resumo}</span>
              <ul className="m-0 flex flex-col gap-1 p-0">
                {p.recursos.map(item => (
                  <li key={item} className="flex items-center gap-1.5 text-sm">
                    <CheckIcon className="h-4 w-4 shrink-0 text-success" />
                    {item}
                  </li>
                ))}
              </ul>
              <span className="mt-1 text-sm font-bold text-secondary">A combinar</span>
            </div>
          ))}
        </div>
      </section>

      <a href="mailto:parceiros@chorinho.app" className="btn btn-primary h-14 w-fit gap-1.5 rounded-2xl font-black">
        <EnvelopeIcon className="h-5 w-5" />
        Falar com a gente
      </a>
    </div>
  );
};
