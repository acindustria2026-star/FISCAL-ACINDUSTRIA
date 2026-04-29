import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Download, Filter, ShieldCheck, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { AuditItem, humanizarRecurso, textoAcao } from '../components/auditoria/AuditItem';
import { useAuditoria, type FiltrosAuditoria } from '../hooks/useAuditoria';
import { useUsuarios } from '../hooks/useUsuarios';
import { usePapel } from '../hooks/usePapel';
import { exportarCSV } from '../utils/exportarCSV';
import { formatarData, formatarDataHora, dataHojeISO } from '../lib/dataUtils';
import type { AcaoAuditoria } from '../types/database';

const ACOES: { value: AcaoAuditoria; label: string }[] = [
  { value: 'CRIAR', label: 'Criar' },
  { value: 'EDITAR', label: 'Editar' },
  { value: 'EXCLUIR', label: 'Excluir' },
  { value: 'PAGAR', label: 'Pagar' },
  { value: 'CONCLUIR', label: 'Concluir' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGOUT', label: 'Logout' },
  { value: 'CONVIDAR_USUARIO', label: 'Convidar usuário' },
  { value: 'REMOVER_USUARIO', label: 'Remover usuário' },
  { value: 'MUDAR_PAPEL', label: 'Mudar papel' },
];

const RECURSOS: { value: string; label: string }[] = [
  { value: 'clientes', label: 'Clientes' },
  { value: 'materiais', label: 'Materiais' },
  { value: 'pedidos', label: 'Pedidos' },
  { value: 'notas_fiscais', label: 'Notas fiscais' },
  { value: 'recebimentos', label: 'Recebimentos' },
  { value: 'perfis', label: 'Usuários' },
  { value: 'empresas', label: 'Empresa' },
  { value: 'sistema', label: 'Sistema (login/logout)' },
];

export default function Auditoria() {
  const { isAdmin } = usePapel();
  const [filtros, setFiltros] = useState<FiltrosAuditoria>({ limit: 200 });
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);
  const lista = useAuditoria(filtros);
  const usuarios = useUsuarios();

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const ativosCount =
    (filtros.usuario_id ? 1 : 0) +
    (filtros.acao ? 1 : 0) +
    (filtros.recurso ? 1 : 0) +
    (filtros.dataInicio ? 1 : 0) +
    (filtros.dataFim ? 1 : 0);

  function limpar() {
    setFiltros({ limit: 200 });
  }

  const itens = lista.data ?? [];

  const totaisPorAcao = useMemo(() => {
    const acc = new Map<AcaoAuditoria, number>();
    itens.forEach((i) => acc.set(i.acao, (acc.get(i.acao) ?? 0) + 1));
    return acc;
  }, [itens]);

  function baixarCSV() {
    if (itens.length === 0) return;
    const linhas = itens.map((i) => {
      const dataHora = formatarDataHora(i.created_at);
      const [dataPart, horaPart] = dataHora.split(' ');
      return [
        dataPart ?? formatarData(i.created_at),
        horaPart ?? '',
        i.usuario_nome,
        i.acao,
        humanizarRecurso(i.recurso),
        i.recurso_id ?? '',
        textoAcao(i),
        i.detalhes ?? {},
      ];
    });
    const data = dataHojeISO();
    exportarCSV(
      `auditoria-${data}`,
      ['Data', 'Hora', 'Usuário', 'Ação', 'Recurso', 'ID', 'Descrição', 'Detalhes (JSON)'],
      linhas,
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Auditoria</h1>
        <p className="text-text-2 text-sm md:text-base">
          Histórico de ações realizadas no sistema. Triggers do Postgres registram tudo
          automaticamente.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Button
          variant="secondary"
          onClick={() => setFiltrosAbertos((a) => !a)}
        >
          <Filter size={14} /> Filtros
          {ativosCount > 0 && (
            <span className="ml-1 px-1.5 py-px rounded-full text-[10px] bg-accent text-[#0B0B0D] font-bold">
              {ativosCount}
            </span>
          )}
        </Button>
        <span className="text-xs text-text-3 font-mono-num">
          {itens.length.toLocaleString('pt-BR')}{' '}
          {itens.length === 1 ? 'evento' : 'eventos'}
        </span>
        <div className="flex-1" />
        <Button variant="secondary" onClick={baixarCSV} disabled={itens.length === 0}>
          <Download size={14} /> Exportar CSV
        </Button>
      </div>

      {filtrosAbertos && (
        <Card className="p-5 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-2 font-medium">Usuário</label>
              <select
                value={filtros.usuario_id ?? ''}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, usuario_id: e.target.value || null }))
                }
                className="h-11 bg-surface-2 border border-border rounded-xl text-text px-3.5 outline-none focus:border-accent transition"
              >
                <option value="">Todos os usuários</option>
                {(usuarios.data ?? []).map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-2 font-medium">Ação</label>
              <select
                value={filtros.acao ?? ''}
                onChange={(e) =>
                  setFiltros((f) => ({
                    ...f,
                    acao: (e.target.value as AcaoAuditoria) || null,
                  }))
                }
                className="h-11 bg-surface-2 border border-border rounded-xl text-text px-3.5 outline-none focus:border-accent transition"
              >
                <option value="">Todas as ações</option>
                {ACOES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-text-2 font-medium">Recurso</label>
              <select
                value={filtros.recurso ?? ''}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, recurso: e.target.value || null }))
                }
                className="h-11 bg-surface-2 border border-border rounded-xl text-text px-3.5 outline-none focus:border-accent transition"
              >
                <option value="">Todos os recursos</option>
                {RECURSOS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="De (data)"
              type="date"
              value={filtros.dataInicio?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  dataInicio: e.target.value ? `${e.target.value}T00:00:00` : null,
                }))
              }
            />
            <Input
              label="Até (data)"
              type="date"
              value={filtros.dataFim?.slice(0, 10) ?? ''}
              onChange={(e) =>
                setFiltros((f) => ({
                  ...f,
                  dataFim: e.target.value ? `${e.target.value}T23:59:59` : null,
                }))
              }
            />
            <div className="flex items-end">
              <Button variant="ghost" onClick={limpar} disabled={ativosCount === 0}>
                <X size={14} /> Limpar filtros
              </Button>
            </div>
          </div>

          {totaisPorAcao.size > 0 && (
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-soft">
              {Array.from(totaisPorAcao.entries()).map(([acao, count]) => (
                <span
                  key={acao}
                  className="px-2 py-1 rounded-md text-xs bg-surface-2 border border-border text-text-2"
                >
                  {acao}{' '}
                  <span className="text-text font-mono-num font-medium">{count}</span>
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        {lista.isLoading ? (
          <Loading fullScreen={false} text="Carregando auditoria..." />
        ) : itens.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck size={32} />}
            titulo="Nenhum evento encontrado"
            descricao={
              ativosCount > 0
                ? 'Tente ajustar os filtros.'
                : 'Conforme o sistema for usado, aparecerão registros aqui automaticamente.'
            }
          />
        ) : (
          <div>
            {itens.map((item) => (
              <AuditItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
