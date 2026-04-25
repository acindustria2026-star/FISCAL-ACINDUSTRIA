import type { Papel } from '../../types/database';

interface RoleBadgeProps {
  papel: Papel;
  className?: string;
}

const labels: Record<Papel, string> = {
  ADMIN: 'Admin',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
};

const styles: Record<Papel, string> = {
  ADMIN:
    'text-role-admin bg-accent-soft-bg border-accent-soft-border',
  OPERADOR:
    'text-role-operador bg-[#0E1F33] border-[#1E3A5F]',
  FINANCEIRO:
    'text-role-financeiro bg-[#1E1330] border-[#3A2553]',
};

export function RoleBadge({ papel, className = '' }: RoleBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${styles[papel]} ${className}`}
    >
      {labels[papel]}
    </span>
  );
}
