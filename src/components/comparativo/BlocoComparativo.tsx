import type { ReactNode } from 'react';

type Cor = 'default' | 'accent' | 'warn' | 'muted';

const corClass: Record<Cor, string> = {
  default: 'text-text',
  accent: 'text-accent',
  warn: 'text-warn',
  muted: 'text-text-3',
};

export function BlocoComparativo({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] uppercase tracking-[0.16em] text-text-3 font-semibold">{titulo}</p>
      <div className="flex flex-col gap-1.5">{children}</div>
    </div>
  );
}

export function LinhaComparativo({
  label,
  valor,
  cor = 'default',
  destaque,
}: {
  label: string;
  valor: ReactNode;
  cor?: Cor;
  destaque?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-text-3 text-xs">{label}</span>
      <span
        className={`font-mono-num ${corClass[cor]} ${destaque ? 'font-semibold' : ''}`}
      >
        {valor}
      </span>
    </div>
  );
}
