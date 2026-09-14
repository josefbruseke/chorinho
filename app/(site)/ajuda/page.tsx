import Link from "next/link";
import type { NextPage } from "next";
import { BuildingStorefrontIcon, ShieldCheckIcon, UserIcon } from "@heroicons/react/24/outline";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Ajuda",
  description: "Perguntas frequentes sobre carimbos, recompensas, sua conta e como participar como comerciante.",
});

type Pergunta = { q: string; a: React.ReactNode };

const CLIENTE: Pergunta[] = [
  {
    q: "Como ganho um carimbo?",
    a: "Compre normalmente no estabelecimento parceiro e, na hora de pagar, mostre seu passe na tela do celular. O caixa lê e o carimbo cai na sua cartela na hora. O atendente não digita valor nenhum: passou no balcão, ganhou carimbo, seja um cafezinho ou a compra do mês.",
  },
  {
    q: "O carimbo demora para aparecer?",
    a: "Não. Ele cai enquanto você ainda está no balcão — dá para conferir na cartela antes de guardar o celular. Se o caixa estiver sem internet, a venda fica numa fila no aparelho da loja e o carimbo entra assim que a conexão voltar.",
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
    a: "O código do passe vale pouco mais de um minuto e meio e depois se renova sozinho. Isso impede que alguém tire uma foto da sua tela e use seus carimbos. Se expirar antes de o caixa ler, é só mostrar de novo.",
  },
  {
    q: "E se a câmera do caixa não funcionar?",
    a: "A tela do passe também mostra um código de seis dígitos, que vale cinco minutos. O atendente digita e resolve. Ele também é de uso único.",
  },
  {
    q: "Os carimbos de uma loja valem em outra?",
    a: "Não. A cartela é de cada casa: cinco cafés naquela cafeteria dão o sexto naquela cafeteria. O que é um só para o bairro inteiro é o seu passe — um cadastro, e todas as cartelas na mesma tela.",
  },
  {
    q: "Meus carimbos podem sumir?",
    a: (
      <>
        Não por vontade do comerciante: nem ele nem a gente tira carimbo de ninguém. Se o estabelecimento sair da
        plataforma, ele ainda deve honrar as cartelas completas. Quem apaga tudo é você, pedindo para apagar a conta —
        porque é seu.
      </>
    ),
  },
  {
    q: "O aplicativo funciona sem localização?",
    a: "Funciona inteiro. Se você não quiser dar acesso à localização, é só arrastar o mapa até o seu bairro — a busca e a lista de lugares continuam do mesmo jeito.",
  },
];

const CONTA: Pergunta[] = [
  {
    q: "Como eu entro?",
    a: "Com e-mail ou com a sua conta Google, e pronto. Não tem cadastro longo, não tem senha para inventar em cada loja.",
  },
  {
    q: "Vou pagar alguma taxa?",
    a: "Nunca. Para quem compra, o Chorinho é gratuito do começo ao fim. Quem paga a plataforma é o comerciante, pela assinatura da loja.",
  },
  {
    q: "O que acontece se eu perder o acesso ao meu e-mail?",
    a: "Suas cartelas dependem do acesso à conta com que você entrou. Por isso vale ativar a verificação em duas etapas no seu e-mail ou na sua conta Google.",
  },
  {
    q: "Alguém pode ver meus carimbos?",
    a: (
      <>
        O lojista vê que alguém carimbou, quantas vezes e com que frequência — nunca quem. Para ele você é um código,
        não uma pessoa. Nome, e-mail e localização não chegam até lá.
      </>
    ),
  },
  {
    q: "Como apago minha conta?",
    a: (
      <>
        Ainda não há um botão no perfil: por enquanto o pedido passa pela gente, e apagar apaga de verdade — perfil,
        e-mail, carimbos e histórico de visitas somem juntos, sem cópia guardada. Os detalhes estão na{" "}
        <Link href="/privacidade" className="text-brand-ink underline underline-offset-2">
          política de privacidade
        </Link>
        .
      </>
    ),
  },
];

const COMERCIANTE: Pergunta[] = [
  {
    q: "Quanto custa?",
    a: (
      <>
        R$ 7 por mês com um terminal no balcão, R$ 10 com dois ou mais — e nada fica trancado atrás de plano. São quinze
        dias grátis, sem pedir cartão. Os detalhes estão em{" "}
        <Link href="/para-comerciantes" className="text-brand-ink underline underline-offset-2">
          Para comerciantes
        </Link>
        .
      </>
    ),
  },
  {
    q: "Como faço para participar?",
    a: (
      <>
        Deixe seu interesse em{" "}
        <Link href="/cadastro" className="text-brand-ink underline underline-offset-2">
          Cadastrar meu comércio
        </Link>
        . O cadastro ainda não se completa sozinho: a nossa equipe ativa as lojas à mão, uma por uma, e acompanha a
        primeira leitura de passe no seu balcão.
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
    q: "Quem define as regras de carimbo?",
    a: "Hoje a regra é a mesma em todas as lojas: uma passagem no balcão, um carimbo, sem espera entre uma visita e outra e sem valor mínimo de compra. O que é seu para definir é o prêmio — o que a casa dá e quantos carimbos ele custa. Se a sua loja precisa de outra regra, fale com a gente.",
  },
  {
    q: "Quando começa a cobrança?",
    a: "Ainda não começou: nenhuma loja está sendo cobrada hoje. Quando entrar no ar, vai ser no cartão ou no Pix Automático, com os quinze dias grátis contando dali.",
  },
  {
    q: "O que acontece se eu atrasar o pagamento?",
    a: "O balcão para de emitir carimbo novo, mas continua entregando os prêmios que o cliente já juntou. É proposital: quem já ganhou, recebe — seu cliente não pode ser penalizado por um problema de cobrança.",
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
          <summary className="cursor-pointer list-none px-4 min-h-14 font-bold text-sm flex items-center justify-between gap-3 hover:bg-base-200 transition-colors">
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
    <Bloco titulo="Conta e segurança" Icon={ShieldCheckIcon} perguntas={CONTA} />
    <Bloco titulo="Tenho um comércio" Icon={BuildingStorefrontIcon} perguntas={COMERCIANTE} />

    {/* Aviso crítico — tratamento visual reservado a golpe, para golpes contra o usuário saltarem aos olhos. */}
    <aside className="rounded-box border-2 border-warning bg-warning/10 p-5 flex flex-col gap-2">
      <strong className="font-serif font-extrabold text-base sm:text-lg text-secondary">Cuidado com golpes</strong>
      <p className="m-0 text-sm text-base-content/85 leading-relaxed">
        Ninguém do Chorinho vai pedir sua senha ou um código de verificação — nem por e-mail, nem por WhatsApp, nem no
        balcão. Qualquer pedido assim é golpe, mesmo que pareça vir da gente.
      </p>
    </aside>
  </div>
);

export default Ajuda;
