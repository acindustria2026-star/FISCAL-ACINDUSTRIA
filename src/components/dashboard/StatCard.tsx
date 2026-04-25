import { ArrowRight, type LucideIcon } from 'lucide-react';

type Cor = 'default' | 'accent' | 'warn' | 'muted';

interface Props {
  icon: LucideIcon;
  label: string;
  valor: string | number;
  sublabel?: string;
  corValor?: Cor;
  destaque?: boolean;
  onClick?: () => void;
}

const corClass: Record<Cor, string> = {
  default: 'text-text',
  accent: 'text-accent',
  warn: 'text-warn',
  muted: 'text-text-2',
};

export function StatCard({
  icon: Icon,
  label,
  valor,
  sublabel,
  corValor = 'default',
  destaque,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group relative text-left bg-surface border rounded-[14px] p-5 transition w-full ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(212,160,23,0.1)]'
          : 'cursor-default'
      } ${
        destaque
          ? 'border-warn shadow-[0_0_0_1px_rgba(232,93,93,0.1)]'
          : 'border-border hover:border-accent-soft-border'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-text-3">
          <Icon size={14} />
          <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
        </div>
        {onClick && (
          <ArrowRight
            size={14}
            className="text-text-3 opacity-0 group-hover:opacity-100 group-hover:text-accent transition"
          />
        )}
      </div>
      <p className={`font-serif-display font-mono-num text-4xl leading-none mt-2 ${corClass[corValor]}`}>
        {valor}
      </p>
      {sublabel && <p className="text-xs text-text-3 mt-2">{sublabel}</p>}
    </button>
  );
}
