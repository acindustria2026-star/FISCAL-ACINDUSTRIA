import {
  BarChart3,
  Clock,
  Database,
  FileText,
  GitCompare,
  HardDrive,
  LayoutDashboard,
  Package,
  PackageCheck,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import type { Papel } from '../../types/database';

export type MenuEntry =
  | {
      type: 'item';
      path: string;
      label: string;
      icone: LucideIcon;
      papeis: Papel[];
    }
  | { type: 'separator'; papeis: Papel[] };

export const MENU: MenuEntry[] = [
  {
    type: 'item',
    path: '/dashboard',
    label: 'Visão geral',
    icone: LayoutDashboard,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/pedidos',
    label: 'Pedidos',
    icone: Package,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/nfs',
    label: 'Notas fiscais',
    icone: FileText,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/em-aberto',
    label: 'Notas em aberto',
    icone: Clock,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/recebimentos',
    label: 'Recebimentos',
    icone: PackageCheck,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/financeiro',
    label: 'Financeiro',
    icone: Wallet,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/impostos',
    label: 'Impostos',
    icone: Receipt,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/comparativo',
    label: 'Comparativo',
    icone: GitCompare,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/relatorios',
    label: 'Relatórios',
    icone: BarChart3,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  {
    type: 'item',
    path: '/cadastros',
    label: 'Cadastros',
    icone: Database,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
  { type: 'separator', papeis: ['ADMIN'] },
  {
    type: 'item',
    path: '/equipe',
    label: 'Equipe',
    icone: Users,
    papeis: ['ADMIN'],
  },
  {
    type: 'item',
    path: '/auditoria',
    label: 'Auditoria',
    icone: ShieldCheck,
    papeis: ['ADMIN'],
  },
  { type: 'separator', papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'] },
  {
    type: 'item',
    path: '/backup',
    label: 'Backup',
    icone: HardDrive,
    papeis: ['ADMIN', 'OPERADOR', 'FINANCEIRO'],
  },
];

export function filtrarMenu(papel: Papel | null): MenuEntry[] {
  if (!papel) return [];
  return MENU.filter((entry) => entry.papeis.includes(papel));
}
