"use client";

// Cliente, e precisa continuar sendo: a lista de itens carrega REFERÊNCIAS de
// componente (os ícones), e React não consegue serializar função nenhuma de um
// componente de servidor para um de cliente. Sem esta linha a tela quebra em
// tempo de execução, com o build e o `check-types` verdes.
import {
  BanknotesIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  DevicePhoneMobileIcon,
  GiftIcon,
  RectangleStackIcon,
  ScaleIcon,
  TagIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { type ItemDeNav, NavDeBackOffice } from "~~/components/NavDeBackOffice";

/**
 * A ordem conta uma história: primeiro o que a loja é, depois a regra que ela
 * aplica, depois o que o carimbo compra — e só então a camada de coleção, que
 * se apoia em tudo isso. Programa antes de Coleção porque a peça não existe
 * sem uma regra para acionar.
 */
const ITENS: ItemDeNav[] = [
  { href: "/painel", label: "Visão geral", Icon: ChartBarIcon },
  { href: "/painel/loja", label: "Minha loja", Icon: BuildingStorefrontIcon },
  { href: "/painel/regras", label: "Regra de carimbo", Icon: ScaleIcon },
  { href: "/painel/recompensas", label: "Recompensas", Icon: GiftIcon },
  { href: "/painel/programas", label: "Programas", Icon: TagIcon },
  { href: "/painel/colecao", label: "Coleção", Icon: RectangleStackIcon },
  { href: "/painel/conquistas", label: "Conquistas", Icon: TrophyIcon },
  { href: "/painel/pdv", label: "Terminais", Icon: DevicePhoneMobileIcon },
  { href: "/painel/auditoria", label: "Auditoria", Icon: ClipboardDocumentCheckIcon },
  { href: "/painel/equipe", label: "Equipe", Icon: UsersIcon },
  { href: "/painel/assinatura", label: "Assinatura", Icon: BanknotesIcon },
];

export const PainelNav = () => (
  <NavDeBackOffice itens={ITENS} titulo="Lojista" raiz="/painel" rotulo="Painel do lojista" />
);
