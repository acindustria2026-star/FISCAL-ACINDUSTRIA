import { Printer, X } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  count: number;
  onLimpar: () => void;
  onImprimir: () => void;
  desabilitado?: boolean;
  motivoDesabilitado?: string | null;
}

export function BarraFlutuante({
  count,
  onLimpar,
  onImprimir,
  desabilitado,
  motivoDesabilitado,
}: Props) {
  if (count === 0) return null;

  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-3 p-3 px-4 rounded-xl border shadow-[0_4px_16px_rgba(212,160,23,0.08)]"
      style={{
        background: 'linear-gradient(135deg, var(--accent-soft-bg) 0%, rgba(212, 160, 23, 0.04) 100%)',
        borderColor: 'var(--accent-soft-border)',
      }}
    >
      <span className="w-8 h-8 rounded-full bg-accent text-[#0B0B0D] flex items-center justify-center font-bold text-sm font-mono-num flex-shrink-0">
        {count}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text">
          {count} {count === 1 ? 'nota selecionada' : 'notas selecionadas'}
        </p>
        <p className="text-xs text-text-2 truncate">
          {motivoDesabilitado ?? 'pra impressão de comprovantes'}
        </p>
      </div>
      <button
        type="button"
        onClick={onLimpar}
        className="inline-flex items-center gap-1 h-9 px-3 rounded-lg text-xs text-text-2 hover:text-text hover:bg-surface-2 transition"
      >
        <X size={13} /> Limpar
      </button>
      <Button onClick={onImprimir} disabled={desabilitado} title={motivoDesabilitado ?? undefined}>
        <Printer size={14} /> Imprimir comprovante
      </Button>
    </div>
  );
}
