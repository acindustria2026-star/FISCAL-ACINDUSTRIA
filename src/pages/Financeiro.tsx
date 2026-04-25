import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';
import { MetricasFinanceiro, type AbaFinanceiro } from '../components/financeiro/MetricasFinanceiro';
import { TabelaFinanceiro } from '../components/financeiro/TabelaFinanceiro';
import {
  ModalRecebimento,
  type ModalRecContexto,
} from '../components/recebimentos/ModalRecebimento';
import {
  useFinanceiro,
  useMarcarPagoPorNf,
  type ItemFinanceiro,
} from '../hooks/useFinanceiro';
import { useOrdenacao } from '../hooks/useOrdenacao';
import { usePapel } from '../hooks/usePapel';
import { usePeriodo } from '../contexts/PeriodoContext';

export default function Financeiro() {
  const { isAdmin, isFinanceiro } = usePapel();
  const dados = useFinanceiro();
  const marcarPago = useMarcarPagoPorNf();
  const { formatarPeriodo } = usePeriodo();
  const toast = useToast();

  const [aba, setAba] = useState<AbaFinanceiro>('aReceber');
  const sort = useOrdenacao();
  const [modalRec, setModalRec] = useState<ModalRecContexto | null>(null);

  if (!isAdmin && !isFinanceiro) return <Navigate to="/dashboard" replace />;

  const itens = dados.data?.itens ?? [];
  const metricas = dados.data?.metricas ?? {
    totalRecebido: 0,
    totalAReceber: 0,
    totalAtrasadas: 0,
    ticketMedio: 0,
    qtdPagas: 0,
    qtdAReceber: 0,
    qtdAtrasadas: 0,
  };

  const abaCategoria: Record<AbaFinanceiro, ItemFinanceiro['categoria']> = {
    pagas: 'pago',
    aReceber: 'aReceber',
    atrasadas: 'atrasada',
  };

  const itensDaAba = useMemo(
    () => itens.filter((i) => i.categoria === abaCategoria[aba]),
    [itens, aba],
  );

  function trocarAba(nova: AbaFinanceiro) {
    setAba(nova);
    sort.reset();
  }

  async function handleMarcarPago(item: ItemFinanceiro) {
    if (item.semRecebimento) {
      // Sem recebimento → abre modal pra criar
      setModalRec({
        kind: 'criar',
        nf: {
          id: item.nf.id,
          numero: item.nf.numero,
          cliente_nome: item.nf.cliente_nome,
          material: item.nf.material,
          peso: item.nf.peso,
          preco_final_kg: item.nf.preco_final_kg,
          valor_final: item.nf.valor_final,
        },
      });
      return;
    }
    try {
      await marcarPago.mutateAsync(item.nf.id);
      toast.success(`NF ${item.nf.numero} marcada como paga`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao marcar como pago');
    }
  }

  function handleEditarRec(item: ItemFinanceiro) {
    if (!item.rec) {
      handleMarcarPago(item);
      return;
    }
    setModalRec({
      kind: 'editar',
      recebimento: {
        ...item.rec,
        nf: {
          ...item.nf,
          cliente: null,
        },
      } as never,
    });
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-accent mb-2 font-mono-num">
          {formatarPeriodo()}
        </p>
        <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Financeiro</h1>
        <p className="text-text-2 text-sm md:text-base">
          Todo dinheiro a receber · NFs pagas, pendentes e atrasadas no período.
        </p>
      </header>

      <div className="mb-6">
        <MetricasFinanceiro
          metricas={metricas}
          aba={aba}
          onChangeAba={trocarAba}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1.5 bg-surface-2 border border-border rounded-full p-1 w-fit">
          <Pill ativo={aba === 'pagas'} onClick={() => trocarAba('pagas')}>
            Pagas <span className="text-text-3 ml-1 font-mono-num">{metricas.qtdPagas}</span>
          </Pill>
          <Pill ativo={aba === 'aReceber'} onClick={() => trocarAba('aReceber')}>
            A receber <span className="text-text-3 ml-1 font-mono-num">{metricas.qtdAReceber}</span>
          </Pill>
          <Pill ativo={aba === 'atrasadas'} onClick={() => trocarAba('atrasadas')}>
            Atrasadas <span className="text-text-3 ml-1 font-mono-num">{metricas.qtdAtrasadas}</span>
          </Pill>
        </div>
      </div>

      <TabelaFinanceiro
        itens={itensDaAba}
        aba={aba}
        estadoSort={sort.estado}
        onToggleSort={sort.toggle}
        isLoading={dados.isLoading}
        onMarcarPago={handleMarcarPago}
        onEditarRecebimento={handleEditarRec}
      />

      {modalRec && (
        <ModalRecebimento
          open
          onClose={() => setModalRec(null)}
          contexto={modalRec}
        />
      )}
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
