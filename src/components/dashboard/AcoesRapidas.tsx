import { useNavigate } from 'react-router-dom';
import { BarChart3, GitCompare, Plus, type LucideIcon } from 'lucide-react';
import { usePapel } from '../../hooks/usePapel';

interface Props {
  onNovaNF?: () => void;
}

export function AcoesRapidas({ onNovaNF }: Props) {
  const navigate = useNavigate();
  const { podeEditarNFs } = usePapel();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {podeEditarNFs && (
        <Acao
          variant="primary"
          icon={Plus}
          label="Nova nota fiscal"
          onClick={() => (onNovaNF ? onNovaNF() : navigate('/nfs'))}
        />
      )}
      <Acao
        icon={GitCompare}
        label="Ver comparativo"
        onClick={() => navigate('/comparativo')}
      />
      <Acao
        icon={BarChart3}
        label="Relatórios"
        onClick={() => navigate('/relatorios')}
      />
    </div>
  );
}

function Acao({
  icon: Icon,
  label,
  onClick,
  variant = 'secondary',
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-medium transition ${
        variant === 'primary'
          ? 'bg-accent text-[#0B0B0D] hover:brightness-110 active:brightness-95'
          : 'bg-surface border border-border text-text-2 hover:text-text hover:bg-surface-2'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
