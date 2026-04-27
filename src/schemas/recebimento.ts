import { z } from 'zod';

/**
 * Aceita string (do input HTML) OU number (caso valueAsNumber).
 * Suporta vírgula como separador decimal (pt-BR).
 */
function preprocessNumero(unknownInput: unknown): number {
  if (typeof unknownInput === 'number') return unknownInput;
  if (typeof unknownInput === 'string') {
    const t = unknownInput.trim();
    if (t === '') return NaN;
    return Number(t.replace(',', '.'));
  }
  return Number(unknownInput);
}

function preprocessNumeroOpcional(unknownInput: unknown): number | null {
  if (unknownInput === null || unknownInput === undefined) return null;
  if (typeof unknownInput === 'string') {
    const t = unknownInput.trim();
    if (t === '') return null;
    return Number(t.replace(',', '.'));
  }
  if (typeof unknownInput === 'number') return unknownInput;
  return Number(unknownInput);
}

const numeroPositivo = z.preprocess(
  preprocessNumero,
  z.number().positive('Deve ser maior que zero'),
);

const numeroNaoNegativo = z.preprocess(
  preprocessNumero,
  z.number().min(0, 'Não pode ser negativo'),
);

const numeroOpcionalNaoNegativo = z.preprocess(
  preprocessNumeroOpcional,
  z.number().min(0, 'Valor inválido').nullable(),
);

export const recebimentoFormSchema = z
  .object({
    nf_id: z.string().min(1, 'NF obrigatória'),
    data_recebimento: z.string().min(8, 'Data obrigatória'),
    peso_bruto: numeroPositivo,
    impureza_kg: numeroNaoNegativo,
    pago: z.boolean(),
    data_pagamento: z.string().nullable().optional(),
    valor_real_recebido: numeroOpcionalNaoNegativo.optional(),
    observacoes: z.string().nullable().optional(),
  })
  .refine((d) => d.impureza_kg <= d.peso_bruto, {
    message: 'Impureza não pode ser maior que o peso bruto',
    path: ['impureza_kg'],
  });

/**
 * Tipo manual do form. Numéricos são `string | number` —
 * inputs HTML mantêm string, mas valueAsNumber daria number.
 * Ambos passam pelo preprocess no submit.
 */
export type RecebimentoFormData = {
  nf_id: string;
  data_recebimento: string;
  peso_bruto: string | number;
  impureza_kg: string | number;
  pago: boolean;
  data_pagamento?: string | null;
  valor_real_recebido?: string | number | null;
  observacoes?: string | null;
};

export type RecebimentoFormParsed = z.output<typeof recebimentoFormSchema>;
