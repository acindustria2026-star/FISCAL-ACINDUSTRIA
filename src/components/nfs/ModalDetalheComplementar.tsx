import { GitBranch, Pencil, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Loading';
import { useNf, useNfsFilhas, type NfComRelacoes } from '../../hooks/useNfs';
import { brl, formatarData } from '../../lib/formatters';
import { MOTIVOS_COMPLEMENTAR } from '../../schemas/nf';
import type { NotaFiscalRow, MotivoComplementar } from '../../types/database';

interface Props {
  open: boolean;
  onClose: () => void;
  nf: NfComRelacoes | null;
  podeEditar: boolean;
  onEditar: (nf: NfComRelacoes) => void;
  onSubstituir: (nf: NfComRelacoes) => void;
}

const labelMotivo = (m: MotivoComplementar | null | undefined): string => {
  if (!m) return '';
  return MOTIVOS_COMPLEMENTAR.find((x) => x.value === m)?.label ?? m;
};

export function ModalDetalheComplementar({ open, onClose, nf, podeEditar, onEditar, onSubstituir }: Props) {
  // Resolve a NF "raiz" da árvore: se a NF clicada é filha, vamos pra pai
  const idRaiz = nf?.nf_pai_id ?? nf?.id ?? null;
  const raiz = useNf(idRaiz);
  const filhas = useNfsFilhas(idRaiz);

  if (!open || !nf) return null;

  const carregando = raiz.isLoading || filhas.isLoading;
  const raizNf = raiz.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cadeia complementar"
      description={raizNf ? `NF ${raizNf.numero} · ${raizNf.cliente_nome}` : undefined}
      size="md"
      footer={<Button variant="ghost" onClick={onClose}>Fechar</Button>}
    >
      {carregando || !raizNf ? (
        <Loading fullScreen={false} text="Carregando histórico..." />
      ) : (
        <div className="flex flex-col gap-3">
          <NoArvore
            destacar={nf.id === raizNf.id}
            tipo={raizNf.substituida_em ? 'pai-substituida' : 'pai'}
            nf={raizNf}
            podeEditar={podeEditar}
            onEditar={() => onEditar(raizNf as NfComRelacoes)}
            onSubstituir={() => onSubstituir(raizNf as NfComRelacoes)}
          />
          {(filhas.data ?? []).map((f) => (
            <NoArvore
              key={f.id}
              destacar={nf.id === f.id}
              tipo="filha"
              nf={f}
            />
          ))}
          {(filhas.data?.length ?? 0) === 0 && !raizNf.substituida_em && (
            <p className="text-xs text-text-3 italic text-center pt-1">
              Sem complementares — apenas a NF original.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

interface NoArvoreProps {
  nf: NotaFiscalRow;
  tipo: 'pai' | 'pai-substituida' | 'filha';
  destacar: boolean;
  podeEditar?: boolean;
  onEditar?: () => void;
  onSubstituir?: () => void;
}

function NoArvore({ nf, tipo, destacar, podeEditar, onEditar, onSubstituir }: NoArvoreProps) {
  const motivo = tipo === 'pai-substituida' ? nf.motivo_substituicao : nf.motivo_complementar;
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border ${
        destacar ? 'border-accent-soft-border bg-accent-soft-bg' : 'border-border bg-surface-2'
      } ${tipo === 'filha' ? 'ml-6' : ''}`}
    >
      <div
        className={`mt-1 w-7 h-7 rounded-full flex items-center justify-center ${
          tipo === 'filha' ? 'bg-accent-soft-bg text-accent' : 'bg-surface-3 text-text-2'
        }`}
      >
        {tipo === 'filha' ? <GitBranch size={14} /> : <RefreshCw size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm text-text font-medium">NF {nf.numero}</p>
          {tipo === 'pai-substituida' && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-accent-soft-bg text-accent border border-accent-soft-border">
              Substituída
            </span>
          )}
          {tipo === 'filha' && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-px rounded-full bg-accent-soft-bg text-accent border border-accent-soft-border">
              Compl
            </span>
          )}
          {motivo && (
            <span className="text-xs text-text-2">
              · motivo: <span className="text-text">{labelMotivo(motivo)}</span>
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-2 text-xs">
          <Cell label="Data" valor={formatarData(nf.data)} />
          <Cell label="Peso" valor={`${Number(nf.peso).toFixed(2)} kg`} />
          <Cell label="Valor final" valor={brl(nf.valor_final)} />
        </div>
        {podeEditar && (onEditar || onSubstituir) && (
          <div className="flex gap-2 mt-3">
            {onEditar && (
              <button
                type="button"
                onClick={onEditar}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-text-2 hover:text-text hover:bg-surface-3 border border-border transition"
              >
                <Pencil size={12} /> Editar
              </button>
            )}
            {onSubstituir && (
              <button
                type="button"
                onClick={onSubstituir}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs text-text-2 hover:text-text hover:bg-surface-3 border border-border transition"
              >
                <RefreshCw size={12} /> Substituir / complementar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-text-3 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-text font-mono-num mt-0.5">{valor}</p>
    </div>
  );
}
