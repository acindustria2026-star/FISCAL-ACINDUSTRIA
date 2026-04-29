// Helpers de data com fuso de Brasília (UTC-3) — evita o bug clássico de
// "1 dia antes" que aparece quando new Date('2026-04-28') é interpretado como UTC.

const TZ_BRASILIA = 'America/Sao_Paulo';

export function formatarData(data: string | Date | null | undefined): string {
  if (!data) return '—';

  let str: string;
  if (data instanceof Date) {
    if (isNaN(data.getTime())) return '—';
    str = data.toISOString().split('T')[0];
  } else {
    str = String(data);
  }

  // Caminho rápido: YYYY-MM-DD (date column do Postgres) — só rearranja, sem parse.
  const apenas10 = str.substring(0, 10);
  const partes = apenas10.split('-');

  if (partes.length === 3 && partes[0].length === 4) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  // Fallback: tenta parsear como ISO completa, formatando em Brasília.
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleDateString('pt-BR', {
      timeZone: TZ_BRASILIA,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function formatarDataHora(data: string | Date | null | undefined): string {
  if (!data) return '—';

  try {
    const d = data instanceof Date ? data : new Date(data as string);
    if (isNaN(d.getTime())) return '—';

    return d.toLocaleString('pt-BR', {
      timeZone: TZ_BRASILIA,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// Data atual em YYYY-MM-DD considerando fuso de Brasília — não pega o
// dia errado quando o servidor está em UTC.
export function dataHojeISO(): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ_BRASILIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  // 'en-CA' devolve YYYY-MM-DD, que é o formato que precisamos.
  return partes;
}

export function diasEntre(dataInicio: string, dataFim: string): number {
  const inicio = new Date(dataInicio.substring(0, 10) + 'T00:00:00');
  const fim = new Date(dataFim.substring(0, 10) + 'T00:00:00');
  const diff = fim.getTime() - inicio.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
