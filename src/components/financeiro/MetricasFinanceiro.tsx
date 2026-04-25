import { AlertTriangle, CheckCircle2, ChevronRight, Clock, type LucideIcon, TrendingUp } from 'lucide-react';
import { brl } from '../../lib/formatters';
import type { MetricasFinanceiroData } from '../../hooks/useFinanceiro';

export type AbaFinanceiro = 'pagas' | 'aReceber' | 'atrasadas';

interface Props {
  metricas: MetricasFinanceiroData;
  aba: AbaFinanceiro;
  onChangeAba: (aba: AbaFinanceiro) => void;
}

export function MetricasFinanceiro({ metricas, aba, onChangeAba }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <CardMetrica
        icon={CheckCircle2}
        label="Recebido"
        valor={brl(metricas.totalRecebido)}
        meta={`${metricas.qtdPagas} ${metricas.qtdPagas === 1 ? 'NF paga' : 'NFs pagas'}`}
        ativa={aba === 'pagas'}
        onClick={() => onChangeAba('pagas')}
      />
      <CardMetrica
        icon={Clock}
        label="A receber"
        valor={brl(metricas.totalAReceber)}
        meta={`${metricas.qtdAReceber} ${metricas.qtdAReceber === 1 ? 'NF pendente' : 'NFs pendentes'}`}
        ativa={aba === 'aReceber'}
        onClick={() => onChangeAba('aReceber')}
      />
      <CardMetrica
        icon={AlertTriangle}
        label="Atrasadas"
        valor={brl(metricas.totalAtrasadas)}
        meta={`${metricas.qtdAtrasadas} ${metricas.qtdAtrasadas === 1 ? 'NF atrasada' : 'NFs atrasadas'}`}
        ativa={aba === 'atrasadas'}
        onClick={() => onChangeAba('atrasadas')}
        tom={metricas.qtdAtrasadas > 0 ? 'warn' : 'default'}
      />
      <CardMetrica
        icon={TrendingUp}
        label="Ticket médio"
        valor={brl(metricas.ticketMedio)}
        meta={
          metricas.qtdPagas > 0
            ? `entre as ${metricas.qtdPagas} pagas`
            : 'sem pagamentos no período'
        }
        tom="muted"
      />
    </div>
  );
}

interface CardProps {
  icon: LucideIcon;
  label: string;
  valor: string;
  meta: string;
  ativa?: boolean;
  onClick?: () => void;
  tom?: 'default' | 'warn' | 'muted';
}

function CardMetrica({ icon: Icon, label, valor, meta, ativa, onClick, tom = 'default' }: CardProps) {
  const clicavel = !!onClick;
  const corBorda = ativa
    ? tom === 'warn'
      ? 'border-warn shadow-[0_4px_16px_rgba(232,93,93,0.2)]'
      : 'border-accent shadow-[0_4px_16px_rgba(212,160,23,0.15)]'
    : tom === 'warn'
      ? 'border-warn-soft-border'
      : 'border-border';

  const corValor = tom === 'warn' ? 'text-warn' : tom === 'muted' ? 'text-text-2' : 'text-text';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clicavel}
      className={`relative group bg-surface border rounded-[14px] p-5 transition text-left w-full ${corBorda} ${
        clicavel
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(212,160,23,0.1)]'
          : 'cursor-default'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-text-3">
          <Icon size={14} className={tom === 'warn' ? 'text-warn' : ''} />
          <span className="text-[10px] uppercase tracking-[0.12em]">{label}</span>
        </div>
        {ativa && <ChevronRight size={14} className="text-accent" />}
      </div>
      <p
        className={`font-serif-display font-mono-num leading-none mt-2 ${corValor}`}
        style={{ fontSize: 26 }}
      >
        {valor}
      </p>
      <p className="text-xs text-text-3 mt-2">{meta}</p>
    </button>
  );
}
