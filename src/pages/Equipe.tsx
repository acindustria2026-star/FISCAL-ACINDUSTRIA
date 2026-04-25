import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Avatar } from '../components/ui/Avatar';
import { RoleBadge } from '../components/ui/RoleBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { ModalConvidarUsuario } from '../components/equipe/ModalConvidarUsuario';
import { ModalEditarUsuario } from '../components/equipe/ModalEditarUsuario';
import { useUsuarios } from '../hooks/useUsuarios';
import { usePapel } from '../hooks/usePapel';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime } from '../lib/formatters';
import { emailParaUsuario } from '../lib/userMapper';
import type { PerfilRow } from '../types/database';

function tempoRelativo(iso: string | null): string {
  if (!iso) return 'nunca';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} dias`;
  return formatDateTime(iso);
}

export default function Equipe() {
  const { isAdmin } = usePapel();
  const lista = useUsuarios();
  const { perfil: meuPerfil } = useAuth();
  const [convidarAberto, setConvidarAberto] = useState(false);
  const [editando, setEditando] = useState<PerfilRow | null>(null);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const usuarios = lista.data ?? [];
  const ativos = usuarios.filter((u) => u.ativo).length;
  const desativados = usuarios.length - ativos;

  const ordenados = useMemo(
    () =>
      [...usuarios].sort((a, b) => {
        if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
        if (a.id === meuPerfil?.id) return -1;
        if (b.id === meuPerfil?.id) return 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      }),
    [usuarios, meuPerfil?.id],
  );

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Equipe</h1>
            <p className="text-text-2 text-sm md:text-base">
              <span className="text-text font-mono-num">{ativos}</span>{' '}
              {ativos === 1 ? 'usuário ativo' : 'usuários ativos'}
              {desativados > 0 && (
                <>
                  {' · '}
                  <span className="text-text-3 font-mono-num">{desativados}</span> desativados
                </>
              )}
            </p>
          </div>
          <Button size="lg" onClick={() => setConvidarAberto(true)}>
            <Plus size={16} /> Convidar usuário
          </Button>
        </div>
      </header>

      {lista.isLoading ? (
        <Loading fullScreen={false} text="Carregando equipe..." />
      ) : ordenados.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<Users size={32} />}
            titulo="Nenhum usuário ainda"
            descricao="Convide o primeiro membro da equipe pelo botão acima."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {ordenados.map((u) => (
            <UserCard
              key={u.id}
              usuario={u}
              ehVoce={u.id === meuPerfil?.id}
              onClick={() => setEditando(u)}
            />
          ))}
        </div>
      )}

      <ModalConvidarUsuario
        open={convidarAberto}
        onClose={() => setConvidarAberto(false)}
      />

      <ModalEditarUsuario
        open={!!editando}
        onClose={() => setEditando(null)}
        usuario={editando}
      />
    </div>
  );
}

function UserCard({
  usuario,
  ehVoce,
  onClick,
}: {
  usuario: PerfilRow;
  ehVoce: boolean;
  onClick: () => void;
}) {
  const nuncaLogou = !usuario.ultimo_acesso;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 p-4 sm:p-5 bg-surface border border-border rounded-[14px] hover:border-accent-soft-border transition text-left ${
        usuario.ativo ? '' : 'opacity-50'
      }`}
    >
      <Avatar nome={usuario.nome} papel={usuario.papel} size={48} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-base text-text font-medium truncate">{usuario.nome}</p>
          {ehVoce && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded-md bg-surface-3 text-text-3 border border-border">
              você
            </span>
          )}
          {!usuario.ativo && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded-md bg-warn-soft-bg text-warn border border-warn-soft-border">
              inativo
            </span>
          )}
          {nuncaLogou && usuario.ativo && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-px rounded-md bg-amber-soft-bg text-amber border border-amber-soft-border">
              pendente
            </span>
          )}
        </div>
        <p className="text-sm text-text-3 truncate font-mono-num">@{emailParaUsuario(usuario.email)}</p>
        <p className="text-xs text-text-3 mt-1">
          Último acesso: <span className="font-mono-num">{tempoRelativo(usuario.ultimo_acesso)}</span>
        </p>
      </div>
      <RoleBadge papel={usuario.papel} />
    </button>
  );
}
