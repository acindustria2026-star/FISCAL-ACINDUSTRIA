import { useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { CardPedido } from '../components/pedidos/CardPedido';
import {
  ModalPedido,
  type ModalPedidoContexto,
} from '../components/pedidos/ModalPedido';
import { ModalDetalhePedido } from '../components/pedidos/ModalDetalhePedido';
import {
  calcularStatus,
  usePedidos,
  type PedidoComEntregue,
  type StatusCalculado,
} from '../hooks/usePedidos';
import { usePapel } from '../hooks/usePapel';
import { kg as fmtKg } from '../lib/formatters';
import type { PedidoRow } from '../types/database';

type Filtro = 'todos' | 'ativos' | 'atrasados' | 'concluidos';

const FILTRO_STATUS: Record<Filtro, StatusCalculado[] | null> = {
  todos: null,
  ativos: ['ativo', 'quase-fechando', 'pronto-pra-concluir'],
  atrasados: ['atrasado'],
  concluidos: ['concluido'],
};

export default function Pedidos() {
  const lista = usePedidos();
  const { podeEditarNFs } = usePapel();

  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [modal, setModal] = useState<ModalPedidoContexto | null>(null);
  const [detalhe, setDetalhe] = useState<PedidoComEntregue | null>(null);

  const pedidos = lista.data ?? [];

  const counts = useMemo(() => {
    const c = { todos: pedidos.length, ativos: 0, atrasados: 0, concluidos: 0, saldoPendente: 0 };
    for (const p of pedidos) {
      const s = calcularStatus(p);
      if (s === 'concluido') c.concluidos++;
      else if (s === 'atrasado') {
        c.atrasados++;
        c.saldoPendente += Math.max(p.saldo, 0);
      } else {
        c.ativos++;
        c.saldoPendente += Math.max(p.saldo, 0);
      }
    }
    return c;
  }, [pedidos]);

  const filtrados = useMemo(() => {
    const allowed = FILTRO_STATUS[filtro];
    if (!allowed) return pedidos;
    return pedidos.filter((p) => allowed.includes(calcularStatus(p)));
  }, [pedidos, filtro]);

  return (
    <div className="max-w-[1200px] mx-auto">
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Pedidos</h1>
            <p className="text-text-2 text-sm md:text-base">
              Ordens de grande volume — entregues em várias NFs ao longo do tempo.
            </p>
          </div>
          {podeEditarNFs && (
            <Button size="lg" onClick={() => setModal({ kind: 'criar' })}>
              <Plus size={16} /> Novo pedido
            </Button>
          )}
        </div>
      </header>

      <div className="bg-surface-2 border border-border-soft rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Metric label="Ativos" valor={String(counts.ativos)} />
          <Metric
            label="Atrasados"
            valor={String(counts.atrasados)}
            tom={counts.atrasados > 0 ? 'warn' : undefined}
          />
          <Metric label="Concluídos" valor={String(counts.concluidos)} />
          <Metric label="Saldo pendente" valor={fmtKg(counts.saldoPendente)} tom="accent" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1.5 bg-surface-2 border border-border rounded-full p-1 w-fit">
          <Pill ativo={filtro === 'todos'} onClick={() => setFiltro('todos')}>
            Todos <span className="text-text-3 ml-1 font-mono-num">{counts.todos}</span>
          </Pill>
          <Pill ativo={filtro === 'ativos'} onClick={() => setFiltro('ativos')}>
            Ativos <span className="text-text-3 ml-1 font-mono-num">{counts.ativos}</span>
          </Pill>
          <Pill ativo={filtro === 'atrasados'} onClick={() => setFiltro('atrasados')}>
            Atrasados <span className="text-text-3 ml-1 font-mono-num">{counts.atrasados}</span>
          </Pill>
          <Pill ativo={filtro === 'concluidos'} onClick={() => setFiltro('concluidos')}>
            Concluídos <span className="text-text-3 ml-1 font-mono-num">{counts.concluidos}</span>
          </Pill>
        </div>
      </div>

      {lista.isLoading ? (
        <Loading fullScreen={false} text="Carregando pedidos..." />
      ) : filtrados.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<Package size={32} />}
            titulo={filtro === 'todos' ? 'Nenhum pedido cadastrado' : 'Nenhum pedido nesse filtro'}
            descricao={
              filtro === 'todos' && podeEditarNFs
                ? 'Crie o primeiro pedido pelo botão acima.'
                : 'Tente outro filtro.'
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtrados.map((p) => (
            <CardPedido key={p.id} pedido={p} onClick={() => setDetalhe(p)} />
          ))}
        </div>
      )}

      {modal && (
        <ModalPedido open onClose={() => setModal(null)} contexto={modal} />
      )}

      <ModalDetalhePedido
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        pedido={detalhe}
        podeEditar={podeEditarNFs}
        onEditar={(p: PedidoRow) => {
          setDetalhe(null);
          setModal({ kind: 'editar', pedido: p });
        }}
      />
    </div>
  );
}

function Pill({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition ${
        ativo
          ? 'bg-accent text-[#0B0B0D] font-medium'
          : 'text-text-2 hover:text-text hover:bg-surface-3'
      }`}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  valor,
  tom,
}: {
  label: string;
  valor: string;
  tom?: 'warn' | 'accent';
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[100px]">
      <span className="text-[10px] uppercase tracking-[0.12em] text-text-3">{label}</span>
      <span
        className={`text-sm font-mono-num font-semibold ${
          tom === 'warn' ? 'text-warn' : tom === 'accent' ? 'text-accent' : 'text-text'
        }`}
      >
        {valor}
      </span>
    </div>
  );
}
