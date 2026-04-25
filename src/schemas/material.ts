import { z } from 'zod';

export const materialSchema = z.object({
  nome: z.string().min(1, 'Nome obrigatório'),
  icms_padrao: z.coerce.number().min(0, 'Não pode ser negativo').max(100, 'Máximo 100%'),
  pis_padrao: z.coerce.number().min(0).max(100),
  cofins_padrao: z.coerce.number().min(0).max(100),
});

export type MaterialInput = z.infer<typeof materialSchema>;

export const PADROES_MATERIAL = {
  icms_padrao: 18,
  pis_padrao: 1.65,
  cofins_padrao: 7.6,
} as const;
