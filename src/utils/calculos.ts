export interface CalcParams {
  peso: number;
  precoNegociado: number;
  icmsAtivo: boolean;
  piscofinsAtivo: boolean;
  icmsPct?: number;
  pisPct?: number;
  cofinsPct?: number;
}

export interface CalcResult {
  valorNegociado: number;
  valorFinal: number;
  icms: number;
  pis: number;
  cofins: number;
  totalImpostos: number;
  precoFinalKg: number;
  totalAlqDecimal: number;
}

export const ALIQUOTAS_PADRAO = {
  ICMS: 0.18,
  PIS: 0.0165,
  COFINS: 0.076,
} as const;

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

/**
 * Cálculo fiscal de NF de reciclagem: impostos AGREGADOS ao valor (não somados por fora).
 * valorFinal = valorNegociado / (1 - totalAlq)
 *
 * Exemplo: peso 1000, preço 0,95, alíquotas padrão (27,25%):
 *   valorNegociado = 950
 *   divisor = 0,7275
 *   valorFinal = 1305,84
 */
export function calcularImpostos(params: CalcParams): CalcResult {
  const peso = Number.isFinite(params.peso) ? params.peso : 0;
  const precoNegociado = Number.isFinite(params.precoNegociado) ? params.precoNegociado : 0;

  const icmsPct = params.icmsAtivo ? (params.icmsPct ?? ALIQUOTAS_PADRAO.ICMS) : 0;
  const pisPct = params.piscofinsAtivo ? (params.pisPct ?? ALIQUOTAS_PADRAO.PIS) : 0;
  const cofinsPct = params.piscofinsAtivo ? (params.cofinsPct ?? ALIQUOTAS_PADRAO.COFINS) : 0;

  const valorNegociado = peso * precoNegociado;
  const totalPct = icmsPct + pisPct + cofinsPct;

  if (totalPct >= 1) {
    return {
      valorNegociado: round2(valorNegociado),
      valorFinal: round2(valorNegociado),
      icms: 0,
      pis: 0,
      cofins: 0,
      totalImpostos: 0,
      precoFinalKg: peso > 0 ? round4(valorNegociado / peso) : 0,
      totalAlqDecimal: totalPct,
    };
  }

  const divisor = 1 - totalPct;
  const valorFinal = totalPct > 0 ? valorNegociado / divisor : valorNegociado;
  const totalImpostos = valorFinal - valorNegociado;

  return {
    valorNegociado: round2(valorNegociado),
    valorFinal: round2(valorFinal),
    icms: round2(valorFinal * icmsPct),
    pis: round2(valorFinal * pisPct),
    cofins: round2(valorFinal * cofinsPct),
    totalImpostos: round2(totalImpostos),
    precoFinalKg: peso > 0 ? round4(valorFinal / peso) : 0,
    totalAlqDecimal: totalPct,
  };
}
