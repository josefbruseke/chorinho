import type { NextPage } from "next";
import { AvisoLegal, DocumentoLegal } from "~~/components/legal/DocumentoLegal";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Política de Privacidade",
  description: "Quais dados o Chorinho coleta, por quê, com quem compartilha e como você exerce seus direitos.",
});

// Espelha os <section id="..."> abaixo — usado pelo sumário navegável no topo do documento.
const SUMARIO = [
  { id: "em-resumo", titulo: "Em resumo" },
  { id: "quem-e-o-controlador", titulo: "Quem é o controlador" },
  { id: "que-dados-coletamos", titulo: "Que dados coletamos" },
  { id: "por-que-tratamos-cada-dado", titulo: "Por que tratamos cada dado" },
  { id: "localizacao", titulo: "Localização" },
  { id: "compartilhamento", titulo: "Compartilhamento" },
  { id: "por-quanto-tempo-guardamos", titulo: "Por quanto tempo guardamos" },
  { id: "seus-direitos", titulo: "Seus direitos" },
  { id: "quando-voce-apaga", titulo: "Quando você apaga" },
  { id: "criancas-e-adolescentes", titulo: "Crianças e adolescentes" },
  { id: "mudancas-nesta-politica", titulo: "Mudanças nesta política" },
];

const Privacidade: NextPage = () => (
  <DocumentoLegal
    titulo="Política de Privacidade"
    resumo="O que a gente coleta, por que coleta, com quem compartilha e o que você pode exigir da gente. Escrito para ser entendido, não para se proteger atrás de jargão."
    vigenteDesde="11 de setembro de 2026"
    sumario={SUMARIO}
  >
    <AvisoLegal titulo="Rascunho pendente de revisão jurídica">
      <p>
        Este documento descreve com fidelidade o funcionamento do produto, mas ainda não passou por advogado. Antes da
        operação comercial ele precisa de revisão profissional, com o nome e o CNPJ do controlador preenchidos.
      </p>
    </AvisoLegal>

    <section id="em-resumo">
      <h2>Em resumo</h2>
      <ul>
        <li>Coletamos o mínimo para o programa de fidelidade funcionar.</li>
        <li>Não vendemos seus dados e não fazemos publicidade com eles.</li>
        <li>Sua localização é usada na hora para ordenar o mapa e não fica guardada nos nossos servidores.</li>
        <li>Você pode apagar sua conta, e apagar significa apagar: carimbos, selos e histórico somem junto.</li>
      </ul>
    </section>

    <section id="quem-e-o-controlador">
      <h2>Quem é o controlador</h2>
      <p>
        O Chorinho é o controlador dos dados pessoais tratados no aplicativo, nos termos da Lei Geral de Proteção de
        Dados (Lei 13.709/2018). Os dados de contato do controlador e do encarregado serão publicados aqui antes do
        início da operação comercial.
      </p>
    </section>

    <section id="que-dados-coletamos">
      <h2>Que dados coletamos</h2>

      <h3>Quando você cria a conta</h3>
      <ul>
        <li>e-mail, que existe só para você recuperar o acesso à sua coleção;</li>
        <li>
          nome e foto, <strong>se</strong> você quiser preenchê-los — nada obriga;
        </li>
      </ul>

      <h3>Quando você usa o aplicativo</h3>
      <ul>
        <li>os estabelecimentos onde você acumulou carimbos e as recompensas resgatadas;</li>
        <li>
          a data e o estabelecimento de cada carimbo — o caixa não digita, e não registramos, o valor da sua compra;
        </li>
        <li>
          sua localização aproximada, <strong>somente enquanto o mapa está aberto</strong> e somente se você permitir.
        </li>
      </ul>

      <h3>Quando você é comerciante</h3>
      <ul>
        <li>dados do estabelecimento: nome, endereço, telefone, horários, fotos e posição no mapa;</li>
        <li>dados de cobrança da assinatura, processados pelo meio de pagamento escolhido.</li>
      </ul>

      <h3>O que a gente não coleta</h3>
      <ul>
        <li>número de cartão — quem processa pagamento é o provedor, nós nunca vemos os dados do cartão;</li>
        <li>sua localização quando o mapa está fechado;</li>
        <li>seus contatos, sua agenda ou o conteúdo do seu aparelho.</li>
      </ul>
    </section>

    <section id="por-que-tratamos-cada-dado">
      <h2>Por que tratamos cada dado</h2>
      <ul>
        <li>
          <strong>Execução do contrato:</strong> conta, carimbos, pontos, resgates e assinatura do comerciante. Sem isso
          o serviço não existe.
        </li>
        <li>
          <strong>Consentimento:</strong> localização para ordenar o mapa. Você pode recusar e o aplicativo continua
          inteiramente utilizável — basta escolher o bairro na lista.
        </li>
        <li>
          <strong>Legítimo interesse:</strong> prevenção a fraude no balcão, como limites de carimbo por venda e
          intervalo mínimo entre carimbos do mesmo cliente.
        </li>
        <li>
          <strong>Obrigação legal:</strong> guarda de registros de acesso pelo prazo exigido pelo Marco Civil da
          Internet.
        </li>
      </ul>
    </section>

    <section id="localizacao">
      <h2>Localização</h2>
      <p>
        A permissão de localização só é pedida quando você toca no botão do mapa — nunca ao abrir o aplicativo. Usamos a
        posição para ordenar os estabelecimentos por distância e pedimos precisão baixa de propósito: saber o bairro
        basta, e isso gasta menos bateria.
      </p>
      <p>
        A última posição fica salva apenas no seu próprio aparelho, para o mapa abrir no lugar certo da próxima vez. Ela{" "}
        <strong>não</strong> é enviada nem armazenada nos nossos servidores, e não montamos histórico de deslocamento de
        ninguém.
      </p>
    </section>

    <section id="compartilhamento">
      <h2>Compartilhamento</h2>
      <p>Compartilhamos dados apenas com quem é necessário para o serviço funcionar:</p>
      <ul>
        <li>
          <strong>O estabelecimento onde você usou o programa</strong> vê quantos carimbos aquele cliente tem na loja
          dele, quando foram dados e por qual terminal — identificado por um código, não por você. Ele não sabe seu
          nome, seu e-mail nem o que você faz em outras lojas.
        </li>
        <li>
          <strong>Provedor de infraestrutura</strong>, que hospeda o banco de dados e os arquivos. Desde setembro de
          2026 o banco fica em São Paulo.
        </li>
        <li>
          <strong>Meio de pagamento</strong>, apenas para a assinatura de comerciantes. Cliente não paga nada e não
          passa por lá.
        </li>
      </ul>
      <p>Não vendemos, alugamos nem cedemos dados pessoais para publicidade.</p>
    </section>

    <section id="por-quanto-tempo-guardamos">
      <h2>Por quanto tempo guardamos</h2>
      <ul>
        <li>dados da conta: enquanto ela existir;</li>
        <li>histórico de compras e resgates: 5 anos, para resolver disputas de consumo;</li>
        <li>registros de acesso: 6 meses, conforme o Marco Civil da Internet;</li>
        <li>dados de cobrança: pelo prazo fiscal aplicável.</li>
      </ul>
    </section>

    <section id="seus-direitos">
      <h2>Seus direitos</h2>
      <p>A LGPD garante que você possa, a qualquer momento:</p>
      <ul>
        <li>saber se tratamos seus dados e quais são;</li>
        <li>corrigir dado incompleto ou desatualizado;</li>
        <li>pedir a exclusão de dados tratados com base no seu consentimento;</li>
        <li>receber seus dados num formato aberto e legível;</li>
        <li>revogar consentimento, como o da localização;</li>
        <li>se opor a um tratamento e reclamar à Autoridade Nacional de Proteção de Dados.</li>
      </ul>
      <p>Para exercer qualquer um deles, fale com a gente pelo canal de contato. Respondemos em até 15 dias.</p>
    </section>

    <section id="quando-voce-apaga">
      <h2>Quando você apaga</h2>
      <p>
        Apagar sua conta apaga de verdade: perfil, e-mail, carimbos, selos e o histórico de visitas. Não sobra registro
        seu em lugar nenhum que a gente não consiga alcançar.
      </p>
      <p>
        O estabelecimento continua com os números dele — quantos carimbos deu no mês, quantas cartelas fechou. Esses
        números nunca apontaram para você: para o lojista você sempre foi um código.
      </p>
    </section>

    <section id="criancas-e-adolescentes">
      <h2>Crianças e adolescentes</h2>
      <p>
        O Chorinho não é destinado a menores de 16 anos. Se identificarmos uma conta nessa faixa sem autorização dos
        responsáveis, ela será encerrada.
      </p>
    </section>

    <section id="mudancas-nesta-politica">
      <h2>Mudanças nesta política</h2>
      <p>
        Quando alterarmos algo relevante, avisamos no aplicativo antes de a mudança valer, e a data de vigência no topo
        desta página é atualizada. Versões anteriores ficam disponíveis mediante pedido.
      </p>
    </section>
  </DocumentoLegal>
);

export default Privacidade;
