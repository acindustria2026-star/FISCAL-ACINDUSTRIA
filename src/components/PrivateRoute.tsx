import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from './ui/Loading';

interface PrivateRouteProps {
  children: ReactNode;
}

export function PrivateRoute({ children }: PrivateRouteProps) {
  const { perfil, carregando } = useAuth();

  if (carregando) return <Loading />;
  if (!perfil) return <Navigate to="/login" replace />;
  if (!perfil.ativo) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
