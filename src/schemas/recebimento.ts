import { z } from 'zod';

const numero = z
  .string()
  .transform((v) => Number(v.replace(',', '.')))
  .refine((n) => Number.isFinite(n), 'Valor inválido');

const numeroNaoNegativo = numero.refine((n) => n >= 0, 'Não pode ser negativo');
const numeroPositivo = numero.refine((n) => n > 0, 'Deve ser maior que zero');

export const recebimentoFormSchema = z
  .object({
    nf_id: z.string().min(1, 'NF obrigatória'),
    data_recebimento: z.string().min(8, 'Data obrigatória'),
    peso_bruto: numeroPositivo,
    impureza_kg: numeroNaoNegativo,
    pago: z.boolean(),
    data_pagamento: z.string().nullable().optional(),
    valor_real_recebido: z
      .string()
      .transform((v) => (v.trim() === '' ? null : Number(v.replace(',', '.'))))
      .refine((n) => n === null || (Number.isFinite(n) && n >= 0), 'Valor inválido')
      .nullable()
      .optional(),
    observacoes: z.string().nullable().optional(),
  })
  .refine((d) => d.impureza_kg <= d.peso_bruto, {
    message: 'Impureza não pode ser maior que o peso bruto',
    path: ['impureza_kg'],
  });

export type RecebimentoFormData = z.input<typeof recebimentoFormSchema>;
export type RecebimentoFormParsed = z.output<typeof recebimentoFormSchema>;
