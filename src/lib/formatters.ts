export function onlyDigits(value: string | null | undefined): string {
  return (value ?? '').replace(/\D+/g, '');
}

export function formatCNPJ(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatCPF(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCEP(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatTelefone(value: string | null | undefined): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const brlFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return brlFormatter.format(0);
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return brlFormatter.format(0);
  return brlFormatter.format(n);
}

const numberFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatNumber(
  value: number | string | null | undefined,
  fractionDigits = 2,
): string {
  if (value === null || value === undefined || value === '') return '0,00';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return '0,00';
  if (fractionDigits === 2) return numberFormatter.format(n);
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatPeso(value: number | string | null | undefined): string {
  return `${formatNumber(value, 3)} kg`;
}

// Datas: delega pra dataUtils.ts, que faz fuso de Brasília corretamente
// (sem o bug clássico de "1 dia antes" em colunas YYYY-MM-DD).
export { formatarData as formatDate, formatarDataHora as formatDateTime } from './dataUtils';

export function parseBRLToNumber(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// === Aliases / formatos com dash pra valores vazios ===

export const formatarCNPJ = formatCNPJ;
export const formatarCPF = formatCPF;
export const formatarCEP = formatCEP;
export const formatarTelefone = formatTelefone;

const brlFormatter4 = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

function isVazio(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

export function brl(value: number | string | null | undefined): string {
  if (isVazio(value)) return '—';
  const n = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(n)) return '—';
  return brlFormatter.format(n);
}

export function brl4(value: number | string | null | undefined): string {
  if (isVazio(value)) return '—';
  const n = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(n)) return '—';
  return brlFormatter4.format(n);
}

export function kg(value: number | string | null | undefined): string {
  if (isVazio(value)) return '—';
  const n = typeof value === 'string' ? Number(value) : (value as number);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export { formatarData, formatarDataHora, dataHojeISO, diasEntre } from './dataUtils';
