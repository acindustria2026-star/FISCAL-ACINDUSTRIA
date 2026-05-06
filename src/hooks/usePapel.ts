import { useAuth } from '../contexts/AuthContext';
import type { Papel } from '../types/database';

// Operacional = qualquer usuário autenticado (ADMIN, OPERADOR, FINANCEIRO).
// Apenas Equipe e Auditoria ficam restritas a ADMIN.
function isOperacional(papel: Papel | null): boolean {
  return papel === 'ADMIN' || papel === 'OPERADOR' || papel === 'FINANCEIRO';
}

export function usePapel() {
  const { perfil } = useAuth();
  const papel: Papel | null = perfil?.papel ?? null;

  return {
    papel,
    isAdmin: papel === 'ADMIN',
    isOperador: papel === 'OPERADOR',
    isFinanceiro: papel === 'FINANCEIRO',
    podeEditarNFs: isOperacional(papel),
    podeVerFinanceiro: isOperacional(papel),
    podeMarcarPago: isOperacional(papel),
    podeConfigurarEmpresa: isOperacional(papel),
    podeGerenciarEquipe: papel === 'ADMIN',
    podeVerAuditoria: papel === 'ADMIN',
  };
}
