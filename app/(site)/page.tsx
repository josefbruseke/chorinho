import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowRightIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingStorefrontIcon,
  GiftIcon,
  MapPinIcon,
  QrCodeIcon,
  ShoppingBagIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/outline";
import { Mapa } from "~~/components/mapa/Mapa";
import { INICIO_DO_APP } from "~~/utils/rotas";

const PASSOS = [
  {
    Icon: ShoppingBagIcon,
    titulo: "Peça no balcão",
    texto: "Tome um café, corte o cabelo ou leve seu pão quentinho no comércio do seu bairro.",
  },
  {
    Icon: QrCodeIcon,
    titulo: "Carimbe na hora",
    texto: "Mostre o código no celular ao pagar. O caixa lê e pronto — ele não digita valor nenhum.",
  },
  {
    Icon: GiftIcon,
    titulo: "Ganhe o chorinho",
    texto: "O carimbo cai na hora, ali no balcão. Cartela cheia vira aquele agrado que só quem é de casa merece.",
  },
];

const PARA_LOJISTA = [
  {
    Icon: BanknotesIcon,
    titulo: "R$ 7 por mês",
    texto: "Com até três caixas. Quatro ou mais, R$ 10 — e nada fica trancado atrás de plano.",
  },
  {
    Icon: QrCodeIcon,
    titulo: "O caixa não digita nada",
    texto: "Passou no balcão, ganhou carimbo. Qualquer celular com câmera lê o passe do cliente.",
  },
  {
    Icon: BoltIcon,
    titulo: "Carimbo imediato",
    texto: "Ninguém espera na fila: o cliente vê o carimbo antes de guardar o celular.",
  },
  {
    Icon: SignalSlashIcon,
    titulo: "Aguenta internet ruim",
    texto: "As vendas ficam numa fila no aparelho e sobem sozinhas quando a conexão volta.",
  },
];

const Landing: NextPage = () => (
  <div className="flex flex-col w-full">
    {/* ---------------------------------------------------------------- hero */}
    <section className="w-full bg-gradient-to-b from-base-200 via-base-100 to-base-200 border-b border-base-300 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] max-w-full bg-gradient-to-b from-primary/10 via-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-5 pt-12 pb-10 text-center flex flex-col items-center relative z-10">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black m-0 tracking-tight max-w-3xl leading-[1.12] text-balance text-secondary">
          O carinho do comércio local, <br className="hidden sm:inline" />
          direto no seu{" "}
          <span className="text-brand-ink italic underline decoration-accent/40 underline-offset-8">celular</span>.
        </h1>

        <p className="text-base sm:text-xl opacity-80 mt-6 mb-0 max-w-2xl text-balance leading-relaxed">
          As cartelas de carimbo do seu bairro, todas na mesma tela. Passou no balcão dos comércios que você já
          frequenta, ganhou carimbo na hora — sem cartãozinho de papel, sem um aplicativo para cada loja.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto">
          {/* botão principal da página: min-h-14 garante os 56px mesmo se o texto quebrar linha num celular de 360px */}
          <Link
            href={INICIO_DO_APP}
            className="btn btn-primary min-h-14 rounded-2xl text-base font-black gap-2 shadow-sm"
          >
            <MapPinIcon className="w-5 h-5 shrink-0" />
            Ver quem participa perto de mim
          </Link>
          <Link href="/para-comerciantes" className="btn btn-ghost btn-lg rounded-2xl font-bold gap-2">
            Tenho um comércio
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* ------------------------------------------------- mapa (coração da página) */}
    <section className="w-full max-w-6xl mx-auto px-5 py-14 flex flex-col gap-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-primary/10 text-brand-ink text-xs font-black uppercase tracking-wider">
            <MapPinIcon className="w-3.5 h-3.5 shrink-0" />O coração do Chorinho
          </span>
          <h2 className="text-2xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary text-balance">
            Os comércios que já participam
          </h2>
          <p className="m-0 text-sm sm:text-base opacity-80 max-w-md">
            Arraste o mapa para ver quem está perto de você. Toque num pino para conhecer o lugar.
          </p>
        </div>
        <Link href="/explorar" className="btn btn-ghost min-h-14 rounded-xl gap-1.5 self-start sm:self-auto shrink-0">
          <BuildingStorefrontIcon className="w-4 h-4" />
          Ver em lista
        </Link>
      </header>

      {/* Altura explícita: o Leaflet mede o container na montagem e nasce com
          0px se o pai não tiver altura definida. Generosa porque este é o
          elemento mais importante da página. */}
      <Mapa className="w-full h-[460px] sm:h-[560px] md:h-[620px] rounded-3xl overflow-hidden border border-base-300 shadow-md" />
    </section>

    {/* -------------------------------------------------------------- passos */}
    <section className="w-full bg-base-100 border-y border-base-300">
      <div className="max-w-5xl mx-auto px-5 py-14 flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary text-balance">
            Como funciona
          </h2>
          <p className="m-0 mt-3 opacity-80 max-w-xl mx-auto text-balance">
            Três passos e pronto. Você não precisa aprender nada novo.
          </p>
        </div>

        <ol className="list-none p-0 m-0 grid sm:grid-cols-3 gap-4">
          {PASSOS.map(({ Icon, titulo, texto }, i) => (
            <li
              key={titulo}
              className="flex flex-col items-start gap-2 p-5 rounded-box border border-base-300 bg-base-200/60"
            >
              <div className="flex items-center justify-between w-full">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-brand-ink flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono font-black text-honey-ink">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="font-serif font-extrabold text-lg m-0 text-secondary">{titulo}</h3>
              <p className="m-0 text-sm opacity-80 leading-relaxed">{texto}</p>
            </li>
          ))}
        </ol>

        <div className="text-center">
          <Link href="/como-funciona" className="btn btn-ghost min-h-14 rounded-2xl font-bold gap-2">
            Ver em detalhe
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* ------------------------------------------------------- multiloja */}
    <section className="w-full max-w-4xl mx-auto px-5 py-14 text-center">
      <h2 className="text-2xl sm:text-4xl font-serif font-black m-0 text-secondary text-balance">
        Um passe só, o bairro inteiro
      </h2>
      <p className="opacity-80 mt-4 mb-0 max-w-2xl mx-auto text-balance leading-relaxed">
        Cada comércio tem a cartela dele, com o agrado que a casa escolheu dar. O que não se repete é você: um cadastro,
        um código no celular e todas as cartelas do bairro na mesma tela.
      </p>
    </section>

    {/* -------------------------------------------------------- lojista */}
    <section className="w-full bg-base-100 border-t border-base-300">
      <div className="max-w-5xl mx-auto px-5 py-14 flex flex-col gap-8">
        <div className="text-center">
          <h2 className="text-2xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary text-balance">
            Tem um comércio?
          </h2>
          <p className="m-0 mt-3 opacity-80 max-w-xl mx-auto text-balance">
            Seu cliente já volta. O Chorinho registra essa volta e dá motivo para a próxima, por sete reais no mês.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PARA_LOJISTA.map(({ Icon, titulo, texto }) => (
            <div key={titulo} className="p-5 rounded-box border border-base-300 bg-base-200/60 flex flex-col gap-2">
              <span className="w-10 h-10 rounded-xl bg-accent/15 text-honey-ink flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="font-serif font-extrabold text-base m-0 text-secondary">{titulo}</h3>
              <p className="m-0 text-sm opacity-80 leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/para-comerciantes" className="btn btn-primary min-h-14 rounded-2xl font-black">
            Ver quanto custa
          </Link>
          <Link href="/ajuda" className="btn btn-ghost min-h-14 rounded-2xl font-bold">
            Tirar uma dúvida
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default Landing;
