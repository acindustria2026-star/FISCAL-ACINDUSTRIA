import { Avatar } from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { usePresenca } from '../../hooks/usePresenca';

const ROLE_LABEL: Record<string, string> = {
  ADMIN: 'Admin',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
};

export function IndicadorOnline() {
  const { user } = useAuth();
  const usuarios = usePresenca();

  const outros = usuarios.filter((u) => u.id !== user?.id);
  if (outros.length === 0) return null;

  const visiveis = outros.slice(0, 3);
  const extras = Math.max(outros.length - 3, 0);

  return (
    <div className="hidden md:flex items-center gap-2">
      <div className="flex -space-x-2">
        {visiveis.map((u) => (
          <span
            key={u.id}
            title={`${u.nome} · ${ROLE_LABEL[u.papel] ?? u.papel} · online`}
            className="ring-2 ring-bg rounded-full"
          >
            <Avatar nome={u.nome} papel={u.papel} size={26} />
          </span>
        ))}
        {extras > 0 && (
          <span
            className="ring-2 ring-bg rounded-full bg-surface-3 text-text-2 text-[10px] font-medium flex items-center justify-center"
            style={{ width: 26, height: 26 }}
          >
            +{extras}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        <span className="text-xs text-text-3">
          {outros.length} {outros.length === 1 ? 'online' : 'online'}
        </span>
      </div>
    </div>
  );
}
