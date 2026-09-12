import Link from "next/link";
import type { NextPage } from "next";
import { GiftIcon, MapIcon, QrCodeIcon, SparklesIcon, TicketIcon, TrophyIcon } from "@heroicons/react/24/outline";
import { INICIO_DO_APP } from "~~/utils/rotas";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Como funciona",
  description: "Do balcão à recompensa: como o Chorinho funciona para quem compra no comércio do bairro.",
});

const ETAPAS = [
  {
    Icon: MapIcon,
    titulo: "Encontre os parceiros",
    texto:
      "O mapa mostra os comércios do seu bairro que participam, o que cada um oferece e quantos carimbos você já tem em cada cartela.",
  },
  {
    Icon: QrCodeIcon,
    titulo: "Mostre o passe ao pagar",
    texto:
      "Na hora de pagar, abra o passe no celular. O caixa escaneia e informa o valor da compra — o resto é automático.",
  },
  {
    Icon: TicketIcon,
    titulo: "Os carimbos caem na hora",
    texto:
      "Cada comerciante define quantos reais valem um carimbo e o valor mínimo da compra. Você vê o carimbo aparecer na cartela na mesma hora.",
  },
  {
    Icon: GiftIcon,
    titulo: "Complete e resgate",
    texto:
      "Cartela completa vira recompensa: aquele agrado que a casa dá. É o atendente quem confirma o resgate no balcão.",
  },
  {
    Icon: SparklesIcon,
    titulo: "Pontos que valem na cidade toda",
    texto:
      "Além da cartela de cada loja, toda compra rende pontos da cidade — e esses valem em qualquer parceiro da rede. É o comércio local se ajudando.",
  },
  {
    Icon: TrophyIcon,
    titulo: "Trilhas e conquistas",
    texto:
      "Visite uma sequência de parceiros do bairro e ganhe uma peça exclusiva daquele estabelecimento, que fica registrada como sua para sempre.",
  },
];

const ComoFunciona: NextPage = () => (
  <div className="w-full max-w-3xl mx-auto px-5 py-10 flex flex-col gap-8">
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary">Como funciona</h1>
      <p className="m-0 opacity-80 leading-relaxed text-balance">
        Sem cartãozinho de papel que some na carteira, sem app de cada loja. Um passe só, para o bairro inteiro.
      </p>
    </header>

    <ol className="list-none p-0 m-0 flex flex-col gap-4">
      {ETAPAS.map(({ Icon, titulo, texto }, i) => (
        <li key={titulo} className="flex gap-4 p-5 rounded-box border border-base-300 bg-base-100">
          <span className="w-11 h-11 rounded-2xl bg-primary/10 text-brand-ink flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-mono font-black text-honey-ink">{String(i + 1).padStart(2, "0")}</span>
              <h2 className="font-serif font-extrabold text-lg m-0 text-secondary">{titulo}</h2>
            </div>
            <p className="m-0 text-sm opacity-80 leading-relaxed">{texto}</p>
          </div>
        </li>
      ))}
    </ol>

    <div className="flex flex-col sm:flex-row gap-3">
      <Link href={INICIO_DO_APP} className="btn btn-primary min-h-14 rounded-2xl font-black gap-2">
        <MapIcon className="w-5 h-5" />
        Ver comércios perto de mim
      </Link>
      <Link href="/ajuda" className="btn btn-ghost min-h-12 rounded-2xl font-bold">
        Tirar uma dúvida
      </Link>
    </div>
  </div>
);

export default ComoFunciona;
