import { ArrowRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { brl, kg as fmtKg } from '../../lib/formatters';

interface Props {
  qtd: number;
  valor: number;
  peso: number;
}

export function CardEmAberto({ qtd, valor, peso }: Props) {
  const navigate = useNavigate();

  if (qtd === 0) {
    return (
      <div className="rounded-[14px] border border-border-soft bg-surface p-5 text-center">
        <p className="text-xs uppercase tracking-[0.16em] text-text-3 mb-1">Em aberto</p>
        <p className="text-sm text-text-2">
          <span className="text-accent">✓</span> Tudo recebido — sem NFs aguardando.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/em-aberto')}
      className="group relative w-full text-left rounded-[14px] border border-accent-soft-border p-5 transition hover:-translate-y-0.5 hover:border-accent hover:shadow-[0_8px_24px_rgba(212,160,23,0.15)]"
      style={{ background: 'linear-gradient(135deg, #2A2010 0%, transparent 100%)' }}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-accent-soft-bg border border-accent-soft-border flex items-center justify-center text-accent flex-shrink-0">
          <Clock size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-accent font-semibold">
            Em aberto · aguardando recebimento
          </p>
          <p
            className="font-serif-display font-mono-num text-3xl md:text-4xl text-accent leading-none mt-1"
            style={{
              background: 'linear-gradient(135deg, #F5C44A 0%, #D4A017 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {brl(valor)}
          </p>
          <p className="text-xs text-text-2 mt-1.5 font-mono-num">
            {qtd} {qtd === 1 ? 'nota' : 'notas'} · {fmtKg(peso)}
          </p>
        </div>
        <div className="flex items-center gap-1 text-sm text-text-2 group-hover:text-accent transition">
          <span className="hidden sm:inline">Ver todas</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </button>
  );
}
