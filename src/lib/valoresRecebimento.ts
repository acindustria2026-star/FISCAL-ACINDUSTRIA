export interface RecebimentoValores {
  valor_pago?: number | null;
  valor_real_recebido?: number | null;
}

/**
 * Prioriza valor_real_recebido; se vazio, usa valor_pago como fallback.
 */
export function obterValorRealmentePago(rec: RecebimentoValores | null | undefined): number {
  if (!rec) return 0;
  const real = Number(rec.valor_real_recebido ?? 0);
  const calc = Number(rec.valor_pago ?? 0);
  return real > 0 ? real : calc;
}

/**
 * Diferença entre valor real e calculado. Null se não houver os dois pra comparar.
 */
export function obterDiferencaValor(rec: RecebimentoValores | null | undefined): number | null {
  if (!rec) return null;
  const real = Number(rec.valor_real_recebido ?? 0);
  const calc = Number(rec.valor_pago ?? 0);
  if (real === 0 || calc === 0) return null;
  const dif = real - calc;
  if (Math.abs(dif) < 0.01) return null;
  return dif;
}

export function formatarBRL(v: number): string {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
