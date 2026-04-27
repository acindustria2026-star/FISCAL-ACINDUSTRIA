import { z } from 'zod';

/**
 * Aceita string (do input HTML) OU number (caso valueAsNumber).
 * Converte pra number, suporta vírgula como separador decimal (pt-BR).
 */
function preprocessNumero(unknownInput: unknown): number {
  if (typeof unknownInput === 'number') return unknownInput;
  if (typeof unknownInput === 'string') {
    const trimmed = unknownInput.trim();
    if (trimmed === '') return NaN;
    return Number(trimmed.replace(',', '.'));
  }
  return Number(unknownInput);
}

const numeroPositivo = z.preprocess(
  preprocessNumero,
  z.number().positive('Valor deve ser maior que zero'),
);

const numeroPctPP = z.preprocess(
  preprocessNumero,
  z.number().min(0, 'Não pode ser negativo').max(100, 'Máximo 100%'),
);

export const nfFormSchema = z.object({
  numero: z.string().min(1, 'Número obrigatório').trim(),
  data: z.string().min(8, 'Data obrigatória'),
  cliente_id: z.string().nullable(),
  cliente_nome: z.string().min(2, 'Cliente obrigatório'),
  material: z.string().nullable().optional(),
  peso: numeroPositivo,
  preco_negociado: numeroPositivo,
  icms_ativo: z.boolean(),
  piscofins_ativo: z.boolean(),
  icms_pct_pp: numeroPctPP,
  pis_pct_pp: numeroPctPP,
  cofins_pct_pp: numeroPctPP,
  tipo_frete: z.enum(['CIF', 'FOB']).nullable().optional(),
  transportadora: z.string().nullable().optional(),
  placa_veiculo: z.string().nullable().optional(),
  motorista: z.string().nullable().optional(),
  pedido_id: z.string().nullable().optional(),
  pedido_numero: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  motivo_complementar: z.enum(['PESO', 'PRECO', 'IMPOSTO', 'OUTRO']).nullable().optional(),
  nf_pai_id: z.string().nullable().optional(),
  nf_pai_numero: z.string().nullable().optional(),
});

/**
 * Tipo manual do form. Campos numéricos são `string | number` —
 * inputs HTML mantém string, mas valueAsNumber/coerções podem
 * dar number. Ambos passam pelo preprocess no submit.
 */
export type NfFormData = {
  numero: string;
  data: string;
  cliente_id: string | null;
  cliente_nome: string;
  material?: string | null;
  peso: string | number;
  preco_negociado: string | number;
  icms_ativo: boolean;
  piscofins_ativo: boolean;
  icms_pct_pp: string | number;
  pis_pct_pp: string | number;
  cofins_pct_pp: string | number;
  tipo_frete?: 'CIF' | 'FOB' | null;
  transportadora?: string | null;
  placa_veiculo?: string | null;
  motorista?: string | null;
  pedido_id?: string | null;
  pedido_numero?: string | null;
  observacoes?: string | null;
  motivo_complementar?: 'PESO' | 'PRECO' | 'IMPOSTO' | 'OUTRO' | null;
  nf_pai_id?: string | null;
  nf_pai_numero?: string | null;
};

export type NfFormParsed = z.output<typeof nfFormSchema>;

export const MOTIVOS_COMPLEMENTAR = [
  { value: 'PESO', label: 'Peso' },
  { value: 'PRECO', label: 'Preço' },
  { value: 'IMPOSTO', label: 'Imposto' },
  { value: 'OUTRO', label: 'Outro' },
] as const;
