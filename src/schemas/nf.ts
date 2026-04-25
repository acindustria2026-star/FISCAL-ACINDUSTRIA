import { z } from 'zod';

const numeroPositivo = z
  .string()
  .transform((v) => Number(v.replace(',', '.')))
  .refine((n) => Number.isFinite(n) && n > 0, 'Valor deve ser maior que zero');

const numeroNaoNegativo = z
  .string()
  .transform((v) => Number(v.replace(',', '.')))
  .refine((n) => Number.isFinite(n) && n >= 0, 'Valor não pode ser negativo');

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
  icms_pct_pp: numeroNaoNegativo,
  pis_pct_pp: numeroNaoNegativo,
  cofins_pct_pp: numeroNaoNegativo,
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

export type NfFormData = z.input<typeof nfFormSchema>;
export type NfFormParsed = z.output<typeof nfFormSchema>;

export const MOTIVOS_COMPLEMENTAR = [
  { value: 'PESO', label: 'Peso' },
  { value: 'PRECO', label: 'Preço' },
  { value: 'IMPOSTO', label: 'Imposto' },
  { value: 'OUTRO', label: 'Outro' },
] as const;
