import type { Papel } from '../../types/database';

interface AvatarProps {
  nome: string;
  papel?: Papel;
  size?: number;
  className?: string;
}

const corPorPapel: Record<Papel, string> = {
  ADMIN: 'var(--role-admin)',
  OPERADOR: 'var(--role-operador)',
  FINANCEIRO: 'var(--role-financeiro)',
};

export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  const primeira = partes[0][0];
  const ultima = partes[partes.length - 1][0];
  return `${primeira}${ultima}`.toUpperCase();
}

export function Avatar({ nome, papel, size = 36, className = '' }: AvatarProps) {
  const bg = papel ? corPorPapel[papel] : 'var(--surface-3)';
  return (
    <div
      className={`rounded-full flex items-center justify-center flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: '#0B0B0D',
        fontWeight: 600,
        fontSize: size * 0.4,
      }}
      aria-hidden
    >
      {iniciaisDe(nome)}
    </div>
  );
}
