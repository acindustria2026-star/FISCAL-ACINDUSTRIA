import { z } from 'zod';
import { onlyDigits } from '../lib/formatters';

const optStr = z.string().optional().nullable();

export const empresaSchema = z.object({
  razao_social: optStr,
  nome_fantasia: z.string().min(2, 'Nome fantasia obrigatório'),
  cnpj: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? onlyDigits(v) : null))
    .refine((v) => !v || v.length === 14, 'CNPJ deve ter 14 dígitos'),
  inscricao_estadual: optStr,
  endereco: optStr,
  cidade: optStr,
  uf: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v.toUpperCase().trim() : null))
    .refine((v) => !v || v.length === 2, 'UF deve ter 2 letras'),
  cep: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? onlyDigits(v) : null))
    .refine((v) => !v || v.length === 8, 'CEP deve ter 8 dígitos'),
  telefone: optStr,
  email: z
    .string()
    .optional()
    .nullable()
    .transform((v) => (v ? v.trim() : null))
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Email inválido'),
  site: optStr,
});

export type EmpresaInput = z.infer<typeof empresaSchema>;
