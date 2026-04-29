import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import { Loading } from './components/ui/Loading';
import { Layout } from './components/layout/Layout';
import Setup from './pages/Setup';
import Login from './pages/Login';
import EsqueciSenha from './pages/EsqueciSenha';
import RedefinirSenha from './pages/RedefinirSenha';
import Dashboard from './pages/Dashboard';
import Cadastros from './pages/Cadastros';
import Pedidos from './pages/Pedidos';
import NotasFiscais from './pages/NotasFiscais';
import NotasEmAberto from './pages/NotasEmAberto';
import Recebimentos from './pages/Recebimentos';
import Comparativo from './pages/Comparativo';
import Financeiro from './pages/Financeiro';
import Relatorios from './pages/Relatorios';
import Auditoria from './pages/Auditoria';
import Equipe from './pages/Equipe';
import AceitarConvite from './pages/AceitarConvite';
import Backup from './pages/Backup';
import Impostos from './pages/Impostos';

export default function App() {
  const { perfil, carregando, setupNeeded } = useAuth();

  if (carregando) return <Loading />;

  return (
    <Routes>
      <Route
        path="/setup"
        element={setupNeeded ? <Setup /> : <Navigate to="/" replace />}
      />
      <Route
        path="/login"
        element={
          perfil ? (
            <Navigate to="/dashboard" replace />
          ) : setupNeeded ? (
            <Navigate to="/setup" replace />
          ) : (
            <Login />
          )
        }
      />
      <Route path="/esqueci-senha" element={<EsqueciSenha />} />
      <Route path="/redefinir-senha" element={<RedefinirSenha />} />
      <Route path="/aceitar-convite" element={<AceitarConvite />} />

      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/cadastros" element={<Cadastros />} />
        <Route path="/pedidos" element={<Pedidos />} />
        <Route path="/nfs" element={<NotasFiscais />} />
        <Route path="/em-aberto" element={<NotasEmAberto />} />
        <Route path="/recebimentos" element={<Recebimentos />} />
        <Route path="/comparativo" element={<Comparativo />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/impostos" element={<Impostos />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/auditoria" element={<Auditoria />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/backup" element={<Backup />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
