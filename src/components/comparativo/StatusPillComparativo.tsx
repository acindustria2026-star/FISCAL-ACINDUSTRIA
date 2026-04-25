import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { StatusComparativo } from '../../hooks/useComparativo';

interface Props {
  status: StatusComparativo;
}

export function StatusPillComparativo({ status }: Props) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-accent-soft-bg text-accent border-accent-soft-border">
        <CheckCircle2 size={12} /> OK
      </span>
    );
  }
  if (status === 'divergente') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-warn-soft-bg text-warn border-warn-soft-border">
        <AlertTriangle size={12} /> Divergente
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border bg-amber-soft-bg text-amber border-amber-soft-border">
      <Clock size={12} /> Aguardando
    </span>
  );
}

export const corBarraStatus: Record<StatusComparativo, string> = {
  ok: 'bg-accent',
  divergente: 'bg-warn',
  aguardando: 'bg-amber',
};
