import Link from "next/link";
import type { NextPage } from "next";
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
  DevicePhoneMobileIcon,
  GiftIcon,
  MapPinIcon,
  QrCodeIcon,
  ShoppingBagIcon,
  SignalSlashIcon,
  SparklesIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { Mapa } from "~~/components/mapa/Mapa";

const PASSOS = [
  {
    Icon: ShoppingBagIcon,
    titulo: "Peça no balcão",
    texto: "Tome um café, corte o cabelo ou leve seu pão quentinho no comércio do seu bairro.",
  },
  {
    Icon: QrCodeIcon,
    titulo: "Carimbe na hora",
    texto: "Mostre o código no celular ao pagar. O caixa escaneia e o carimbo cai na sua cartela.",
  },
  {
    Icon: GiftIcon,
    titulo: "Ganhe o chorinho",
    texto: "Cartela completa vira aquele agrado que só quem é de casa merece.",
  },
];

const PARA_LOJISTA = [
  {
    Icon: DevicePhoneMobileIcon,
    titulo: "Sem equipamento novo",
    texto: "Qualquer celular com câmera vira o terminal do balcão.",
  },
  {
    Icon: SignalSlashIcon,
    titulo: "Aguenta internet ruim",
    texto: "As vendas ficam numa fila no aparelho e sobem quando a conexão volta.",
  },
  {
    Icon: UsersIcon,
    titulo: "O bairro traz cliente",
    texto: "Quem junta pontos numa loja da rede pode gastar na sua.",
  },
];

const Landing: NextPage = () => (
  <div className="flex flex-col w-full">
    {/* ---------------------------------------------------------------- hero */}
    <section className="w-full bg-gradient-to-b from-base-200 via-base-100 to-base-200 border-b border-base-300 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] max-w-full bg-gradient-to-b from-primary/10 via-accent/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-5 pt-12 pb-10 text-center flex flex-col items-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black tracking-wide mb-6 shadow-xs">
          <SparklesIcon className="w-4 h-4" />
          <span>Aquele agrado no final da conta que você só tem no bairro</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-serif font-black m-0 tracking-tight max-w-3xl leading-[1.12] text-balance text-secondary">
          O carinho do comércio local, <br className="hidden sm:inline" />
          direto no seu{" "}
          <span className="text-primary italic underline decoration-accent/40 underline-offset-8">celular</span>.
        </h1>

        <p className="text-base sm:text-xl opacity-80 mt-6 mb-0 max-w-2xl text-balance leading-relaxed">
          Uma cartela de carimbos para o bairro inteiro. Acumule no balcão dos comércios que você já frequenta e ganhe
          recompensas de verdade — sem cartãozinho de papel, sem um aplicativo para cada loja.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto">
          <Link href="/mapa" className="btn btn-primary btn-lg rounded-2xl font-bold gap-2 shadow-sm">
            <MapPinIcon className="w-5 h-5" />
            Ver quem participa perto de mim
          </Link>
          <Link href="/para-comerciantes" className="btn btn-ghost btn-lg rounded-2xl font-bold gap-2">
            Tenho um comércio
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* ---------------------------------------------------------------- mapa */}
    <section className="w-full max-w-6xl mx-auto px-5 py-12 flex flex-col gap-5">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black m-0 tracking-tight text-secondary">
            Os comércios que já participam
          </h2>
          <p className="m-0 mt-1 text-sm opacity-75">
            Arraste o mapa para ver quem está perto de você. Toque num pino para conhecer o lugar.
          </p>
        </div>
        <Link href="/explorar" className="btn btn-ghost btn-sm rounded-xl gap-1.5 self-start sm:self-auto">
          <BuildingStorefrontIcon className="w-4 h-4" />
          Ver em lista
        </Link>
      </header>

      {/* Altura explícita: o Leaflet mede o container na montagem e nasce com
          0px se o pai não tiver altura definida. */}
      <Mapa className="w-full h-[420px] sm:h-[520px] rounded-box overflow-hidden border border-base-300 shadow-sm" />
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
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono font-black text-accent">{String(i + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="font-serif font-extrabold text-lg m-0 text-secondary">{titulo}</h3>
              <p className="m-0 text-sm opacity-80 leading-relaxed">{texto}</p>
            </li>
          ))}
        </ol>

        <div className="text-center">
          <Link href="/como-funciona" className="btn btn-ghost rounded-2xl font-bold gap-2">
            Ver em detalhe
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>

    {/* ------------------------------------------------------- multiloja */}
    <section className="w-full max-w-4xl mx-auto px-5 py-14 text-center">
      <h2 className="text-2xl sm:text-4xl font-serif font-black m-0 text-secondary text-balance">
        O bairro inteiro numa cartela só
      </h2>
      <p className="opacity-80 mt-4 mb-0 max-w-2xl mx-auto text-balance leading-relaxed">
        Cada comércio tem a sua cartela, mas os pontos que você junta valem em toda a rede de parceiros da sua cidade. É
        o comércio local se ajudando em vez de competir pelo mesmo cliente.
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
            Seu cliente já volta. O Chorinho registra essa volta e dá motivo para a próxima.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {PARA_LOJISTA.map(({ Icon, titulo, texto }) => (
            <div key={titulo} className="p-5 rounded-box border border-base-300 bg-base-200/60 flex flex-col gap-2">
              <span className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </span>
              <h3 className="font-serif font-extrabold text-base m-0 text-secondary">{titulo}</h3>
              <p className="m-0 text-sm opacity-80 leading-relaxed">{texto}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/para-comerciantes" className="btn btn-primary rounded-2xl font-bold">
            Ver os planos
          </Link>
          <Link href="/ajuda" className="btn btn-ghost rounded-2xl font-bold">
            Tirar uma dúvida
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export default Landing;
