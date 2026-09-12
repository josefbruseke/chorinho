"use client";

// Cliente, e precisa continuar sendo: a lista de itens carrega REFERÊNCIAS de
// componente (os ícones), e React não consegue serializar função nenhuma de um
// componente de servidor para um de cliente. Sem esta linha a tela quebra em
// tempo de execução, com o build e o `check-types` verdes.
import {
  BuildingStorefrontIcon,
  ClipboardDocumentListIcon,
  SignalIcon,
  SparklesIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { type ItemDeNav, NavDeBackOffice } from "~~/components/NavDeBackOffice";

const ITENS: ItemDeNav[] = [
  { href: "/admin", label: "Visão geral", Icon: Squares2X2Icon },
  { href: "/admin/estabelecimentos", label: "Estabelecimentos", Icon: BuildingStorefrontIcon },
  { href: "/admin/pontos", label: "Tipos de ponto", Icon: SparklesIcon },
  { href: "/admin/relayer", label: "Relayer", Icon: SignalIcon },
  { href: "/admin/auditoria", label: "Auditoria", Icon: ClipboardDocumentListIcon },
];

/** Mesma navegação do painel do lojista — dois back offices, um comportamento. */
export const AdminNav = () => (
  <NavDeBackOffice itens={ITENS} titulo="Plataforma" raiz="/admin" rotulo="Administração" />
);
