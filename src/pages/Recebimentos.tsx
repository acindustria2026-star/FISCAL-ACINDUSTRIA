import { useMemo, useState } from 'react';
import { PackageCheck, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { AvatarCliente } from '../components/ui/AvatarCliente';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { ModalRecebimento, type ModalRecContexto } from '../components/recebimentos/ModalRecebimento';
import { ModalSelecionarNF } from '../components/recebimentos/ModalSelecionarNF';
import {
  useExcluirRecebimento,
  useRecebimentos,
  type RecebimentoComNf,
} from '../hooks/useRecebimentos';
import { usePeriodo } from '../contexts/PeriodoContext';
import { usePapel } from '../hooks/usePapel';
import { brl, formatarData, kg as fmtKg } from '../lib/formatters';
import type { NotaFiscalRow } from '../types/database';

type FiltroStatus = 'todos' | 'pago' | 'a-receber' | 'atrasado';

function calcularStatus(r: RecebimentoComNf): 'pago' | 'a-receber' | 'atrasado' {
  if (r.pago) return 'pago';
  const dias = Math.floor(
    (Date.now() - new Date(r.data_recebimento).getTime()) / (1000 * 60 * 60 * 24),
  );
  return dias > 7 ? 'atrasado' : 'a-receber';
}

export default function Recebimentos() {
  const { formatarPeriodo } = usePeriodo();
  const lista = useRecebimentos();
  const excluir = useExcluirRecebimento();
  const { podeEditarNFs } = usePapel();
  const toast = useToast();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroStatus>('todos');
  const [modalRec, setModalRec] = useState<ModalRecContexto | null>(null);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState<RecebimentoComNf | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lista.data ?? []).filter((r) => {
      const status = calcularStatus(r);
      if (filtro !== 'todos' && status !== filtro) return false;
      if (!termo) return true;
      const nome = r.nf?.cliente_nome ?? r.nf?.cliente?.nome ?? '';
      const numero = r.nf?.numero ?? '';
      return (
        nome.toLowerCase().includes(termo) ||
        numero.toLowerCase().includes(termo) ||
        (r.nf?.material ?? '').toLowerCase().includes(termo)
      );
    });
  }, [busca, filtro, lista.data]);

  function selecionarNF(nf: NotaFiscalRow) {
    setSeletorAberto(false);
    setModalRec({
      kind: 'criar',
      nf: {
        id: nf.id,
        numero: nf.numero,
        cliente_nome: nf.cliente_nome,
        material: nf.material,
        peso: nf.peso,
        preco_final_kg: nf.preco_final_kg,
        valor_final: nf.valor_final,
      },
    });
  }

  async function executarExclusao() {
    if (!confirmarExcluir) return;
    try {
      await excluir.mutateAsync(confirmarExcluir.id);
      toast.success('Recebimento excluído');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
      throw e;
    }
  }

  const totais = useMemo(() => {
    const arr = filtrados;
    return {
      qtd: arr.length,
      pesoLiquido: arr.reduce((s, r) => s + Number(r.peso_liquido), 0),
      valorPago: arr.reduce((s, r) => s + Number(r.valor_pago), 0),
    };
  }, [filtrados]);

  return (
    <div className="max-w-[1400px] mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-accent mb-2 font-mono-num">
          {formatarPeriodo()}
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Recebimentos</h1>
            <p className="text-text-2 text-sm md:text-base">
              {totais.qtd.toLocaleString('pt-BR')} {totais.qtd === 1 ? 'recebimento' : 'recebimentos'} ·{' '}
              <span className="font-mono-num">{fmtKg(totais.pesoLiquido)}</span> ·{' '}
              <span className="font-mono-num text-accent">{brl(totais.valorPago)}</span>
            </p>
          </div>
          {podeEditarNFs && (
            <Button size="lg" onClick={() => setSeletorAberto(true)}>
              <Plus size={16} /> Lançar recebimento
            </Button>
          )}
        </div>
      </header>

      <Card className="p-4 mb-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por NF, cliente ou material..."
            leftIcon={<Search size={14} />}
            className="flex-1"
          />
          <div className="flex gap-1.5 bg-surface-2 border border-border rounded-full p-1 w-fit">
            {(
              [
                ['todos', 'Todos'],
                ['pago', 'Pago'],
                ['a-receber', 'A receber'],
                ['atrasado', 'Atrasado'],
              ] as [FiltroStatus, string][]
            ).map(([v, label]) => (
              <button
                key={v}
                type="button"
                onClick={() => setFiltro(v)}
                className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition ${
                  filtro === v
                    ? 'bg-accent text-[#0B0B0D] font-medium'
                    : 'text-text-2 hover:text-text hover:bg-surface-3'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {lista.isLoading ? (
        <Loading fullScreen={false} text="Carregando recebimentos..." />
      ) : filtrados.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<PackageCheck size={32} />}
            titulo="Nenhum recebimento no período"
            descricao="Lance o primeiro recebimento usando o botão acima."
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
                  <th className="px-3 py-2.5 font-medium">Cliente / NF</th>
                  <th className="px-3 py-2.5 font-medium">Data receb.</th>
                  <th className="px-3 py-2.5 font-medium font-mono-num text-right">Peso bruto</th>
                  <th className="px-3 py-2.5 font-medium font-mono-num text-right">Impureza</th>
                  <th className="px-3 py-2.5 font-medium font-mono-num text-right">Peso líq.</th>
                  <th className="px-3 py-2.5 font-medium font-mono-num text-right">Valor pago</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  {podeEditarNFs && <th className="px-3 py-2.5 font-medium w-24" />}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((r) => {
                  const cliente = r.nf?.cliente_nome ?? r.nf?.cliente?.nome ?? '—';
                  const numero = r.nf?.numero ?? '—';
                  const status = calcularStatus(r);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setModalRec({ kind: 'editar', recebimento: r })}
                      className="border-b border-border-soft last:border-b-0 hover:bg-surface-2 cursor-pointer transition"
                    >
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <AvatarCliente nome={cliente} size={28} />
                          <div className="min-w-0">
                            <p className="text-sm text-text truncate">{cliente}</p>
                            <p className="text-xs text-text-3 font-mono-num">NF {numero}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-2 font-mono-num">
                        {formatarData(r.data_recebimento)}
                      </td>
                      <td className="px-3 py-3 text-sm text-text-2 font-mono-num text-right">
                        {fmtKg(r.peso_bruto)}
                      </td>
                      <td className="px-3 py-3 text-sm text-text-2 font-mono-num text-right">
                        {fmtKg(r.impureza_kg)}
                      </td>
                      <td className="px-3 py-3 text-sm text-text font-mono-num text-right">
                        {fmtKg(r.peso_liquido)}
                      </td>
                      <td className="px-3 py-3 text-sm font-mono-num text-right">
                        <span className="font-serif-display text-base text-text">
                          {brl(r.valor_pago)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill status={status} />
                      </td>
                      {podeEditarNFs && (
                        <td className="px-3 py-3">
                          <div className="flex gap-1 justify-end">
                            <button
                              type="button"
                              aria-label="Editar"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalRec({ kind: 'editar', recebimento: r });
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-2 hover:text-text hover:bg-surface-3 transition"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              aria-label="Excluir"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmarExcluir(r);
                              }}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-text-2 hover:text-warn hover:bg-warn-soft-bg transition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ModalSelecionarNF
        open={seletorAberto}
        onClose={() => setSeletorAberto(false)}
        onSelect={selecionarNF}
      />

      {modalRec && (
        <ModalRecebimento open onClose={() => setModalRec(null)} contexto={modalRec} />
      )}

      <ConfirmDialog
        open={!!confirmarExcluir}
        onClose={() => setConfirmarExcluir(null)}
        onConfirm={executarExclusao}
        title="Excluir recebimento?"
        description={
          confirmarExcluir
            ? `O recebimento da NF ${confirmarExcluir.nf?.numero ?? ''} será removido permanentemente.`
            : ''
        }
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
}

function StatusPill({ status }: { status: 'pago' | 'a-receber' | 'atrasado' }) {
  const styles: Record<typeof status, string> = {
    pago: 'bg-accent-soft-bg text-accent border-accent-soft-border',
    'a-receber': 'bg-amber-soft-bg text-amber border-amber-soft-border',
    atrasado: 'bg-warn-soft-bg text-warn border-warn-soft-border',
  };
  const label = { pago: 'Pago', 'a-receber': 'A receber', atrasado: 'Atrasado' }[status];
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium border ${styles[status]}`}>
      {label}
    </span>
  );
}
