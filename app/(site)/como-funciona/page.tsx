import Link from "next/link";
import type { NextPage } from "next";
import { BoltIcon, EyeSlashIcon, GiftIcon, MapIcon, QrCodeIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Card, Text } from "~~/components/design-system";
import { getMetadata } from "~~/utils/metadata";
import { INICIO_DO_APP } from "~~/utils/rotas";

export const metadata = getMetadata({
  title: "Como funciona",
  description: "Do balcão à recompensa: como o Chorinho funciona para quem compra no comércio do bairro.",
});

const ETAPAS = [
  {
    Icon: MapIcon,
    titulo: "Encontre quem participa",
    texto:
      "O mapa mostra os comércios do seu bairro que estão no Chorinho. Toque num pino para ver o que a casa dá de prêmio e quantos carimbos faltam na sua cartela de lá.",
  },
  {
    Icon: QrCodeIcon,
    titulo: "Mostre o passe ao pagar",
    texto:
      "Na hora de pagar, abra o passe no celular e deixe o caixa ler. Ele não digita valor nenhum: o que você comprou e quanto gastou não mudam o que você ganha. Se a câmera do balcão estiver ruim, o passe também mostra um código de seis dígitos para o atendente digitar.",
  },
  {
    Icon: BoltIcon,
    titulo: "O carimbo cai na hora",
    texto:
      "Sem espera e sem tela girando: o carimbo aparece na sua cartela enquanto você ainda está no balcão, com a fila andando atrás de você.",
  },
  {
    Icon: GiftIcon,
    titulo: "Cartela cheia vira chorinho",
    texto:
      "Cada comércio decide quantos carimbos o prêmio custa e qual é o agrado: a fatia extra de bolo, o refil de café, a toalha quente. É o atendente quem confirma o resgate no balcão.",
  },
];

const NAO_PRECISA = [
  {
    Icon: EyeSlashIcon,
    titulo: "A loja não sabe quem você é",
    texto:
      "Para o comerciante você é um código: ele vê que alguém carimbou e com que frequência esse alguém volta, nunca o seu nome, o seu e-mail ou onde você está.",
  },
  {
    Icon: TrashIcon,
    titulo: "Apagar é apagar mesmo",
    texto:
      "Se um dia você pedir para apagar a conta, tudo vai junto: perfil, e-mail, carimbos e histórico de visitas. Não sobra cópia nossa em canto nenhum.",
  },
];

const ComoFunciona: NextPage = () => (
  <div className="w-full max-w-3xl mx-auto px-5 py-10 flex flex-col gap-10">
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary">Como funciona</h1>
      <p className="m-0 opacity-80 leading-relaxed text-balance">
        Sem cartãozinho de papel amassando no bolso e sem um aplicativo para cada loja. Um passe só, e uma cartela em
        cada comércio do bairro.
      </p>
    </header>

    <ol className="list-none p-0 m-0 flex flex-col gap-4">
      {ETAPAS.map(({ Icon, titulo, texto }, i) => (
        <li key={titulo}>
          <Card className="flex gap-4 p-5">
            <span className="w-11 h-11 rounded-2xl bg-primary/10 text-brand-ink flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </span>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-mono font-black text-honey-ink">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="font-serif font-extrabold text-lg m-0 text-secondary">{titulo}</h2>
              </div>
              <Text size="sm" tone="muted" className="leading-relaxed">
                {texto}
              </Text>
            </div>
          </Card>
        </li>
      ))}
    </ol>

    {/* Fora da lista numerada de propósito: não são passos que a pessoa dá, são
        promessas nossas — e a de apagar contradiz o que a página prometia antes. */}
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-serif font-black m-0 text-secondary">E o que fica com você</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {NAO_PRECISA.map(({ Icon, titulo, texto }) => (
          <Card key={titulo} variant="warm" className="p-5 flex flex-col gap-2">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-brand-ink flex items-center justify-center">
              <Icon className="w-5 h-5" />
            </span>
            <h3 className="font-serif font-extrabold text-base m-0 text-secondary">{titulo}</h3>
            <Text size="sm" tone="muted" className="leading-relaxed">
              {texto}
            </Text>
          </Card>
        ))}
      </div>
      <Text size="sm" tone="muted" className="leading-relaxed">
        O Chorinho é de graça para quem compra, e vai continuar sendo: quem paga a plataforma é o comerciante.
      </Text>
    </section>

    <div className="flex flex-col sm:flex-row gap-3">
      <Link href={INICIO_DO_APP} className="btn btn-primary min-h-14 rounded-2xl font-black gap-2">
        <MapIcon className="w-5 h-5" />
        Ver comércios perto de mim
      </Link>
      <Link href="/ajuda" className="btn btn-ghost min-h-14 rounded-2xl font-bold">
        Tirar uma dúvida
      </Link>
    </div>
  </div>
);

export default ComoFunciona;
