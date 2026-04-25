import { Printer, type LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  icon: LucideIcon;
  titulo: string;
  descricao: string;
  onImprimir?: () => void;
  desabilitarImprimir?: boolean;
  motivoDesabilitar?: string | null;
}

export function CabecalhoRelatorio({
  icon: Icon,
  titulo,
  descricao,
  onImprimir,
  desabilitarImprimir,
  motivoDesabilitar,
}: Props) {
  return (
    <div className="flex items-start gap-4 p-5 bg-surface rounded-xl border border-border">
      <div className="w-12 h-12 rounded-xl bg-accent-soft-bg border border-accent-soft-border flex items-center justify-center text-accent flex-shrink-0">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-medium text-text">{titulo}</h3>
        <p className="text-sm text-text-2 mt-0.5">{descricao}</p>
      </div>
      {onImprimir && (
        <Button
          onClick={onImprimir}
          disabled={desabilitarImprimir}
          title={motivoDesabilitar ?? undefined}
        >
          <Printer size={14} /> Imprimir
        </Button>
      )}
    </div>
  );
}
