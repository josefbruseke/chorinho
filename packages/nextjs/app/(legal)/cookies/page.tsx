import Link from "next/link";
import type { NextPage } from "next";
import { DocumentoLegal } from "~~/components/legal/DocumentoLegal";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Cookies",
  description: "O que o Chorinho guarda no seu navegador e por quê.",
});

const Cookies: NextPage = () => (
  <DocumentoLegal
    titulo="Cookies e armazenamento local"
    resumo="O Chorinho não usa cookie de publicidade nem de rastreamento. O que guardamos no seu navegador serve para o aplicativo funcionar e lembrar suas preferências."
    vigenteDesde="11 de setembro de 2026"
  >
    <section>
      <h2>Por que não existe banner de cookies aqui</h2>
      <p>
        Banner de consentimento existe porque a maioria dos sites carrega rastreadores de terceiros. O Chorinho não
        carrega nenhum: não temos pixel de rede social, não temos rede de anúncios e não vendemos dados. Sem isso, não
        há o que consentir.
      </p>
    </section>

    <section>
      <h2>O que guardamos, e para quê</h2>

      <h3>Sessão de acesso</h3>
      <p>
        Um cookie que mantém você conectado entre visitas. Sem ele, você teria que entrar de novo a cada vez que abrisse
        o aplicativo. É essencial e não pode ser desativado sem inviabilizar o uso.
      </p>

      <h3>Preferência de tema</h3>
      <p>Guarda se você escolheu tema claro, escuro ou o do sistema. Fica só no seu aparelho.</p>

      <h3>Última posição do mapa</h3>
      <p>
        O centro do mapa de quando você o fechou, para ele abrir no lugar certo da próxima vez. Fica só no seu aparelho
        e nunca é enviado para os nossos servidores — como explicado na{" "}
        <Link href="/privacidade">Política de Privacidade</Link>.
      </p>

      <h3>Fila de carimbos do caixa</h3>
      <p>
        No aparelho do balcão, as vendas registradas sem internet ficam guardadas localmente até a conexão voltar. Isso
        é o que permite ao caixa continuar atendendo com a rede caindo.
      </p>
    </section>

    <section>
      <h2>Como apagar</h2>
      <p>
        Limpar os dados do site nas configurações do navegador remove tudo isso. Você será desconectado e o tema volta
        ao padrão do sistema.
      </p>
      <p>No aparelho do caixa, limpar os dados também apaga carimbos ainda não sincronizados. Confira a fila antes.</p>
    </section>
  </DocumentoLegal>
);

export default Cookies;
