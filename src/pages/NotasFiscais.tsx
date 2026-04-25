import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { TabelaNFs } from '../components/nfs/TabelaNFs';
import { ModalNF, type ModalNfContexto } from '../components/nfs/ModalNF';
import { ModalDetalheComplementar } from '../components/nfs/ModalDetalheComplementar';
import { ModalRecebimento, type ModalRecContexto } from '../components/recebimentos/ModalRecebimento';
import { useExcluirNf, useNfs, type NfComRelacoes } from '../hooks/useNfs';
import { usePeriodo } from '../contexts/PeriodoContext';
import { usePapel } from '../hooks/usePapel';

type FiltroCompl = 'todos' | 'apenas-pais' | 'apenas-filhas' | 'apenas-substituidas';

export default function NotasFiscais() {
  const { formatarPeriodo } = usePeriodo();
  const lista = useNfs();
  const excluir = useExcluirNf();
  const { podeEditarNFs } = usePapel();
  const toast = useToast();

  const [busca, setBusca] = useState('');
  const [filtroCompl, setFiltroCompl] = useState<FiltroCompl>('todos');
  const [modal, setModal] = useState<ModalNfContexto | null>(null);
  const [detalhe, setDetalhe] = useState<NfComRelacoes | null>(null);
  const [confirmarExcluir, setConfirmarExcluir] = useState<NfComRelacoes | null>(null);
  const [modalRec, setModalRec] = useState<ModalRecContexto | null>(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (lista.data ?? []).filter((nf) => {
      if (filtroCompl === 'apenas-pais' && !(nf.nfs_filhas?.[0]?.count ?? 0)) return false;
      if (filtroCompl === 'apenas-filhas' && !nf.nf_pai_id) return false;
      if (filtroCompl === 'apenas-substituidas' && !nf.substituida_em) return false;
      if (!termo) return true;
      return (
        nf.numero.toLowerCase().includes(termo) ||
        nf.cliente_nome.toLowerCase().includes(termo) ||
        (nf.material ?? '').toLowerCase().includes(termo)
      );
    });
  }, [busca, filtroCompl, lista.data]);

  async function executarExclusao() {
    if (!confirmarExcluir) return;
    try {
      await excluir.mutateAsync(confirmarExcluir.id);
      toast.success('NF excluída');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
      throw e;
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-accent mb-2 font-mono-num">
          {formatarPeriodo()}
        </p>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Notas fiscais</h1>
            <p className="text-text-2 text-sm md:text-base">
              {(lista.data?.length ?? 0).toLocaleString('pt-BR')}{' '}
              {(lista.data?.length ?? 0) === 1 ? 'NF emitida' : 'NFs emitidas'} no período.
            </p>
          </div>
          {podeEditarNFs && (
            <Button size="lg" onClick={() => setModal({ kind: 'criar' })}>
              <Plus size={16} /> Nova NF
            </Button>
          )}
        </div>
      </header>

      <Card className="p-4 mb-5">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por número, cliente ou material..."
            leftIcon={<Search size={14} />}
            className="flex-1"
          />
          <div className="flex gap-1.5 bg-surface-2 border border-border rounded-full p-1 w-fit">
            <FiltroPill ativo={filtroCompl === 'todos'} onClick={() => setFiltroCompl('todos')}>
              Todas
            </FiltroPill>
            <FiltroPill
              ativo={filtroCompl === 'apenas-pais'}
              onClick={() => setFiltroCompl('apenas-pais')}
            >
              Com complementares
            </FiltroPill>
            <FiltroPill
              ativo={filtroCompl === 'apenas-filhas'}
              onClick={() => setFiltroCompl('apenas-filhas')}
            >
              Apenas filhas
            </FiltroPill>
            <FiltroPill
              ativo={filtroCompl === 'apenas-substituidas'}
              onClick={() => setFiltroCompl('apenas-substituidas')}
            >
              Substituídas
            </FiltroPill>
          </div>
        </div>
      </Card>

      <TabelaNFs
        nfs={filtrados}
        isLoading={lista.isLoading}
        podeEditar={podeEditarNFs}
        onEditar={(nf) => setModal({ kind: 'editar', nf })}
        onComplementar={(nf) => setModal({ kind: 'complementar', pai: nf })}
        onExcluir={(nf) => setConfirmarExcluir(nf)}
        onAbrirVinculo={(nf) => setDetalhe(nf)}
        onReceber={(nf) =>
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
          })
        }
      />

      {modal && (
        <ModalNF
          open
          onClose={() => setModal(null)}
          contexto={modal}
        />
      )}

      {modalRec && (
        <ModalRecebimento
          open
          onClose={() => setModalRec(null)}
          contexto={modalRec}
        />
      )}

      <ModalDetalheComplementar
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        nf={detalhe}
        podeEditar={podeEditarNFs}
        onEditar={(nf) => {
          setDetalhe(null);
          setModal({ kind: 'editar', nf });
        }}
        onSubstituir={(nf) => {
          setDetalhe(null);
          setModal({ kind: 'complementar', pai: nf });
        }}
      />

      <ConfirmDialog
        open={!!confirmarExcluir}
        onClose={() => setConfirmarExcluir(null)}
        onConfirm={executarExclusao}
        title="Excluir NF?"
        description={
          confirmarExcluir
            ? `A NF ${confirmarExcluir.numero} de ${confirmarExcluir.cliente_nome} será removida permanentemente.`
            : ''
        }
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
}

function FiltroPill({
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
        ativo ? 'bg-accent text-[#0B0B0D] font-medium' : 'text-text-2 hover:text-text hover:bg-surface-3'
      }`}
    >
      {children}
    </button>
  );
}
