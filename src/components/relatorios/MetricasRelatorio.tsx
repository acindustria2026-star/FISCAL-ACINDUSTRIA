import { Fragment, type ReactNode } from 'react';

export interface MetricaSlim {
  label: string;
  valor: ReactNode;
  tom?: 'default' | 'accent' | 'warn';
}

const corClass: Record<NonNullable<MetricaSlim['tom']>, string> = {
  default: 'text-text',
  accent: 'text-accent',
  warn: 'text-warn',
};

export function MetricasRelatorio({ metricas }: { metricas: MetricaSlim[] }) {
  if (metricas.length === 0) return null;
  return (
    <div className="bg-surface-2 border border-border-soft rounded-xl px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
      {metricas.map((m, i) => (
        <Fragment key={`${m.label}-${i}`}>
          {i > 0 && <span className="hidden sm:inline-block w-px h-6 bg-border-soft" />}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-3">{m.label}</span>
            <span className={`text-sm font-mono-num font-semibold ${corClass[m.tom ?? 'default']}`}>
              {m.valor}
            </span>
          </div>
        </Fragment>
      ))}
    </div>
  );
}
