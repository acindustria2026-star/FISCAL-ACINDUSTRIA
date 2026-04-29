import { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Search, X, ChevronDown, ChevronRight, Eraser } from 'lucide-react';
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

interface Filtros {
  busca: string;
  dataInicio: string;
  dataFim: string;
  valorMin: string;
  valorMax: string;
  filtrosAvancadosAbertos: boolean;
}

const filtrosIniciais: Filtros = {
  busca: '',
  dataInicio: '',
  dataFim: '',
  valorMin: '',
  valorMax: '',
  filtrosAvancadosAbertos: false,
};

export default function Financeiro() {
  const { isAdmin, isFinanceiro } = usePapel();
  const dados = useFinanceiro();
  const marcarPago = useMarcarPagoPorNf();
  const { formatarPeriodo } = usePeriodo();
  const toast = useToast();

  const [aba, setAba] = useState<AbaFinanceiro>('aReceber');
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
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

  const temFiltrosAtivos = useMemo(
    () =>
      filtros.busca !== '' ||
      filtros.dataInicio !== '' ||
      filtros.dataFim !== '' ||
      filtros.valorMin !== '' ||
      filtros.valorMax !== '',
    [filtros],
  );

  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        const numero = String(item.nf.numero ?? '').toLowerCase();
        const cliente = (item.nf.cliente_nome ?? '').toLowerCase();
        const material = (item.nf.material ?? '').toLowerCase();
        if (!numero.includes(busca) && !cliente.includes(busca) && !material.includes(busca)) {
          return false;
        }
      }

      if (filtros.dataInicio && item.nf.data < filtros.dataInicio) return false;
      if (filtros.dataFim && item.nf.data > filtros.dataFim) return false;

      const valor = Number(item.nf.valor_final) || 0;
      if (filtros.valorMin && valor < Number(filtros.valorMin)) return false;
      if (filtros.valorMax && valor > Number(filtros.valorMax)) return false;

      return true;
    });
  }, [itens, filtros]);

  const itensDaAbaTotal = useMemo(
    () => itens.filter((i) => i.categoria === abaCategoria[aba]),
    [itens, aba],
  );

  const itensDaAba = useMemo(
    () => itensFiltrados.filter((i) => i.categoria === abaCategoria[aba]),
    [itensFiltrados, aba],
  );

  function limparFiltros() {
    setFiltros({ ...filtrosIniciais, filtrosAvancadosAbertos: filtros.filtrosAvancadosAbertos });
  }

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

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3 pointer-events-none"
          />
          <input
            type="text"
            value={filtros.busca}
            onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
            placeholder="Pesquisar por NF, cliente ou material..."
            className="w-full bg-surface-2 border border-border rounded-2xl pl-11 pr-11 py-3 text-sm text-text placeholder-text-3 focus:outline-none focus:border-accent transition"
          />
          {filtros.busca && (
            <button
              type="button"
              onClick={() => setFiltros({ ...filtros, busca: '' })}
              aria-label="Limpar busca"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full text-text-2 hover:text-text hover:bg-surface-3 transition"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() =>
              setFiltros({
                ...filtros,
                filtrosAvancadosAbertos: !filtros.filtrosAvancadosAbertos,
              })
            }
            className="text-sm text-accent hover:text-accent/80 inline-flex items-center gap-1.5"
          >
            {filtros.filtrosAvancadosAbertos ? (
              <ChevronDown size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            Filtros avançados
            {temFiltrosAtivos && (
              <span className="ml-1 px-2 py-0.5 bg-accent-soft-bg text-accent border border-accent-soft-border rounded-full text-[10px] uppercase tracking-wider">
                ativos
              </span>
            )}
          </button>
        </div>

        {filtros.filtrosAvancadosAbertos && (
          <div className="bg-surface-2 rounded-2xl p-4 border border-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-text-3 uppercase tracking-[0.12em] block mb-2">
                  Período (data da NF)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text font-mono-num focus:outline-none focus:border-accent transition"
                  />
                  <span className="text-text-3 text-xs">até</span>
                  <input
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text font-mono-num focus:outline-none focus:border-accent transition"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-text-3 uppercase tracking-[0.12em] block mb-2">
                  Valor da NF (R$)
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    value={filtros.valorMin}
                    onChange={(e) => setFiltros({ ...filtros, valorMin: e.target.value })}
                    placeholder="Mínimo"
                    step="0.01"
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text font-mono-num placeholder-text-3 focus:outline-none focus:border-accent transition"
                  />
                  <span className="text-text-3 text-xs">até</span>
                  <input
                    type="number"
                    value={filtros.valorMax}
                    onChange={(e) => setFiltros({ ...filtros, valorMax: e.target.value })}
                    placeholder="Máximo"
                    step="0.01"
                    className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text font-mono-num placeholder-text-3 focus:outline-none focus:border-accent transition"
                  />
                </div>
              </div>
            </div>

            {temFiltrosAtivos && (
              <button
                type="button"
                onClick={limparFiltros}
                className="text-sm text-accent hover:text-accent/80 inline-flex items-center gap-1.5"
              >
                <Eraser size={13} /> Limpar todos os filtros
              </button>
            )}
          </div>
        )}
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

        <p className="text-xs text-text-3 font-mono-num">
          {temFiltrosAtivos
            ? `Mostrando ${itensDaAba.length} de ${itensDaAbaTotal.length} NFs (filtros aplicados)`
            : `${itensDaAbaTotal.length} NFs no total`}
        </p>
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
