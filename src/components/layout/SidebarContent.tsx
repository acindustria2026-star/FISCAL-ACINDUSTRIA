import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { KeyRound, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../hooks/useEmpresa';
import { Avatar } from '../ui/Avatar';
import { Logo } from '../ui/Logo';
import { RoleBadge } from '../ui/RoleBadge';
import { ModalTrocarSenha } from '../equipe/ModalTrocarSenha';
import { emailParaUsuario } from '../../lib/userMapper';
import { filtrarMenu } from './menuItems';

interface SidebarContentProps {
  onNavigate?: () => void;
}

export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { perfil, logout } = useAuth();
  const empresa = useEmpresa();
  const itens = filtrarMenu(perfil?.papel ?? null);
  const [trocarSenhaAberto, setTrocarSenhaAberto] = useState(false);

  if (!perfil) return null;

  return (
    <div className="flex flex-col h-full p-4 gap-2">
      <div className="flex items-center gap-2.5 pb-4 border-b border-border-soft">
        <Logo size={36} />
        <div className="min-w-0">
          <p className="font-serif-display text-base leading-tight truncate">
            {empresa.data?.nome_fantasia ?? 'Controle Fiscal'}
          </p>
          <p className="text-[10px] tracking-widest uppercase text-text-3 mt-0.5">Fiscal</p>
        </div>
      </div>

      <p className="text-[10px] tracking-[0.16em] uppercase text-text-3 px-2.5 pt-3 pb-1">
        Operação
      </p>

      <nav className="flex flex-col gap-0.5 flex-1 overflow-y-auto -mx-1 px-1">
        {itens.map((item, idx) =>
          item.type === 'separator' ? (
            <div key={`sep-${idx}`} className="h-px bg-border-soft my-2 mx-2" />
          ) : (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] transition ${
                  isActive
                    ? 'bg-surface-3 text-text font-medium'
                    : 'text-text-2 hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-accent rounded-full" />
                  )}
                  <item.icone
                    size={16}
                    className={isActive ? 'text-accent' : 'text-text-3'}
                    strokeWidth={isActive ? 2.25 : 1.75}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ),
        )}
      </nav>

      <div className="mt-2 pt-4 border-t border-border-soft flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Avatar nome={perfil.nome} papel={perfil.papel} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm text-text truncate">{perfil.nome}</p>
              <RoleBadge papel={perfil.papel} />
            </div>
            <p className="text-xs text-text-3 truncate font-mono-num">@{emailParaUsuario(perfil.email)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              setTrocarSenhaAberto(true);
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs text-text-2 hover:text-text hover:bg-surface-2 border border-border transition"
          >
            <KeyRound size={13} /> Trocar senha
          </button>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              void logout();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg text-xs text-text-2 hover:text-warn hover:bg-warn-soft-bg border border-border transition"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>

      <ModalTrocarSenha open={trocarSenhaAberto} onClose={() => setTrocarSenhaAberto(false)} />
    </div>
  );
}
