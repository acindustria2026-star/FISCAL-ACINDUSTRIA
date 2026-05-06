import { useState } from 'react';
import { Building2, Layers, Users } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { AbaEmpresa } from '../components/cadastros/AbaEmpresa';
import { AbaClientes } from '../components/cadastros/AbaClientes';
import { AbaMateriais } from '../components/cadastros/AbaMateriais';
import { useClientes } from '../hooks/useClientes';
import { useMateriais } from '../hooks/useMateriais';
import { usePapel } from '../hooks/usePapel';

type Aba = 'empresa' | 'clientes' | 'materiais';

export default function Cadastros() {
  const [aba, setAba] = useState<Aba>('empresa');
  const clientes = useClientes();
  const materiais = useMateriais();
  const { isAdmin, isOperador, isFinanceiro } = usePapel();

  if (!isAdmin && !isOperador && !isFinanceiro) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Cadastros</h1>
        <p className="text-text-2 text-sm md:text-base">
          Empresa, clientes e materiais cadastrados no sistema.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-6 bg-surface-2 border border-border rounded-full p-1 w-fit">
        <Pill ativo={aba === 'empresa'} onClick={() => setAba('empresa')} icon={<Building2 size={14} />}>
          Empresa
        </Pill>
        <Pill ativo={aba === 'clientes'} onClick={() => setAba('clientes')} icon={<Users size={14} />}>
          Clientes
          <span className="text-text-3 ml-1 font-mono-num">{clientes.data?.length ?? 0}</span>
        </Pill>
        <Pill ativo={aba === 'materiais'} onClick={() => setAba('materiais')} icon={<Layers size={14} />}>
          Materiais
          <span className="text-text-3 ml-1 font-mono-num">{materiais.data?.length ?? 0}</span>
        </Pill>
      </div>

      {aba === 'empresa' && <AbaEmpresa />}
      {aba === 'clientes' && <AbaClientes />}
      {aba === 'materiais' && <AbaMateriais />}
    </div>
  );
}

function Pill({
  ativo,
  onClick,
  icon,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 h-8 rounded-full text-xs font-medium transition ${
        ativo ? 'bg-accent text-[#0B0B0D]' : 'text-text-2 hover:text-text hover:bg-surface-3'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
