import Link from "next/link";
import type { NextPage } from "next";
import { CheckIcon, DevicePhoneMobileIcon, SignalSlashIcon, UsersIcon } from "@heroicons/react/24/outline";
import { getMetadata } from "~~/utils/scaffold-eth/getMetadata";

export const metadata = getMetadata({
  title: "Para comerciantes",
  description: "Coloque seu comércio no Chorinho: fidelidade sem maquininha nova e sem cartão de papel.",
});

const ARGUMENTOS = [
  {
    Icon: DevicePhoneMobileIcon,
    titulo: "Sem equipamento novo",
    texto:
      "Qualquer celular ou tablet com câmera vira o terminal do balcão. Abre no navegador e instala na tela inicial.",
  },
  {
    Icon: SignalSlashIcon,
    titulo: "Funciona com a internet caindo",
    texto:
      "As vendas ficam numa fila no próprio aparelho e sobem sozinhas quando a conexão volta. O atendente vê quantas estão pendentes.",
  },
  {
    Icon: UsersIcon,
    titulo: "O bairro traz cliente para você",
    texto:
      "Quem junta pontos numa loja da rede pode gastar na sua. Em vez de disputar o mesmo cliente, o comércio local se ajuda.",
  },
];

const PLANOS = [
  {
    nome: "Balcão",
    para: "Uma loja, começando agora",
    itens: ["1 estabelecimento", "2 operadores de caixa", "20 produtos", "5 recompensas"],
  },
  {
    nome: "Bairro",
    para: "Quem quer aparecer mais",
    itens: ["Destaque no mapa", "Campanhas relâmpago", "6 operadores", "Peças exclusivas por tempo de casa"],
    destaque: true,
  },
  {
    nome: "Rede",
    para: "Mais de uma unidade",
    itens: ["Multi-unidade", "Relatórios", "Tipo de ponto próprio", "Operadores ilimitados"],
  },
];

const ParaComerciantes: NextPage = () => (
  <div className="w-full max-w-4xl mx-auto px-5 py-10 flex flex-col gap-10">
    <header className="flex flex-col gap-3 text-center items-center">
      <h1 className="text-3xl sm:text-5xl font-serif font-black m-0 tracking-tight text-secondary text-balance">
        Fidelidade de verdade, sem cartãozinho de papel
      </h1>
      <p className="m-0 opacity-80 leading-relaxed max-w-2xl text-balance">
        Seu cliente já volta. O Chorinho registra essa volta, dá motivo para a próxima e mostra sua loja para quem anda
        pelo bairro.
      </p>
    </header>

    <section className="grid sm:grid-cols-3 gap-4">
      {ARGUMENTOS.map(({ Icon, titulo, texto }) => (
        <div key={titulo} className="p-5 rounded-box border border-base-300 bg-base-100 flex flex-col gap-2">
          <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </span>
          <h2 className="font-serif font-extrabold text-base m-0 text-secondary">{titulo}</h2>
          <p className="m-0 text-sm opacity-80 leading-relaxed">{texto}</p>
        </div>
      ))}
    </section>

    <section className="flex flex-col gap-4">
      <h2 className="text-2xl font-serif font-black m-0 text-secondary text-center">Planos</h2>
      <div className="grid sm:grid-cols-3 gap-4">
        {PLANOS.map(({ nome, para, itens, destaque }) => (
          <div
            key={nome}
            className={`p-5 rounded-box border bg-base-100 flex flex-col gap-3 ${
              destaque ? "border-primary shadow-md" : "border-base-300"
            }`}
          >
            <div>
              <h3 className="font-serif font-extrabold text-lg m-0 text-secondary">{nome}</h3>
              <span className="text-xs opacity-70">{para}</span>
            </div>
            <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
              {itens.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm opacity-85">
                  <CheckIcon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="m-0 text-center text-xs opacity-75">
        Os preços ainda estão sendo definidos e serão publicados antes da abertura para cadastro.
      </p>
    </section>

    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Link href="/cadastro" className="btn btn-primary min-h-14 rounded-2xl font-black">
        Quero cadastrar meu comércio
      </Link>
      <Link href="/ajuda" className="btn btn-ghost min-h-12 rounded-2xl font-bold">
        Tenho dúvidas
      </Link>
    </div>
  </div>
);

export default ParaComerciantes;
