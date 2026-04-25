import { useState } from 'react';
import { CheckCircle2, Pencil, RotateCcw, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { AvatarCliente } from '../ui/AvatarCliente';
import { useToast } from '../ui/Toast';
import { StatusPedido } from './StatusPedido';
import {
  calcularStatus,
  useConcluirPedido,
  useExcluirPedido,
  useReabrirPedido,
  type PedidoComEntregue,
} from '../../hooks/usePedidos';
import { brl, brl4, formatarData, kg as fmtKg } from '../../lib/formatters';

interface Props {
  open: boolean;
  onClose: () => void;
  pedido: PedidoComEntregue | null;
  podeEditar: boolean;
  onEditar: (pedido: PedidoComEntregue) => void;
}

export function ModalDetalhePedido({ open, onClose, pedido, podeEditar, onEditar }: Props) {
  const concluir = useConcluirPedido();
  const reabrir = useReabrirPedido();
  const excluir = useExcluirPedido();
  const toast = useToast();
  const [confirmConcluir, setConfirmConcluir] = useState(false);
  const [confirmExcluir, setConfirmExcluir] = useState(false);
  const [confirmReabrir, setConfirmReabrir] = useState(false);

  if (!open || !pedido) return null;

  const status = calcularStatus(pedido);
  const total = Number(pedido.peso_total);
  const pct = total > 0 ? Math.min(100, (pedido.entregue / total) * 100) : 0;
  const concluido = status === 'concluido';
  const totalNfs = pedido.notas_fiscais.reduce((s, n) => s + Number(n.valor_final), 0);

  async function handleConcluir() {
    if (!pedido) return;
    try {
      await concluir.mutateAsync(pedido.id);
      toast.success('Pedido concluído');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao concluir');
      throw e;
    }
  }

  async function handleReabrir() {
    if (!pedido) return;
    try {
      await reabrir.mutateAsync(pedido.id);
      toast.success('Pedido reaberto');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reabrir');
      throw e;
    }
  }

  async function handleExcluir() {
    if (!pedido) return;
    try {
      await excluir.mutateAsync(pedido.id);
      toast.success('Pedido excluído');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
      throw e;
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={`Pedido ${pedido.numero}`}
        description={pedido.cliente_nome}
        size="lg"
        footer={
          <>
            {podeEditar && (
              <Button
                variant="danger"
                onClick={() => setConfirmExcluir(true)}
                disabled={pedido.qtdNfs > 0}
                title={pedido.qtdNfs > 0 ? 'Não é possível excluir — há NFs vinculadas' : undefined}
              >
                <Trash2 size={14} /> Excluir
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
            {podeEditar && (
              <>
                <Button variant="secondary" onClick={() => onEditar(pedido)}>
                  <Pencil size={14} /> Editar
                </Button>
                {concluido ? (
                  <Button variant="secondary" onClick={() => setConfirmReabrir(true)}>
                    <RotateCcw size={14} /> Reabrir
                  </Button>
                ) : (
                  <Button onClick={() => setConfirmConcluir(true)}>
                    <CheckCircle2 size={14} /> Concluir
                  </Button>
                )}
              </>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <AvatarCliente nome={pedido.cliente_nome} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-base text-text">{pedido.cliente_nome}</p>
              <p className="text-xs text-text-3">
                {pedido.material ?? 'sem material'}
                {' · iniciado em '}
                {formatarData(pedido.data_inicio)}
                {pedido.prazo ? ` · prazo ${formatarData(pedido.prazo)}` : ''}
              </p>
            </div>
            <StatusPedido status={status} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Bloco label="Combinado" valor={fmtKg(total)} />
            <Bloco label="Entregue" valor={fmtKg(pedido.entregue)} cor="accent" />
            <Bloco
              label="Saldo"
              valor={fmtKg(Math.max(pedido.saldo, 0))}
              cor={pedido.saldo <= 0 ? 'accent' : status === 'atrasado' ? 'warn' : 'default'}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  status === 'atrasado'
                    ? 'bg-warn'
                    : 'bg-gradient-to-r from-accent-dark to-accent'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-mono-num text-text-2 min-w-[56px] text-right">
              {pct.toFixed(1)}%
            </span>
          </div>

          {pedido.preco_referencia !== null && (
            <p className="text-xs text-text-3">
              Preço de referência: <span className="text-text font-mono-num">{brl4(pedido.preco_referencia)}/kg</span>
            </p>
          )}

          {pedido.observacoes && (
            <div className="bg-surface-2 border border-border-soft rounded-xl p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-text-3 mb-1">Observações</p>
              <p className="text-sm text-text-2 whitespace-pre-wrap">{pedido.observacoes}</p>
            </div>
          )}

          <div className="border-t border-border-soft pt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs uppercase tracking-[0.16em] text-text-3">
                NFs vinculadas ({pedido.qtdNfs})
              </p>
            </div>
            {pedido.qtdNfs === 0 ? (
              <p className="text-sm text-text-3 italic text-center py-4">
                Nenhuma NF vinculada ainda — crie uma NF e selecione este pedido.
              </p>
            ) : (
              <div className="border border-border-soft rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2">
                      <th className="px-3 py-2 font-medium">Nº NF</th>
                      <th className="px-3 py-2 font-medium">Data</th>
                      <th className="px-3 py-2 font-medium font-mono-num text-right">Peso</th>
                      <th className="px-3 py-2 font-medium font-mono-num text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...pedido.notas_fiscais]
                      .sort((a, b) => a.data.localeCompare(b.data))
                      .map((n) => (
                        <tr key={n.id} className="border-t border-border-soft">
                          <td className="px-3 py-2 text-text font-mono-num">{n.numero}</td>
                          <td className="px-3 py-2 text-text-2 font-mono-num">
                            {formatarData(n.data)}
                          </td>
                          <td className="px-3 py-2 text-text-2 font-mono-num text-right">
                            {fmtKg(n.peso)}
                          </td>
                          <td className="px-3 py-2 text-text font-mono-num text-right">
                            {brl(n.valor_final)}
                          </td>
                        </tr>
                      ))}
                    <tr className="border-t border-accent-soft-border bg-accent-soft-bg/50">
                      <td className="px-3 py-2 text-text-2 text-xs uppercase tracking-wider" colSpan={2}>
                        Total entregue
                      </td>
                      <td className="px-3 py-2 text-accent font-mono-num font-medium text-right">
                        {fmtKg(pedido.entregue)}
                      </td>
                      <td className="px-3 py-2 text-accent font-mono-num font-medium text-right">
                        {brl(totalNfs)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmConcluir}
        onClose={() => setConfirmConcluir(false)}
        onConfirm={handleConcluir}
        title="Concluir pedido?"
        description="O pedido será marcado como concluído. Você pode reabrir depois se necessário."
        confirmLabel="Concluir"
        variant="primary"
      />

      <ConfirmDialog
        open={confirmReabrir}
        onClose={() => setConfirmReabrir(false)}
        onConfirm={handleReabrir}
        title="Reabrir pedido?"
        description="O pedido voltará pra ATIVO e aceitará novas NFs novamente."
        confirmLabel="Reabrir"
        variant="primary"
      />

      <ConfirmDialog
        open={confirmExcluir}
        onClose={() => setConfirmExcluir(false)}
        onConfirm={handleExcluir}
        title="Excluir pedido?"
        description={`O pedido ${pedido.numero} será removido permanentemente. Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        variant="danger"
      />
    </>
  );
}

function Bloco({
  label,
  valor,
  cor = 'default',
}: {
  label: string;
  valor: string;
  cor?: 'default' | 'accent' | 'warn';
}) {
  const corClass = {
    default: 'text-text',
    accent: 'text-accent',
    warn: 'text-warn',
  }[cor];
  return (
    <div className="bg-surface-2 border border-border rounded-xl p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-text-3 mb-1">{label}</p>
      <p
        className={`font-serif-display font-mono-num ${corClass}`}
        style={{ fontSize: 22, lineHeight: 1.1 }}
      >
        {valor}
      </p>
    </div>
  );
}
