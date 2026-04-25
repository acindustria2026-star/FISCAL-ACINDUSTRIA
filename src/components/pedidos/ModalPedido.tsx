import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { CampoComSugestoes, type SugestaoItem } from '../ui/CampoComSugestoes';
import { useToast } from '../ui/Toast';
import { useClientes, useCriarCliente } from '../../hooks/useClientes';
import { useCriarMaterial, useMateriais } from '../../hooks/useMateriais';
import { useCriarPedido, useEditarPedido } from '../../hooks/usePedidos';
import { pedidoFormSchema, type PedidoFormData } from '../../schemas/pedido';
import type { ClienteRow, MaterialRow, PedidoRow } from '../../types/database';

export type ModalPedidoContexto =
  | { kind: 'criar'; clienteIdSugerido?: string | null }
  | { kind: 'editar'; pedido: PedidoRow };

interface Props {
  open: boolean;
  onClose: () => void;
  contexto: ModalPedidoContexto;
}

const formDefault = (ctx: ModalPedidoContexto): PedidoFormData => {
  const today = new Date().toISOString().slice(0, 10);
  if (ctx.kind === 'editar') {
    const p = ctx.pedido;
    return {
      numero: p.numero,
      cliente_id: p.cliente_id,
      cliente_nome: p.cliente_nome,
      material: p.material ?? '',
      peso_total: String(p.peso_total),
      preco_referencia: p.preco_referencia !== null ? String(p.preco_referencia) : '',
      data_inicio: p.data_inicio,
      prazo: p.prazo,
      observacoes: p.observacoes ?? '',
    };
  }
  return {
    numero: '',
    cliente_id: ctx.clienteIdSugerido ?? null,
    cliente_nome: '',
    material: '',
    peso_total: '',
    preco_referencia: '',
    data_inicio: today,
    prazo: null,
    observacoes: '',
  };
};

export function ModalPedido({ open, onClose, contexto }: Props) {
  if (!open) return null;
  return <Inner onClose={onClose} contexto={contexto} />;
}

function Inner({ onClose, contexto }: { onClose: () => void; contexto: ModalPedidoContexto }) {
  const toast = useToast();
  const clientes = useClientes();
  const materiais = useMateriais();
  const criarCliente = useCriarCliente();
  const criarMaterial = useCriarMaterial();
  const criarPedido = useCriarPedido();
  const editarPedido = useEditarPedido();

  const form = useForm<PedidoFormData>({
    resolver: zodResolver(pedidoFormSchema),
    defaultValues: formDefault(contexto),
  });

  // Pré-selecionar cliente sugerido (caso criar a partir de uma NF, futuro)
  useEffect(() => {
    if (contexto.kind === 'criar' && contexto.clienteIdSugerido && clientes.data) {
      const c = clientes.data.find((x) => x.id === contexto.clienteIdSugerido);
      if (c) {
        form.setValue('cliente_id', c.id);
        form.setValue('cliente_nome', c.nome);
      }
    }
  }, [contexto, clientes.data, form]);

  const valores = form.watch();

  const sugestoesClientes = useMemo<SugestaoItem<ClienteRow>[]>(
    () => (clientes.data ?? []).map((c) => ({ id: c.id, label: c.nome, payload: c })),
    [clientes.data],
  );
  const sugestoesMateriais = useMemo<SugestaoItem<MaterialRow>[]>(
    () => (materiais.data ?? []).map((m) => ({ id: m.id, label: m.nome, payload: m })),
    [materiais.data],
  );

  function onSelectCliente(item: SugestaoItem<ClienteRow>) {
    form.setValue('cliente_id', item.payload.id, { shouldValidate: true });
    form.setValue('cliente_nome', item.payload.nome, { shouldValidate: true });
  }

  async function onCriarCliente(nome: string) {
    try {
      const novo = await criarCliente.mutateAsync({
        nome,
        cnpj: null,
        email: null,
        telefone: null,
        endereco: null,
        observacoes: null,
      });
      form.setValue('cliente_id', novo.id, { shouldValidate: true });
      form.setValue('cliente_nome', novo.nome, { shouldValidate: true });
      toast.success(`Cliente "${nome}" criado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar cliente');
    }
  }

  function onSelectMaterial(item: SugestaoItem<MaterialRow>) {
    form.setValue('material', item.payload.nome, { shouldValidate: true });
  }

  async function onCriarMaterial(nome: string) {
    try {
      const novo = await criarMaterial.mutateAsync({
        nome,
        icms_padrao: 18,
        pis_padrao: 1.65,
        cofins_padrao: 7.6,
      });
      form.setValue('material', novo.nome, { shouldValidate: true });
      toast.success(`Material "${nome}" criado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar material');
    }
  }

  async function onSubmit(d: PedidoFormData) {
    const parsed = pedidoFormSchema.parse(d);
    try {
      if (contexto.kind === 'editar') {
        await editarPedido.mutateAsync({ id: contexto.pedido.id, dados: parsed });
        toast.success('Pedido atualizado');
      } else {
        await criarPedido.mutateAsync(parsed);
        toast.success('Pedido criado');
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  const salvando = criarPedido.isPending || editarPedido.isPending;
  const titulo = contexto.kind === 'editar' ? `Editar pedido ${contexto.pedido.numero}` : 'Novo pedido';

  return (
    <Modal
      open
      onClose={salvando ? () => {} : onClose}
      title={titulo}
      description="Ordens de grande volume entregues em várias NFs ao longo do tempo."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} loading={salvando}>
            Salvar
          </Button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Número"
          placeholder="Auto-gerado se vazio (ex: PED-123456)"
          {...form.register('numero')}
          error={form.formState.errors.numero?.message}
        />

        <CampoComSugestoes
          label="Cliente *"
          value={valores.cliente_nome}
          onChange={(v) => {
            form.setValue('cliente_nome', v, { shouldValidate: true });
            const match = sugestoesClientes.find(
              (s) => s.label.toLowerCase() === v.trim().toLowerCase(),
            );
            form.setValue('cliente_id', match?.payload.id ?? null);
          }}
          onSelect={onSelectCliente}
          onCriar={onCriarCliente}
          sugestoes={sugestoesClientes}
          permitirNovo
          placeholder="Digite ou selecione"
          error={form.formState.errors.cliente_nome?.message}
        />

        <CampoComSugestoes
          label="Material"
          value={valores.material ?? ''}
          onChange={(v) => form.setValue('material', v, { shouldValidate: true })}
          onSelect={onSelectMaterial}
          onCriar={onCriarMaterial}
          sugestoes={sugestoesMateriais}
          permitirNovo
          placeholder="Sucata ferrosa, alumínio..."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Peso total (kg) *"
            type="number"
            step="0.001"
            {...form.register('peso_total')}
            error={form.formState.errors.peso_total?.message}
          />
          <Input
            label="Preço de referência (R$/kg)"
            type="number"
            step="0.0001"
            placeholder="Opcional"
            {...form.register('preco_referencia')}
            error={form.formState.errors.preco_referencia?.message}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Data início *"
            type="date"
            {...form.register('data_inicio')}
            error={form.formState.errors.data_inicio?.message}
          />
          <Input
            label="Prazo"
            type="date"
            {...form.register('prazo')}
            error={form.formState.errors.prazo?.message}
          />
        </div>

        <div>
          <label className="text-sm text-text-2 font-medium">Observações</label>
          <textarea
            {...form.register('observacoes')}
            rows={2}
            className="w-full mt-1.5 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-text placeholder:text-text-3 outline-none focus:border-accent transition resize-none"
            placeholder="Notas internas..."
          />
        </div>

        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
