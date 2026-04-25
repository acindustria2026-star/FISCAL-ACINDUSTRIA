import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useToast } from '../ui/Toast';
import { useContagemNFsCliente, useEditarCliente, useExcluirCliente } from '../../hooks/useClientes';
import { clienteSchema, type ClienteInput } from '../../schemas/cliente';
import { formatarCNPJ, formatarData, formatarTelefone, onlyDigits } from '../../lib/formatters';
import type { ClienteRow } from '../../types/database';

interface Props {
  cliente: ClienteRow | null;
  onClose: () => void;
  podeEditar: boolean;
}

export function ModalEditarCliente({ cliente, onClose, podeEditar }: Props) {
  const editar = useEditarCliente();
  const excluir = useExcluirCliente();
  const counts = useContagemNFsCliente(cliente?.id);
  const toast = useToast();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const form = useForm<ClienteInput>({
    resolver: zodResolver(clienteSchema),
    defaultValues: {
      nome: '',
      cnpj: null,
      email: null,
      telefone: null,
      endereco: null,
      observacoes: null,
    },
  });

  useEffect(() => {
    if (cliente) {
      form.reset({
        nome: cliente.nome,
        cnpj: cliente.cnpj,
        email: cliente.email,
        telefone: cliente.telefone,
        endereco: cliente.endereco,
        observacoes: cliente.observacoes,
      });
    }
  }, [cliente, form]);

  if (!cliente) return null;

  async function onSubmit(d: ClienteInput) {
    if (!cliente) return;
    try {
      await editar.mutateAsync({ id: cliente.id, dados: d });
      toast.success('Cliente atualizado');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  async function executarExclusao() {
    if (!cliente) return;
    try {
      await excluir.mutateAsync(cliente.id);
      toast.success('Cliente excluído');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao excluir');
      throw e;
    }
  }

  const cnpjValue = form.watch('cnpj') ?? '';
  const telValue = form.watch('telefone') ?? '';
  const totalVinc = (counts.data?.nfs ?? 0) + (counts.data?.pedidos ?? 0);

  return (
    <>
      <Modal
        open={!!cliente}
        onClose={onClose}
        title="Editar cliente"
        description={cliente.nome}
        size="md"
        footer={
          <>
            {podeEditar && (
              <Button
                variant="danger"
                onClick={() => setConfirmarExclusao(true)}
                disabled={editar.isPending || excluir.isPending}
              >
                <Trash2 size={14} /> Excluir
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            {podeEditar && (
              <Button onClick={form.handleSubmit(onSubmit)} loading={editar.isPending}>
                Salvar
              </Button>
            )}
          </>
        }
      >
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Input
            label="Nome *"
            {...form.register('nome')}
            error={form.formState.errors.nome?.message}
            disabled={!podeEditar}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="CNPJ"
              value={formatarCNPJ(cnpjValue ?? '')}
              onChange={(e) =>
                form.setValue('cnpj', onlyDigits(e.target.value).slice(0, 14) || null, {
                  shouldValidate: true,
                })
              }
              placeholder="00.000.000/0000-00"
              error={form.formState.errors.cnpj?.message}
              disabled={!podeEditar}
            />
            <Input
              label="Telefone"
              value={formatarTelefone(telValue ?? '')}
              onChange={(e) =>
                form.setValue('telefone', onlyDigits(e.target.value).slice(0, 11) || null, {
                  shouldValidate: true,
                })
              }
              placeholder="(11) 99999-9999"
              disabled={!podeEditar}
            />
          </div>
          <Input
            label="Email"
            type="email"
            {...form.register('email')}
            error={form.formState.errors.email?.message}
            disabled={!podeEditar}
          />
          <Input label="Endereço" {...form.register('endereco')} disabled={!podeEditar} />
          <Input label="Observações" {...form.register('observacoes')} disabled={!podeEditar} />

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border-soft">
            <InfoLinha label="Cadastrado em" valor={formatarData(cliente.created_at)} />
            <InfoLinha
              label="Vínculos"
              valor={
                counts.isLoading
                  ? '...'
                  : `${counts.data?.nfs ?? 0} NFs · ${counts.data?.pedidos ?? 0} pedidos`
              }
            />
          </div>

          <button type="submit" className="hidden" />
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarExclusao}
        onClose={() => setConfirmarExclusao(false)}
        onConfirm={executarExclusao}
        title="Excluir cliente?"
        description={
          totalVinc > 0
            ? `Não é possível excluir: ${counts.data?.nfs ?? 0} notas e ${counts.data?.pedidos ?? 0} pedidos vinculados.`
            : `O cliente "${cliente.nome}" será removido permanentemente. Essa ação não pode ser desfeita.`
        }
        confirmLabel="Excluir"
        variant="danger"
      />
    </>
  );
}

function InfoLinha({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-text-3">{label}</p>
      <p className="text-sm text-text mt-0.5">{valor}</p>
    </div>
  );
}
