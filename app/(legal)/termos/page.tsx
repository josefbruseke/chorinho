import type { NextPage } from "next";
import { AvisoLegal, DocumentoLegal } from "~~/components/legal/DocumentoLegal";
import { getMetadata } from "~~/utils/metadata";

export const metadata = getMetadata({
  title: "Termos de uso",
  description: "As regras de uso do Chorinho para clientes e para estabelecimentos parceiros.",
});

// Espelha os <section id="..."> abaixo — usado pelo sumário navegável no topo do documento.
const SUMARIO = [
  { id: "o-que-o-chorinho-e", titulo: "O que o Chorinho é" },
  { id: "sua-conta", titulo: "Sua conta" },
  { id: "carimbos-pontos-e-recompensas", titulo: "Carimbos, pontos e recompensas" },
  { id: "uso-indevido", titulo: "Uso indevido" },
  { id: "para-estabelecimentos-parceiros", titulo: "Para estabelecimentos parceiros" },
  { id: "disponibilidade", titulo: "Disponibilidade" },
  { id: "seus-registros", titulo: "Seus registros" },
  { id: "mudancas-e-foro", titulo: "Mudanças e foro" },
];

const Termos: NextPage = () => (
  <DocumentoLegal
    titulo="Termos de uso"
    resumo="As regras do jogo para quem usa o Chorinho como cliente e para quem participa como estabelecimento parceiro."
    vigenteDesde="11 de setembro de 2026"
    sumario={SUMARIO}
  >
    <AvisoLegal titulo="Rascunho pendente de revisão jurídica">
      <p>
        Este texto descreve a operação real do produto, mas ainda não passou por advogado. Precisa de revisão
        profissional antes da operação comercial.
      </p>
    </AvisoLegal>

    <section id="o-que-o-chorinho-e">
      <h2>O que o Chorinho é</h2>
      <p>
        O Chorinho é uma plataforma que conecta comércios de bairro e seus clientes através de um programa de fidelidade
        compartilhado. Registramos carimbos e pontos, e oferecemos as ferramentas para o comerciante definir e entregar
        as recompensas dele.
      </p>
      <p>
        <strong>Nós não vendemos os produtos nem prestamos os serviços das lojas parceiras.</strong> Quem define o que é
        oferecido, a que preço e sob quais condições é cada estabelecimento. A relação de consumo do café, do corte de
        cabelo ou do pão é entre você e a loja.
      </p>
    </section>

    <section id="sua-conta">
      <h2>Sua conta</h2>
      <ul>
        <li>Você precisa ter 16 anos ou mais.</li>
        <li>Os dados que você informa devem ser verdadeiros.</li>
        <li>Você é responsável por proteger o acesso ao e-mail ou conta Google que usa para entrar.</li>
        <li>Uma conta por pessoa. Contas duplicadas para acumular mais carimbos serão encerradas.</li>
      </ul>
    </section>

    <section id="carimbos-pontos-e-recompensas">
      <h2>Carimbos, pontos e recompensas</h2>
      <p>
        Os carimbos são creditados pelo caixa do estabelecimento no momento da compra, segundo as regras que aquele
        comerciante configurou — valor mínimo por carimbo, teto por venda e intervalo entre carimbos.
      </p>
      <ul>
        <li>Carimbos e pontos são pessoais e intransferíveis.</li>
        <li>Não têm valor monetário e não podem ser convertidos em dinheiro.</li>
        <li>
          A recompensa é entregue pelo estabelecimento. Se ele não honrar, fale conosco: podemos mediar e, em caso de
          reincidência, suspender o parceiro.
        </li>
        <li>
          O comerciante pode encerrar o programa dele. Quando isso acontece, ele deve honrar as cartelas já completas.
        </li>
      </ul>
    </section>

    <section id="uso-indevido">
      <h2>Uso indevido</h2>
      <p>Encerramos contas, sem aviso prévio, em caso de:</p>
      <ul>
        <li>tentativa de gerar carimbos sem compra real, com ou sem a participação do caixa;</li>
        <li>uso de múltiplas contas pela mesma pessoa;</li>
        <li>tentativa de burlar limites técnicos da plataforma;</li>
        <li>uso do aplicativo para assediar, fraudar ou prejudicar comerciantes ou outros clientes.</li>
      </ul>
    </section>

    <section id="para-estabelecimentos-parceiros">
      <h2>Para estabelecimentos parceiros</h2>
      <ul>
        <li>A participação exige assinatura ativa de um dos planos.</li>
        <li>
          Com a assinatura vencida, o caixa deixa de emitir novos carimbos — mas continua obrigado a honrar os resgates
          de quem já acumulou. O cliente não pode ser penalizado por um problema de cobrança da loja.
        </li>
        <li>
          O comerciante é responsável pela veracidade do que anuncia: produtos, preços, horários e condições das
          recompensas.
        </li>
        <li>O cancelamento pode ser feito a qualquer momento e vale ao fim do ciclo já pago.</li>
      </ul>
    </section>

    <section id="disponibilidade">
      <h2>Disponibilidade</h2>
      <p>
        Trabalhamos para manter o serviço no ar, mas não garantimos funcionamento ininterrupto. Manutenções, falhas de
        terceiros e instabilidade de rede acontecem. Quando o caixa está sem internet, os carimbos ficam na fila do
        aparelho e sobem quando a conexão volta.
      </p>
    </section>

    <section id="seus-registros">
      <h2>Seus registros</h2>
      <p>
        Carimbos, resgates e selos ficam guardados na nossa base de dados, ligados à sua conta. Nós conseguimos corrigir
        um erro do balcão, e você consegue exigir que a gente apague tudo — as duas coisas valem, e é assim de
        propósito.
      </p>
    </section>

    <section id="mudancas-e-foro">
      <h2>Mudanças e foro</h2>
      <p>
        Podemos alterar estes termos. Mudanças relevantes são avisadas no aplicativo antes de entrarem em vigor. Fica
        eleito o foro do domicílio do consumidor para dirimir controvérsias.
      </p>
    </section>
  </DocumentoLegal>
);

export default Termos;
