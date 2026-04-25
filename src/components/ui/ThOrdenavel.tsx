import type { EstadoOrdenacao } from '../../hooks/useOrdenacao';

interface Props {
  label: string;
  col: string;
  estado: EstadoOrdenacao;
  onToggle: (col: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

export function ThOrdenavel({
  label,
  col,
  estado,
  onToggle,
  align = 'left',
  className = '',
}: Props) {
  const ativo = estado.col === col;
  const seta = !ativo ? '↕' : estado.dir === 'desc' ? '↓' : '↑';

  return (
    <th
      role="button"
      tabIndex={0}
      onClick={() => onToggle(col)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(col);
        }
      }}
      className={`cursor-pointer select-none px-3 py-2.5 font-medium hover:text-text transition ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      <span
        className={`inline-flex items-center gap-1.5 ${
          align === 'right' ? 'justify-end w-full' : ''
        }`}
      >
        {label}
        <span className={`text-xs ${ativo ? 'text-accent' : 'text-text-3'}`}>{seta}</span>
      </span>
    </th>
  );
}
