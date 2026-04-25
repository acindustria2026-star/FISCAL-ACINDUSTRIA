import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import type { Papel } from '../../types/database';

interface PermissaoGuardProps {
  papeis: Papel[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissaoGuard({ papeis, children, fallback = null }: PermissaoGuardProps) {
  const { perfil } = useAuth();
  if (!perfil || !papeis.includes(perfil.papel)) return <>{fallback}</>;
  return <>{children}</>;
}
