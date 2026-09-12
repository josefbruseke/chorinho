import Link from "next/link";
import type { NextPage } from "next";
import { BuildingStorefrontIcon, ShieldCheckIcon, UserIcon } from "@heroicons/react/24/outline";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Ajuda",
  description: "Perguntas frequentes sobre carimbos, recompensas, carteira e como participar como comerciante.",
});

type Pergunta = { q: string; a: React.ReactNode };

const CLIENTE: Pergunta[] = [
  {
    q: "Como ganho um carimbo?",
    a: "Compre normalmente no estabelecimento parceiro e, na hora de pagar, mostre seu passe na tela do celular. O caixa escaneia, informa o valor da compra e o carimbo cai na sua cartela na hora.",
  },
  {
    q: "Preciso baixar algum aplicativo?",
    a: (
      <>
        Não. O Chorinho funciona direto no navegador do celular. Se quiser, dá para instalar na tela inicial pelo menu
        do navegador — fica com cara de aplicativo e abre mais rápido.
      </>
    ),
  },
  {
    q: "Meu passe expira?",
    a: "O código do passe vale por cerca de dois minutos e depois se renova sozinho. Isso impede que alguém tire uma foto da sua tela e use seus carimbos. Se expirar antes de o caixa escanear, é só mostrar de novo.",
  },
  {
    q: "E se a câmera do caixa não funcionar?",
    a: "A tela do passe também mostra um código de seis dígitos. O atendente digita e resolve. Ele também é de uso único.",
  },
  {
    q: "Os carimbos de uma loja valem em outra?",
    a: "A cartela é de cada loja: cinco cafés naquela cafeteria dão o sexto naquela cafeteria. Mas toda compra também rende pontos da cidade, e esses valem em qualquer parceiro da rede.",
  },
  {
    q: "Meus carimbos podem sumir?",
    a: (
      <>
        Não. Eles ficam registrados numa blockchain e nem nós nem o comerciante conseguimos apagá-los. Se o
        estabelecimento sair da plataforma, ele ainda deve honrar as cartelas completas. Veja{" "}
        <Link href="/carteira-e-seguranca" className="text-brand-ink underline underline-offset-2">
          Carteira e segurança
        </Link>
        .
      </>
    ),
  },
  {
    q: "O aplicativo funciona sem localização?",
    a: "Funciona inteiro. Se você não quiser dar acesso à localização, é só escolher seu bairro na lista — o mapa e a busca continuam funcionando normalmente.",
  },
];

const CARTEIRA: Pergunta[] = [
  {
    q: "Preciso entender de cripto?",
    a: "Não. Você entra com e-mail ou Google, e a carteira é criada sozinha por baixo. Não tem frase secreta para anotar, nem extensão para instalar, e você nunca precisa comprar criptomoeda. As taxas de rede são pagas pela plataforma.",
  },
  {
    q: "Vou pagar alguma taxa?",
    a: "Nunca. Para o cliente o Chorinho é gratuito, inclusive as taxas da blockchain. Quem paga a plataforma é o comerciante, através da assinatura.",
  },
  {
    q: "O que acontece se eu perder o acesso ao meu e-mail?",
    a: "O acesso à carteira depende do acesso à conta com que você entrou. Por isso vale ativar a verificação em duas etapas no seu e-mail ou conta Google.",
  },
  {
    q: "Alguém pode ver meus carimbos?",
    a: (
      <>
        O registro na blockchain é público, mas anônimo: mostra um endereço, não o seu nome. Seu nome, e-mail e
        localização nunca vão para lá. O detalhe está em{" "}
        <Link href="/carteira-e-seguranca" className="text-brand-ink underline underline-offset-2">
          Carteira e segurança
        </Link>
        .
      </>
    ),
  },
];

const COMERCIANTE: Pergunta[] = [
  {
    q: "Como faço para participar?",
    a: (
      <>
        Crie a conta, cadastre a loja e escolha um plano. Veja{" "}
        <Link href="/para-comerciantes" className="text-brand-ink underline underline-offset-2">
          Para comerciantes
        </Link>
        .
      </>
    ),
  },
  {
    q: "Preciso de equipamento novo no caixa?",
    a: "Não. Qualquer celular ou tablet com câmera serve. O terminal abre no navegador e pode ser instalado na tela inicial do aparelho.",
  },
  {
    q: "E se a internet da loja cair?",
    a: "O terminal continua funcionando. As vendas ficam numa fila no próprio aparelho e sobem sozinhas quando a conexão volta. O atendente vê quantas estão pendentes.",
  },
  {
    q: "Quem define as regras de pontuação?",
    a: "Você. Define quanto de compra vale um carimbo, o valor mínimo da venda para gerar carimbo, o teto por venda e quais produtos rendem mais pontos.",
  },
  {
    q: "O que acontece se eu atrasar o pagamento?",
    a: "Você tem sete dias de carência. Depois disso o caixa para de emitir carimbos novos, mas continua permitindo resgates — seu cliente não pode ser penalizado por um problema de cobrança.",
  },
];

const Bloco = ({ titulo, Icon, perguntas }: { titulo: string; Icon: typeof UserIcon; perguntas: Pergunta[] }) => (
  <section className="flex flex-col gap-3">
    <h2 className="flex items-center gap-2.5 text-xl font-serif font-extrabold text-secondary m-0">
      <span className="w-9 h-9 rounded-xl bg-primary/10 text-brand-ink flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </span>
      {titulo}
    </h2>
    <div className="flex flex-col gap-2">
      {perguntas.map(({ q, a }) => (
        <details key={q} className="group rounded-box border border-base-300 bg-base-100 overflow-hidden">
          <summary className="cursor-pointer list-none px-4 min-h-12 font-bold text-sm flex items-center justify-between gap-3 hover:bg-base-200 transition-colors">
            <span>{q}</span>
            <span className="text-brand-ink text-lg leading-none shrink-0 transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="px-4 pb-4 pt-0 m-0 text-sm text-base-content/80 leading-relaxed">{a}</p>
        </details>
      ))}
    </div>
  </section>
);

const Ajuda: NextPage = () => (
  <div className="w-full max-w-3xl mx-auto px-5 py-10 flex flex-col gap-10">
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl sm:text-4xl font-serif font-black m-0 tracking-tight text-secondary">
        Como podemos ajudar
      </h1>
      <p className="m-0 opacity-80 leading-relaxed text-balance">
        As dúvidas mais comuns, respondidas sem enrolação. Não achou a sua? Fale com a gente — a gente responde.
      </p>
    </header>

    <Bloco titulo="Usando o Chorinho" Icon={UserIcon} perguntas={CLIENTE} />
    <Bloco titulo="Carteira e segurança" Icon={ShieldCheckIcon} perguntas={CARTEIRA} />
    <Bloco titulo="Tenho um comércio" Icon={BuildingStorefrontIcon} perguntas={COMERCIANTE} />

    {/* Aviso crítico — mesmo tratamento visual de /carteira-e-seguranca, para golpes contra o usuário saltarem aos olhos. */}
    <aside className="rounded-box border-2 border-warning bg-warning/10 p-5 flex flex-col gap-2">
      <strong className="font-serif font-extrabold text-base sm:text-lg text-secondary">Cuidado com golpes</strong>
      <p className="m-0 text-sm text-base-content/85 leading-relaxed">
        Ninguém do Chorinho vai pedir sua senha, um código de verificação ou a chave da sua carteira — nem por e-mail,
        nem por WhatsApp, nem no balcão. Qualquer pedido assim é golpe, mesmo que pareça vir da gente.
      </p>
    </aside>
  </div>
);

export default Ajuda;
