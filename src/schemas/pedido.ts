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
  z.number().positive('Valor deve ser maior que zero'),
);

const numeroOpcionalPositivo = z.preprocess(
  preprocessNumeroOpcional,
  z.number().positive('Valor deve ser maior que zero').nullable(),
);

export const pedidoFormSchema = z
  .object({
    numero: z.string().trim().optional(),
    cliente_id: z.string().nullable(),
    cliente_nome: z.string().min(2, 'Cliente obrigatório'),
    material: z.string().nullable().optional(),
    peso_total: numeroPositivo,
    preco_referencia: numeroOpcionalPositivo,
    data_inicio: z.string().min(8, 'Data de início obrigatória'),
    prazo: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v && v.length >= 8 ? v : null)),
    observacoes: z.string().nullable().optional(),
  })
  .refine((d) => !d.prazo || d.prazo >= d.data_inicio, {
    message: 'Prazo não pode ser antes da data de início',
    path: ['prazo'],
  });

/**
 * Tipo manual do form. Numéricos são `string | number` —
 * inputs HTML mantêm string, mas valueAsNumber daria number.
 * Ambos passam pelo preprocess no submit.
 */
export type PedidoFormData = {
  numero?: string;
  cliente_id: string | null;
  cliente_nome: string;
  material?: string | null;
  peso_total: string | number;
  preco_referencia: string | number | null;
  data_inicio: string;
  prazo?: string | null;
  observacoes?: string | null;
};

export type PedidoFormParsed = z.output<typeof pedidoFormSchema>;
