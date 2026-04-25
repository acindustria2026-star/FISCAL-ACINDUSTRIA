import { useAuth } from '../contexts/AuthContext';
import type { Papel } from '../types/database';

export function usePapel() {
  const { perfil } = useAuth();
  const papel: Papel | null = perfil?.papel ?? null;

  return {
    papel,
    isAdmin: papel === 'ADMIN',
    isOperador: papel === 'OPERADOR',
    isFinanceiro: papel === 'FINANCEIRO',
    podeEditarNFs: papel === 'ADMIN' || papel === 'OPERADOR',
    podeVerFinanceiro: papel === 'ADMIN' || papel === 'FINANCEIRO',
    podeMarcarPago: papel === 'ADMIN' || papel === 'FINANCEIRO',
    podeGerenciarEquipe: papel === 'ADMIN',
    podeVerAuditoria: papel === 'ADMIN',
    podeConfigurarEmpresa: papel === 'ADMIN',
  };
}
