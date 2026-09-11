import Link from "next/link";
import type { NextPage } from "next";
import { AvisoLegal, DocumentoLegal } from "~~/components/legal/DocumentoLegal";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Carteira e segurança",
  description: "O que é a carteira do Chorinho, o que ela guarda e como você se protege.",
});

const CarteiraSeguranca: NextPage = () => (
  <DocumentoLegal
    titulo="Carteira e segurança"
    resumo="O Chorinho registra seus carimbos numa blockchain. Isso traz garantias reais, mas também responsabilidades que você precisa conhecer antes de usar."
    vigenteDesde="11 de setembro de 2026"
  >
    <section>
      <h2>Por que existe uma carteira</h2>
      <p>
        Seus carimbos, pontos e recompensas não ficam guardados num banco de dados que a gente pode apagar ou alterar
        sozinho. Eles ficam registrados numa blockchain pública, ligados a um endereço que pertence a você — a sua
        carteira.
      </p>
      <p>
        Na prática isso significa que nenhum comerciante, e nem o Chorinho, consegue tirar de você um carimbo que já foi
        dado. Se a gente fechar as portas amanhã, o registro do que você acumulou continua existindo.
      </p>
    </section>

    <section>
      <h2>Você não precisa entender nada disso para usar</h2>
      <p>
        Ao criar sua conta com e-mail ou Google, uma carteira é criada para você automaticamente. Não existe frase
        secreta para anotar, não existe extensão para instalar e você nunca vai precisar comprar criptomoeda para nada.
        As taxas de rede são pagas pela plataforma.
      </p>
      <p>Você entra e sai do aplicativo como em qualquer outro. A carteira fica trabalhando por baixo.</p>
    </section>

    <section>
      <h2>Quem tem a chave</h2>
      <p>
        A chave da sua carteira é fragmentada: nem o Chorinho nem o provedor de carteira possuem as partes necessárias
        para usá-la sozinhos. Nós <strong>não</strong> conseguimos movimentar o que está na sua carteira, e não somos
        custodiantes dos seus ativos.
      </p>
      <p>
        A contrapartida é que a recuperação depende do seu acesso à conta. Perdeu o acesso ao e-mail ou à conta Google
        que você usou para entrar, e perdeu junto o caminho de volta para a carteira.
      </p>
    </section>

    <AvisoLegal titulo="Proteja a conta de entrada">
      <p>
        Ative a verificação em duas etapas no e-mail ou na conta Google que você usa no Chorinho. É esse acesso que
        protege sua carteira.
      </p>
      <p>
        Ninguém do Chorinho vai pedir sua senha, um código de verificação ou a chave da sua carteira — nem por e-mail,
        nem por WhatsApp, nem no balcão de uma loja. Qualquer pedido assim é golpe.
      </p>
    </AvisoLegal>

    <section>
      <h2>O que fica público na blockchain</h2>
      <p>
        Registro em blockchain é público por natureza. Qualquer pessoa que descubra o endereço da sua carteira consegue
        ver, para sempre:
      </p>
      <ul>
        <li>em quais estabelecimentos você acumulou carimbos e quantos;</li>
        <li>quando cada carimbo foi dado e quando você resgatou uma recompensa;</li>
        <li>quais recompensas e selos de conquista você possui.</li>
      </ul>
      <p>
        O que <strong>não</strong> vai para a blockchain: seu nome, e-mail, telefone, foto e localização. Esses dados
        ficam no nosso banco, sob as regras da <Link href="/privacidade">Política de Privacidade</Link>.
      </p>
      <p>
        Ainda assim, vale a consciência: seu endereço sozinho não diz quem você é, mas se você divulgar esse endereço em
        algum lugar, o histórico passa a ser associável a você. E não há como apagar depois.
      </p>
    </section>

    <section>
      <h2>Carimbos e pontos não são dinheiro</h2>
      <p>
        Os carimbos e pontos do Chorinho são intransferíveis por construção: não podem ser vendidos, trocados entre
        pessoas nem convertidos em dinheiro. Eles existem só para serem trocados por recompensas nos estabelecimentos
        parceiros.
      </p>
      <p>
        Não são investimento, não rendem, não têm cotação, e o valor de um carimbo é definido pelo comerciante que o
        ofereceu — que pode mudar ou encerrar o programa dele.
      </p>
    </section>

    <section>
      <h2>Usar a sua própria carteira</h2>
      <p>
        Se você já usa uma carteira de criptomoedas e prefere conectar a sua, isso será possível no perfil. Nesse caso a
        responsabilidade pela guarda da chave passa inteiramente a ser sua, com todas as consequências — inclusive a
        perda definitiva do acesso se você perder a frase de recuperação.
      </p>
    </section>

    <section>
      <h2>Dúvidas</h2>
      <p>
        A <Link href="/ajuda">seção de ajuda</Link> responde as perguntas mais comuns em linguagem simples. Se algo aqui
        não ficou claro, fale com a gente — preferimos explicar duas vezes a deixar você usar sem entender.
      </p>
    </section>
  </DocumentoLegal>
);

export default CarteiraSeguranca;
