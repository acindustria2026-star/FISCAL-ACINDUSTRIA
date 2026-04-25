const CORES = [
  '#D4A017',
  '#6FB3F5',
  '#B68EE0',
  '#7AC9A8',
  '#E89968',
  '#9B7DD0',
  '#82C1A8',
  '#E5BC55',
];

function corDoNome(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) {
    hash = nome.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CORES[Math.abs(hash) % CORES.length];
}

function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

interface AvatarClienteProps {
  nome: string;
  size?: number;
  className?: string;
}

export function AvatarCliente({ nome, size = 34, className = '' }: AvatarClienteProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        background: corDoNome(nome),
        color: '#0B0B0D',
        fontSize: size * 0.4,
      }}
      aria-hidden
    >
      {iniciaisDe(nome)}
    </div>
  );
}
