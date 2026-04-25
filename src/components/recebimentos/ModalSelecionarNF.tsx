import { useMemo, useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { EmptyState } from '../ui/EmptyState';
import { Loading } from '../ui/Loading';
import { AvatarCliente } from '../ui/AvatarCliente';
import { useNfsSemRecebimento } from '../../hooks/useRecebimentos';
import { brl, formatarData, kg as fmtKg } from '../../lib/formatters';
import type { NotaFiscalRow } from '../../types/database';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (nf: NotaFiscalRow) => void;
}

export function ModalSelecionarNF({ open, onClose, onSelect }: Props) {
  const [busca, setBusca] = useState('');
  const lista = useNfsSemRecebimento();

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return lista.data ?? [];
    return (lista.data ?? []).filter(
      (nf) =>
        nf.numero.toLowerCase().includes(termo) ||
        nf.cliente_nome.toLowerCase().includes(termo) ||
        (nf.material ?? '').toLowerCase().includes(termo),
    );
  }, [lista.data, busca]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Selecionar NF para recebimento"
      description="Apenas NFs sem recebimento aparecem aqui."
      size="md"
    >
      <div className="flex flex-col gap-3">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por número, cliente ou material..."
          leftIcon={<Search size={14} />}
          autoFocus
        />

        {lista.isLoading ? (
          <Loading fullScreen={false} text="Carregando NFs..." />
        ) : filtradas.length === 0 ? (
          <EmptyState
            icon={<FileText size={28} />}
            titulo={busca ? 'Nenhuma NF encontrada' : 'Sem NFs pendentes'}
            descricao={
              busca
                ? 'Tente outro termo de busca.'
                : 'Todas as notas já têm recebimento lançado.'
            }
          />
        ) : (
          <ul className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto -mx-1 px-1">
            {filtradas.map((nf) => (
              <li key={nf.id}>
                <button
                  type="button"
                  onClick={() => onSelect(nf)}
                  className="w-full text-left p-3 rounded-xl border border-border bg-surface-2 hover:border-accent-soft-border hover:bg-accent-soft-bg transition flex items-center gap-3"
                >
                  <AvatarCliente nome={nf.cliente_nome} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-text font-medium font-mono-num">
                        NF {nf.numero}
                      </span>
                      <span className="text-xs text-text-3 font-mono-num">
                        {formatarData(nf.data)}
                      </span>
                    </div>
                    <p className="text-xs text-text-2 truncate">
                      {nf.cliente_nome}
                      {nf.material ? ` · ${nf.material}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs flex-shrink-0">
                    <p className="text-text-3">{fmtKg(nf.peso)}</p>
                    <p className="font-mono-num text-text">{brl(nf.valor_final)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
