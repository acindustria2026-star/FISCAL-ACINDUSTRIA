import { CheckCircle2, Clock, Package, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react';
import type { StatusCalculado } from '../../hooks/usePedidos';

interface Props {
  status: StatusCalculado;
}

const config: Record<StatusCalculado, { label: string; icon: LucideIcon; classe: string }> = {
  ativo: {
    label: 'Ativo',
    icon: Package,
    classe: 'bg-accent-soft-bg text-accent border-accent-soft-border',
  },
  'quase-fechando': {
    label: 'Quase fechando',
    icon: Sparkles,
    classe: 'bg-amber-soft-bg text-amber border-amber-soft-border',
  },
  'pronto-pra-concluir': {
    label: 'Pronto p/ concluir',
    icon: ShieldCheck,
    classe: 'bg-accent text-[#0B0B0D] border-accent',
  },
  atrasado: {
    label: 'Atrasado',
    icon: Clock,
    classe: 'bg-warn-soft-bg text-warn border-warn-soft-border',
  },
  concluido: {
    label: 'Concluído',
    icon: CheckCircle2,
    classe: 'bg-surface-3 text-text-2 border-border',
  },
};

export function StatusPedido({ status }: Props) {
  const c = config[status];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${c.classe}`}
    >
      <Icon size={12} /> {c.label}
    </span>
  );
}
