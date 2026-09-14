import Link from "next/link";
import type { NextPage } from "next";
import {
  BoltIcon,
  CheckIcon,
  DevicePhoneMobileIcon,
  EyeSlashIcon,
  QrCodeIcon,
  SignalSlashIcon,
} from "@heroicons/react/24/outline";
import { Badge, Card, Text } from "~~/components/design-system";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Para comerciantes",
  description:
    "Cartela de carimbos para o comércio de bairro: R$ 7 por mês com até três caixas, R$ 10 com quatro ou mais. Quinze dias grátis, sem cartão.",
});

// Os mesmos dois números que o lojista vê em /painel/assinatura. Preço que
// muda aqui e não lá é o lojista descobrindo a diferença depois de assinar.
const PRECOS = [
  { faixa: "Até 3 caixas", preco: "R$ 7", nota: "A padaria, a barbearia, o bar da esquina." },
  { faixa: "4 caixas ou mais", preco: "R$ 10", nota: "Quatro caixas ou vinte custam igual." },
];

const INCLUSO = [
  "Os prêmios que você cadastrar, do cafezinho extra ao corte por conta da casa",
  "O tamanho de cada cartela definido por você, prêmio a prêmio",
  "Sua loja no mapa do bairro, com endereço, horário de funcionamento e WhatsApp",
  "Toda a equipe do caixa, cada atendente entrando com a conta dele",
  "Painel com o movimento do dia e o extrato de auditoria de cada carimbo",
];

const BALCAO = [
  {
    Icon: QrCodeIcon,
    titulo: "O caixa não digita nada",
    texto:
      "Passou no balcão, ganhou carimbo. O atendente lê o passe do cliente e acabou — sem valor de compra, sem teclado numérico, sem conferir número nenhum.",
  },
  {
    Icon: BoltIcon,
    titulo: "O carimbo cai na hora",
    texto:
      "Nada de tela girando com a fila andando atrás. O cliente vê o carimbo aparecer na cartela dele antes de guardar o celular.",
  },
  {
    Icon: DevicePhoneMobileIcon,
    titulo: "Sem equipamento novo",
    texto:
      "Qualquer celular ou tablet com câmera vira o terminal do balcão. Abre no navegador e instala na tela inicial do aparelho.",
  },
  {
    Icon: SignalSlashIcon,
    titulo: "Aguenta a internet caindo",
    texto:
      "As vendas ficam numa fila no próprio aparelho e sobem sozinhas quando a conexão volta. O atendente vê quantas estão pendentes.",
  },
];

const ParaComerciantes: NextPage = () => (
  <div className="w-full max-w-4xl mx-auto px-5 py-10 flex flex-col gap-12">
    <header className="flex flex-col gap-3 text-center items-center">
      <Badge variant="chorinho">15 dias grátis, sem pedir cartão</Badge>
      <h1 className="text-3xl sm:text-5xl font-serif font-black m-0 tracking-tight text-secondary text-balance">
        Fidelidade de verdade por sete reais no mês
      </h1>
      <p className="m-0 opacity-80 leading-relaxed max-w-2xl text-balance">
        Seu cliente já volta. O Chorinho registra essa volta, dá motivo para a próxima e mostra sua loja para quem anda
        pelo bairro — sem cartãozinho de papel e sem maquininha nova.
      </p>
    </header>

    {/* O preço abre a página porque era a pergunta que a versão anterior não
        respondia, e lojista que não vê preço assume que é caro. */}
    <section className="flex flex-col gap-4">
      <div className="text-center flex flex-col gap-2">
        <h2 className="text-2xl sm:text-3xl font-serif font-black m-0 text-secondary text-balance">
          Um preço só, medido em terminais
        </h2>
        <p className="m-0 opacity-80 leading-relaxed max-w-2xl mx-auto text-balance">
          Nada fica trancado atrás de plano: a padaria da esquina tem os mesmos prêmios, o mesmo painel e o mesmo balcão
          que a rede de dez lojas. O que cresce com o tamanho da loja é quantos caixas carimbam ao mesmo tempo.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {PRECOS.map(({ faixa, preco, nota }) => (
          <Card key={faixa} className="p-5 flex flex-col gap-1">
            <span className="text-sm font-bold text-secondary">{faixa}</span>
            <span className="font-mono text-4xl font-black leading-none text-secondary">
              {preco}
              <span className="font-sans text-sm font-bold opacity-60"> por mês</span>
            </span>
            <Text size="sm" tone="muted" className="mt-1">
              {nota}
            </Text>
          </Card>
        ))}
      </div>

      <Card variant="warm" className="p-5 flex flex-col gap-3">
        <h3 className="font-serif font-extrabold text-base m-0 text-secondary">O que entra, em qualquer faixa</h3>
        <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
          {INCLUSO.map(item => (
            <li key={item} className="flex items-start gap-2 text-sm text-kraft-ink leading-relaxed">
              <CheckIcon className="w-4 h-4 text-brand-ink shrink-0 mt-1" />
              {item}
            </li>
          ))}
        </ul>
        <Text size="sm" tone="muted" className="leading-relaxed">
          No cartão ou no Pix Automático. A cobrança ainda não está no ar — por enquanto nenhuma loja está sendo
          cobrada, e os quinze dias grátis começam a contar quando ela entrar.
        </Text>
      </Card>
    </section>

    <section className="flex flex-col gap-4">
      <h2 className="text-2xl sm:text-3xl font-serif font-black m-0 text-secondary text-center text-balance">
        Como é no balcão
      </h2>
      <div className="grid sm:grid-cols-2 gap-4">
        {BALCAO.map(({ Icon, titulo, texto }) => (
          <Card key={titulo} className="p-5 flex flex-col gap-2">
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
      <Text size="sm" tone="muted" className="text-center leading-relaxed">
        A regra é a mesma em todas as lojas por enquanto: um carimbo por passagem no balcão, sem espera entre uma visita
        e outra. Se a sua precisa de uma regra diferente, fale com a gente antes de começar.
      </Text>
    </section>

    {/* O lojista pergunta cedo o que ele passa a saber sobre o cliente. Dizer
        que ele não sabe nada é argumento, não ressalva: é o que faz o cliente
        mostrar o passe sem hesitar na frente dele. */}
    <section>
      <Card className="p-6 flex flex-col sm:flex-row gap-4 items-start">
        <span className="w-12 h-12 rounded-2xl bg-primary/10 text-brand-ink flex items-center justify-center shrink-0">
          <EyeSlashIcon className="w-6 h-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-serif font-extrabold m-0 text-secondary">Para você, o cliente é um código</h2>
          <Text size="sm" tone="muted" className="leading-relaxed">
            Você vê quantos carimbos deu, quantas cartelas fecharam e com que frequência aquele código volta. Quem é a
            pessoa, não: nome, e-mail e localização não chegam até o seu painel. É o que faz o cliente mostrar o passe
            sem pensar duas vezes.
          </Text>
        </div>
      </Card>
    </section>

    <section className="flex flex-col gap-4 items-center text-center">
      <h2 className="text-2xl sm:text-3xl font-serif font-black m-0 text-secondary text-balance">
        Quero o Chorinho na minha loja
      </h2>
      <Text tone="muted" className="max-w-2xl leading-relaxed text-balance">
        O cadastro ainda não se completa sozinho: você deixa o interesse e a nossa equipe ativa a loja à mão, uma por
        uma, com você junto na primeira leitura de passe no balcão.
      </Text>
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Link href="/cadastro" className="btn btn-primary min-h-14 rounded-2xl font-black">
          Quero cadastrar meu comércio
        </Link>
        <Link href="/ajuda" className="btn btn-ghost min-h-14 rounded-2xl font-bold">
          Tenho dúvidas
        </Link>
      </div>
    </section>
  </div>
);

export default ParaComerciantes;
