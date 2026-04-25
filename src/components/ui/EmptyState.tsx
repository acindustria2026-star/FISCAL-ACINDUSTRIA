import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, titulo, descricao, acao, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center py-12 px-6 ${className}`}>
      {icon && <div className="text-text-3 mb-3">{icon}</div>}
      <p className="font-serif-display text-xl text-text-2 italic">{titulo}</p>
      {descricao && <p className="text-sm text-text-3 mt-1.5 max-w-sm">{descricao}</p>}
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
