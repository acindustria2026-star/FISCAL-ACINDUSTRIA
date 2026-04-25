import { z } from 'zod';

const numeroPositivo = z
  .string()
  .transform((v) => Number(v.replace(',', '.')))
  .refine((n) => Number.isFinite(n) && n > 0, 'Valor deve ser maior que zero');

const numeroOpcionalPositivo = z
  .string()
  .transform((v) => (v.trim() === '' ? null : Number(v.replace(',', '.'))))
  .refine(
    (n) => n === null || (Number.isFinite(n) && n > 0),
    'Valor deve ser maior que zero',
  )
  .nullable();

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

export type PedidoFormData = z.input<typeof pedidoFormSchema>;
export type PedidoFormParsed = z.output<typeof pedidoFormSchema>;
