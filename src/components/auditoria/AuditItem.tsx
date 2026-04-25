import { useState } from 'react';
import {
  ChevronDown,
  CircleSlash,
  KeyRound,
  LogIn,
  LogOut,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
} from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import type { AuditoriaItem } from '../../hooks/useAuditoria';
import type { AcaoAuditoria } from '../../types/database';

const HUMAN_RECURSO: Record<string, string> = {
  clientes: 'cliente',
  materiais: 'material',
  pedidos: 'pedido',
  notas_fiscais: 'NF',
  recebimentos: 'recebimento',
  perfis: 'usuário',
  empresas: 'empresa',
  sistema: '',
};

const HUMAN_CAMPO: Record<string, string> = {
  nome_fantasia: 'nome fantasia',
  razao_social: 'razão social',
  inscricao_estadual: 'inscrição estadual',
  cliente_nome: 'cliente',
  preco_negociado: 'preço negociado',
  valor_negociado: 'valor negociado',
  valor_final: 'valor final',
  preco_final_kg: 'preço final por kg',
  total_impostos: 'total impostos',
  icms_pct: 'ICMS %',
  pis_pct: 'PIS %',
  cofins_pct: 'COFINS %',
  icms_ativo: 'ICMS ativo',
  piscofins_ativo: 'PIS/COFINS ativo',
  tipo_frete: 'tipo de frete',
  placa_veiculo: 'placa',
  pedido_numero: 'número do pedido',
  data_recebimento: 'data do recebimento',
  data_pagamento: 'data do pagamento',
  peso_bruto: 'peso bruto',
  peso_liquido: 'peso líquido',
  impureza_kg: 'impureza',
  impureza_pct: 'impureza %',
  valor_pago: 'valor pago',
  valor_real_recebido: 'valor recebido',
  pago_em: 'data do pagamento',
  motivo_complementar: 'motivo complementar',
  motivo_substituicao: 'motivo substituição',
  nf_pai_id: 'NF pai',
  nf_pai_numero: 'número da NF pai',
  substituida_em: 'substituída em',
};

export function humanizarRecurso(r: string): string {
  return HUMAN_RECURSO[r] ?? r;
}

export function humanizarCampo(c: string): string {
  return HUMAN_CAMPO[c] ?? c.replace(/_/g, ' ');
}

function tempoRelativo(iso: string): string {
  const diffSec = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diffSec < 60) return 'agora';
  if (diffSec < 3600) return `há ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `há ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 86400 * 30) return `há ${Math.floor(diffSec / 86400)} dias`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function formatarValor(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

export function textoAcao(item: AuditoriaItem): string {
  const recurso = humanizarRecurso(item.recurso);
  const detalhes = (item.detalhes ?? {}) as Record<string, unknown>;
  const depois = (detalhes.depois as Record<string, unknown> | undefined) ?? {};
  const snapshot = (detalhes.snapshot as Record<string, unknown> | undefined) ?? {};
  const id =
    (depois.numero as string | undefined) ||
    (depois.nome as string | undefined) ||
    (depois.nome_fantasia as string | undefined) ||
    (snapshot.numero as string | undefined) ||
    (snapshot.nome as string | undefined) ||
    item.recurso_id?.slice(-6) ||
    '';
  const sufixo = recurso ? `${recurso} ${id}` : '';

  switch (item.acao) {
    case 'CRIAR':
      return `criou ${sufixo}`.trim();
    case 'EDITAR': {
      const campos = (detalhes.campos as Record<string, unknown> | undefined) ?? {};
      const qtd = Object.keys(campos).length;
      return `editou ${sufixo} (${qtd} ${qtd === 1 ? 'campo' : 'campos'})`.trim();
    }
    case 'EXCLUIR':
      return `excluiu ${sufixo}`.trim();
    case 'PAGAR':
      return `marcou ${sufixo} como pago`.trim();
    case 'CONCLUIR':
      return `concluiu ${sufixo}`.trim();
    case 'LOGIN':
      return 'fez login';
    case 'LOGOUT':
      return 'fez logout';
    case 'CONVIDAR_USUARIO':
      return `convidou ${detalhes.email ?? detalhes.nome ?? 'usuário'}`;
    case 'REMOVER_USUARIO':
      return `removeu ${detalhes.nome ?? 'usuário'}`;
    case 'MUDAR_PAPEL':
      return `mudou papel de ${detalhes.nome ?? '?'} para ${detalhes.papel_novo ?? '?'}`;
    case 'BACKUP':
      return 'gerou backup';
    case 'RESTAURAR':
      return 'restaurou backup';
    default:
      return item.acao;
  }
}

const ICONE_ACAO: Record<AcaoAuditoria, React.ReactNode> = {
  CRIAR: <Plus size={14} />,
  EDITAR: <Pencil size={14} />,
  EXCLUIR: <Trash2 size={14} />,
  PAGAR: <ShieldCheck size={14} />,
  CONCLUIR: <ShieldCheck size={14} />,
  LOGIN: <LogIn size={14} />,
  LOGOUT: <LogOut size={14} />,
  CONVIDAR_USUARIO: <UserPlus size={14} />,
  REMOVER_USUARIO: <UserMinus size={14} />,
  MUDAR_PAPEL: <KeyRound size={14} />,
  BACKUP: <CircleSlash size={14} />,
  RESTAURAR: <CircleSlash size={14} />,
};

const COR_ACAO: Record<AcaoAuditoria, string> = {
  CRIAR: 'bg-accent-soft-bg text-accent border-accent-soft-border',
  EDITAR: 'bg-amber-soft-bg text-amber border-amber-soft-border',
  EXCLUIR: 'bg-warn-soft-bg text-warn border-warn-soft-border',
  PAGAR: 'bg-accent text-[#0B0B0D] border-accent',
  CONCLUIR: 'bg-accent text-[#0B0B0D] border-accent',
  LOGIN: 'bg-surface-3 text-text-2 border-border',
  LOGOUT: 'bg-surface-3 text-text-2 border-border',
  CONVIDAR_USUARIO: 'bg-[#1E1330] text-role-financeiro border-[#3A2553]',
  REMOVER_USUARIO: 'bg-warn-soft-bg text-warn border-warn-soft-border',
  MUDAR_PAPEL: 'bg-[#1E1330] text-role-financeiro border-[#3A2553]',
  BACKUP: 'bg-surface-3 text-text-2 border-border',
  RESTAURAR: 'bg-surface-3 text-text-2 border-border',
};

export function AuditItem({ item }: { item: AuditoriaItem }) {
  const [aberto, setAberto] = useState(false);
  const detalhes = (item.detalhes ?? {}) as Record<string, unknown>;
  const campos = (detalhes.campos as Record<string, { antes: unknown; depois: unknown }> | undefined) ?? {};
  const podeExpandir =
    Object.keys(campos).length > 0 ||
    !!detalhes.snapshot ||
    !!detalhes.depois ||
    item.acao === 'CONVIDAR_USUARIO' ||
    item.acao === 'MUDAR_PAPEL';

  return (
    <div className="flex gap-3 px-4 py-3 border-b border-border-soft hover:bg-surface-2/50 transition">
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <Avatar nome={item.usuario_nome} papel={item.perfil?.papel} size={28} />
        <span
          className={`w-7 h-7 rounded-md flex items-center justify-center border ${COR_ACAO[item.acao]}`}
        >
          {ICONE_ACAO[item.acao]}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p className="text-sm text-text">
            <span className="font-medium">{item.usuario_nome}</span>{' '}
            <span className="text-text-2">{textoAcao(item)}</span>
          </p>
          <span className="text-xs text-text-3 font-mono-num whitespace-nowrap">
            {tempoRelativo(item.created_at)} ·{' '}
            {new Date(item.created_at).toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {podeExpandir && (
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            className="mt-1 inline-flex items-center gap-1 text-xs text-text-3 hover:text-accent transition"
          >
            <ChevronDown
              size={12}
              className={`transition ${aberto ? 'rotate-180' : ''}`}
            />
            {aberto ? 'Ocultar detalhes' : 'Ver detalhes'}
          </button>
        )}

        {aberto && podeExpandir && (
          <div className="mt-2.5">
            {item.acao === 'EDITAR' && Object.keys(campos).length > 0 ? (
              <DiffTable campos={campos} />
            ) : (
              <pre className="bg-surface-2 border border-border-soft rounded-lg p-3 text-xs text-text-2 overflow-x-auto max-w-full">
                {JSON.stringify(item.detalhes, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffTable({
  campos,
}: {
  campos: Record<string, { antes: unknown; depois: unknown }>;
}) {
  return (
    <div className="border border-border-soft rounded-lg overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-surface-2 text-text-3 uppercase tracking-wider text-[10px]">
            <th className="text-left px-3 py-2 font-medium">Campo</th>
            <th className="text-left px-3 py-2 font-medium">Antes</th>
            <th className="text-left px-3 py-2 font-medium">Depois</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(campos).map(([campo, valor]) => (
            <tr key={campo} className="border-t border-border-soft">
              <td className="px-3 py-1.5 text-text-2">{humanizarCampo(campo)}</td>
              <td className="px-3 py-1.5 text-text-3 font-mono-num line-through">
                {formatarValor(valor.antes)}
              </td>
              <td className="px-3 py-1.5 text-text font-mono-num">
                {formatarValor(valor.depois)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
