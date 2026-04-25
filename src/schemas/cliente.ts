import { z } from 'zod';
import { onlyDigits } from '../lib/formatters';

const nullableTrimmed = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v === undefined || v === null ? null : v.trim() || null));

export const clienteSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  cnpj: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? onlyDigits(v) : null))
    .refine((v) => !v || v.length === 14, 'CNPJ deve ter 14 dígitos'),
  email: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email inválido'),
  telefone: nullableTrimmed,
  endereco: nullableTrimmed,
  observacoes: nullableTrimmed,
});

export type ClienteInput = z.infer<typeof clienteSchema>;
