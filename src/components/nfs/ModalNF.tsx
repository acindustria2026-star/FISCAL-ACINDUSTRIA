import { useEffect, useMemo, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Truck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CampoComSugestoes, type SugestaoItem } from '../ui/CampoComSugestoes';
import { useToast } from '../ui/Toast';
import { useClientes, useCriarCliente } from '../../hooks/useClientes';
import { useMateriais } from '../../hooks/useMateriais';
import {
  useCriarNf,
  useEditarNf,
  useSubstituirNf,
  type NfComRelacoes,
  type NfPayload,
} from '../../hooks/useNfs';
import { usePedidosAtivosDoCliente, type PedidoComEntregue } from '../../hooks/usePedidos';
import { ALIQUOTAS_PADRAO } from '../../utils/calculos';
import { brl, formatarData, kg as fmtKg } from '../../lib/formatters';
import { dataHojeISO } from '../../lib/dataUtils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ItensNF } from './ItensNF';
import {
  MOTIVOS_COMPLEMENTAR,
  nfFormSchema,
  type NfFormData,
  type ItemNF,
} from '../../schemas/nf';
import type {
  ClienteRow,
  NfItemRow,
  MotivoComplementar,
  TipoFrete,
} from '../../types/database';

export type ModalNfContexto =
  | { kind: 'criar' }
  | { kind: 'editar'; nf: NfComRelacoes }
  | { kind: 'complementar'; pai: NfComRelacoes };

interface Props {
  open: boolean;
  onClose: () => void;
  contexto: ModalNfContexto;
}

type ModoComp = 'nova' | 'substituir';

function itemDeNf(nf: NfComRelacoes): ItemNF {
  return {
    id: null,
    material: nf.material ?? '',
    peso: Number(nf.peso),
    preco_negociado: Number(nf.preco_negociado),
    icms_pct: Number(nf.icms_pct) * 100,
    pis_pct: Number(nf.pis_pct) * 100,
    cofins_pct: Number(nf.cofins_pct) * 100,
  };
}

const formDefault = (ctx: ModalNfContexto): NfFormData => {
  const today = dataHojeISO();
  const defaultIcms = ALIQUOTAS_PADRAO.ICMS * 100;
  const defaultPis = ALIQUOTAS_PADRAO.PIS * 100;
  const defaultCofins = ALIQUOTAS_PADRAO.COFINS * 100;

  if (ctx.kind === 'editar') {
    const n = ctx.nf;
    return {
      numero: n.numero,
      data: n.data,
      cliente_id: n.cliente_id,
      cliente_nome: n.cliente_nome,
      material: n.material ?? '',
      peso: '0',
      preco_negociado: '0',
      icms_ativo: n.icms_ativo,
      piscofins_ativo: n.piscofins_ativo,
      icms_pct_pp: String(Number(n.icms_pct) * 100),
      pis_pct_pp: String(Number(n.pis_pct) * 100),
      cofins_pct_pp: String(Number(n.cofins_pct) * 100),
      tipo_frete: n.tipo_frete,
      transportadora: n.transportadora ?? '',
      placa_veiculo: n.placa_veiculo ?? '',
      motorista: n.motorista ?? '',
      pedido_id: n.pedido_id,
      pedido_numero: n.pedido_numero,
      observacoes: n.observacoes ?? '',
      motivo_complementar: n.motivo_complementar,
      nf_pai_id: n.nf_pai_id,
      nf_pai_numero: n.nf_pai_numero,
      itens: [itemDeNf(n)],
    };
  }
  if (ctx.kind === 'complementar') {
    const p = ctx.pai;
    return {
      numero: '',
      data: today,
      cliente_id: p.cliente_id,
      cliente_nome: p.cliente_nome,
      material: p.material ?? '',
      peso: '0',
      preco_negociado: '0',
      icms_ativo: p.icms_ativo,
      piscofins_ativo: p.piscofins_ativo,
      icms_pct_pp: String(Number(p.icms_pct) * 100),
      pis_pct_pp: String(Number(p.pis_pct) * 100),
      cofins_pct_pp: String(Number(p.cofins_pct) * 100),
      tipo_frete: null,
      transportadora: '',
      placa_veiculo: '',
      motorista: '',
      pedido_id: null,
      pedido_numero: null,
      observacoes: '',
      motivo_complementar: 'PESO',
      nf_pai_id: p.id,
      nf_pai_numero: p.numero,
      itens: [itemDeNf(p)],
    };
  }
  return {
    numero: '',
    data: today,
    cliente_id: null,
    cliente_nome: '',
    material: '',
    peso: '0',
    preco_negociado: '0',
    icms_ativo: true,
    piscofins_ativo: true,
    icms_pct_pp: String(defaultIcms),
    pis_pct_pp: String(defaultPis),
    cofins_pct_pp: String(defaultCofins),
    tipo_frete: null,
    transportadora: '',
    placa_veiculo: '',
    motorista: '',
    pedido_id: null,
    pedido_numero: null,
    observacoes: '',
    motivo_complementar: null,
    nf_pai_id: null,
    nf_pai_numero: null,
    itens: [{
      id: null,
      material: '',
      peso: 0,
      preco_negociado: 0,
      icms_pct: defaultIcms,
      pis_pct: defaultPis,
      cofins_pct: defaultCofins,
    }],
  };
};

function tituloDe(ctx: ModalNfContexto, modo: ModoComp): string {
  if (ctx.kind === 'editar') return `Editar NF ${ctx.nf.numero}`;
  if (ctx.kind === 'complementar') {
    return modo === 'substituir'
      ? `Substituir dados da NF ${ctx.pai.numero}`
      : 'Nota complementar';
  }
  return 'Nova nota fiscal';
}

export function ModalNF({ open, onClose, contexto }: Props) {
  if (!open) return null;
  return <ModalNFInner onClose={onClose} contexto={contexto} />;
}

function ModalNFInner({ onClose, contexto }: { onClose: () => void; contexto: ModalNfContexto }) {
  const toast = useToast();
  const { perfil } = useAuth();
  const clientes = useClientes();
  const materiais = useMateriais();
  const criarCliente = useCriarCliente();
  const criarNf = useCriarNf();
  const editarNf = useEditarNf();
  const substituirNf = useSubstituirNf();

  const [modoComp, setModoComp] = useState<ModoComp>('nova');
  const [transporteAberto, setTransporteAberto] = useState(false);

  const form = useForm<NfFormData>({
    resolver: zodResolver(nfFormSchema),
    defaultValues: formDefault(contexto),
  });

  useEffect(() => {
    if (contexto.kind === 'editar') {
      const tem =
        contexto.nf.transportadora ||
        contexto.nf.placa_veiculo ||
        contexto.nf.motorista ||
        contexto.nf.tipo_frete;
      if (tem) setTransporteAberto(true);

      supabase
        .from('nf_itens')
        .select('*')
        .eq('nf_id', contexto.nf.id)
        .order('ordem')
        .then(({ data }) => {
          if (!data || data.length === 0) return;
          form.setValue(
            'itens',
            (data as NfItemRow[]).map((item) => ({
              id: item.id,
              material: item.material,
              peso: Number(item.peso),
              preco_negociado: Number(item.preco_negociado),
              icms_pct: Number(item.icms_pct) * 100,
              pis_pct: Number(item.pis_pct) * 100,
              cofins_pct: Number(item.cofins_pct) * 100,
            })),
          );
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valores = form.watch();

  const sugestoesClientes = useMemo<SugestaoItem<ClienteRow>[]>(
    () => (clientes.data ?? []).map((c) => ({ id: c.id, label: c.nome, payload: c })),
    [clientes.data],
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

  async function salvarItens(nfId: string, itens: ItemNF[]) {
    if (!perfil) throw new Error('Não autenticado');

    await supabase.from('nf_itens').delete().eq('nf_id', nfId);

    const r2 = (n: number) => Math.round(n * 100) / 100;
    const r4 = (n: number) => Math.round(n * 10000) / 10000;

    const inserir = itens.map((item, idx) => {
      const icmsPct = Number(item.icms_pct) / 100;
      const pisPct = Number(item.pis_pct) / 100;
      const cofinsPct = Number(item.cofins_pct) / 100;
      const totalPct = icmsPct + pisPct + cofinsPct;
      const valorNeg = Number(item.peso) * Number(item.preco_negociado);
      const valorFinal = totalPct > 0 && totalPct < 1 ? valorNeg / (1 - totalPct) : valorNeg;
      return {
        empresa_id: perfil.empresa_id,
        nf_id: nfId,
        ordem: idx + 1,
        material: item.material,
        peso: Number(item.peso),
        preco_negociado: Number(item.preco_negociado),
        icms_pct: icmsPct,
        pis_pct: pisPct,
        cofins_pct: cofinsPct,
        valor_final: r2(valorFinal),
        icms_valor: r2(valorFinal * icmsPct),
        pis_valor: r2(valorFinal * pisPct),
        cofins_valor: r2(valorFinal * cofinsPct),
      };
    });

    const { error: insError } = await supabase.from('nf_itens').insert(inserir);
    if (insError) throw new Error(insError.message);

    const totalPeso = itens.reduce((s, i) => s + Number(i.peso), 0);
    const totalValorFinal = inserir.reduce((s, i) => s + i.valor_final, 0);
    const totalValorNeg = itens.reduce((s, i) => s + Number(i.peso) * Number(i.preco_negociado), 0);
    const totalIcms = inserir.reduce((s, i) => s + i.icms_valor, 0);
    const totalPis = inserir.reduce((s, i) => s + i.pis_valor, 0);
    const totalCofins = inserir.reduce((s, i) => s + i.cofins_valor, 0);
    const primeiroItem = itens[0];
    const precoFinalKg = totalPeso > 0 ? r4(totalValorFinal / totalPeso) : 0;

    const updateData: Record<string, unknown> = {
      material: itens.length === 1 ? primeiroItem.material : `${itens.length} materiais`,
      peso: totalPeso,
      preco_negociado: itens.length === 1 ? Number(primeiroItem.preco_negociado) : 0,
      valor_negociado: r2(totalValorNeg),
      valor_final: r2(totalValorFinal),
      icms: r2(totalIcms),
      pis: r2(totalPis),
      cofins: r2(totalCofins),
      total_impostos: r2(totalIcms + totalPis + totalCofins),
      preco_final_kg: precoFinalKg,
    };
    if (itens.length === 1) {
      updateData.icms_ativo = Number(primeiroItem.icms_pct) > 0;
      updateData.piscofins_ativo =
        Number(primeiroItem.pis_pct) > 0 || Number(primeiroItem.cofins_pct) > 0;
      updateData.icms_pct = Number(primeiroItem.icms_pct) / 100;
      updateData.pis_pct = Number(primeiroItem.pis_pct) / 100;
      updateData.cofins_pct = Number(primeiroItem.cofins_pct) / 100;
    }

    const { error: updError } = await supabase
      .from('notas_fiscais')
      .update(updateData)
      .eq('id', nfId);
    if (updError) throw new Error(updError.message);
  }

  async function onSubmit(d: NfFormData) {
    const calcData = nfFormSchema.parse(d);
    const itens = calcData.itens;
    const primeiroItem = itens[0];
    const totalPeso = itens.reduce((s, i) => s + i.peso, 0);

    const vinculoComplementar = (() => {
      if (contexto.kind === 'editar') {
        return {
          nf_pai_id: contexto.nf.nf_pai_id ?? null,
          nf_pai_numero: contexto.nf.nf_pai_numero ?? null,
          motivo_complementar: contexto.nf.motivo_complementar ?? null,
        };
      }
      if (contexto.kind === 'complementar' && modoComp === 'nova') {
        return {
          nf_pai_id: contexto.pai.id,
          nf_pai_numero: contexto.pai.numero,
          motivo_complementar: (calcData.motivo_complementar ?? 'OUTRO') as MotivoComplementar,
        };
      }
      return { nf_pai_id: null, nf_pai_numero: null, motivo_complementar: null };
    })();

    const payload: NfPayload = {
      numero: calcData.numero,
      data: calcData.data,
      cliente_id: calcData.cliente_id,
      cliente_nome: calcData.cliente_nome,
      material: itens.length === 1 ? (primeiroItem.material || null) : `${itens.length} materiais`,
      peso: totalPeso,
      preco_negociado: itens.length === 1 ? primeiroItem.preco_negociado : 0,
      icms_ativo: primeiroItem.icms_pct > 0,
      piscofins_ativo: primeiroItem.pis_pct > 0 || primeiroItem.cofins_pct > 0,
      icms_pct: primeiroItem.icms_pct / 100,
      pis_pct: primeiroItem.pis_pct / 100,
      cofins_pct: primeiroItem.cofins_pct / 100,
      tipo_frete: calcData.tipo_frete ?? null,
      transportadora: calcData.transportadora?.trim() || null,
      placa_veiculo: calcData.placa_veiculo?.trim() || null,
      motorista: calcData.motorista?.trim() || null,
      pedido_id: calcData.pedido_id ?? null,
      pedido_numero: calcData.pedido_numero ?? null,
      observacoes: calcData.observacoes?.trim() || null,
      ...vinculoComplementar,
    };

    try {
      let nfId: string;
      let successMsg: string;

      if (contexto.kind === 'editar') {
        const result = await editarNf.mutateAsync({ id: contexto.nf.id, dados: payload });
        nfId = (result as { id: string }).id;
        successMsg = 'NF atualizada';
      } else if (contexto.kind === 'complementar' && modoComp === 'substituir') {
        const motivo = (calcData.motivo_complementar ?? 'OUTRO') as MotivoComplementar;
        const result = await substituirNf.mutateAsync({ id: contexto.pai.id, dados: payload, motivo });
        nfId = (result as { id: string }).id;
        successMsg = 'NF substituída';
      } else {
        const result = await criarNf.mutateAsync(payload);
        nfId = (result as { id: string }).id;
        successMsg = 'NF criada';
      }

      await salvarItens(nfId, itens);
      toast.success(successMsg);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  const ehComplementar = contexto.kind === 'complementar';
  const salvando = criarNf.isPending || editarNf.isPending || substituirNf.isPending;
  const titulo = tituloDe(contexto, modoComp);

  const pesoAtualItens = useMemo(() => {
    return (valores.itens ?? []).reduce(
      (s, i) => s + (Number(i?.peso ?? 0) || 0),
      0,
    );
  }, [valores.itens]);

  return (
    <FormProvider {...form}>
      <Modal
        open
        onClose={salvando ? () => {} : onClose}
        title={titulo}
        size="lg"
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
        <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
          {ehComplementar && (
            <BannerComplementar
              pai={(contexto as { pai: NfComRelacoes }).pai}
              modo={modoComp}
              onModoChange={setModoComp}
              motivo={valores.motivo_complementar ?? 'PESO'}
              onMotivoChange={(m) =>
                form.setValue('motivo_complementar', m, { shouldValidate: true })
              }
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Número *"
              {...form.register('numero')}
              error={form.formState.errors.numero?.message}
              autoFocus
            />
            <Input
              label="Data *"
              type="date"
              {...form.register('data')}
              error={form.formState.errors.data?.message}
            />
            <div />
          </div>

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

          <SecaoPedido
            clienteId={valores.cliente_id}
            pedidoIdAtual={valores.pedido_id ?? null}
            pesoAtual={pesoAtualItens}
            nfIdAtual={contexto.kind === 'editar' ? contexto.nf.id : null}
            onSelect={(p) => {
              form.setValue('pedido_id', p?.id ?? null, { shouldValidate: true });
              form.setValue('pedido_numero', p?.numero ?? null);
            }}
          />

          <ItensNF materiais={materiais.data ?? []} />

          <SecaoTransporte
            aberto={transporteAberto}
            onToggle={() => setTransporteAberto((a) => !a)}
            tipoFrete={valores.tipo_frete ?? null}
            onTipoFreteChange={(t) => form.setValue('tipo_frete', t)}
            register={form.register}
          />

          <div>
            <label className="text-sm text-text-2 font-medium">Observações</label>
            <textarea
              {...form.register('observacoes')}
              rows={3}
              className="w-full mt-1.5 bg-surface-2 border border-border rounded-xl px-3.5 py-2.5 text-text placeholder:text-text-3 outline-none focus:border-accent transition resize-none"
              placeholder="Notas internas..."
            />
          </div>

          {contexto.kind === 'editar' && <CriadoEditadoPor nf={contexto.nf} />}

          <button type="submit" className="hidden" />
        </form>
      </Modal>
    </FormProvider>
  );
}

function BannerComplementar({
  pai,
  modo,
  onModoChange,
  motivo,
  onMotivoChange,
}: {
  pai: NfComRelacoes;
  modo: ModoComp;
  onModoChange: (m: ModoComp) => void;
  motivo: MotivoComplementar;
  onMotivoChange: (m: MotivoComplementar) => void;
}) {
  return (
    <Card className="p-4 bg-accent-soft-bg border-accent-soft-border">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-accent mb-1">Complementar de</p>
            <p className="text-sm text-text">
              <span className="font-medium">NF {pai.numero}</span> · {pai.cliente_nome} ·{' '}
              <span className="font-mono-num">{brl(pai.valor_final)}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-surface-2 rounded-xl p-1">
          <RadioCard
            label="Nova complementar"
            descricao="Cria uma NF nova vinculada"
            ativo={modo === 'nova'}
            onClick={() => onModoChange('nova')}
          />
          <RadioCard
            label="Substituir dados"
            descricao="Sobrescreve a NF original"
            ativo={modo === 'substituir'}
            onClick={() => onModoChange('substituir')}
          />
        </div>

        <div>
          <label className="text-xs text-text-2 font-medium block mb-1.5">Motivo</label>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_COMPLEMENTAR.map((m) => (
              <button
                type="button"
                key={m.value}
                onClick={() => onMotivoChange(m.value)}
                className={`px-3 h-8 rounded-full text-xs transition ${
                  motivo === m.value
                    ? 'bg-accent text-[#0B0B0D]'
                    : 'bg-surface-2 text-text-2 hover:text-text border border-border'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function RadioCard({
  label,
  descricao,
  ativo,
  onClick,
}: {
  label: string;
  descricao: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left px-3 py-2.5 rounded-lg transition ${
        ativo
          ? 'bg-accent text-[#0B0B0D]'
          : 'text-text-2 hover:text-text hover:bg-surface-3'
      }`}
    >
      <p className="text-sm font-medium">{label}</p>
      <p className={`text-xs ${ativo ? 'text-[#0B0B0D]/70' : 'text-text-3'}`}>{descricao}</p>
    </button>
  );
}

function CriadoEditadoPor({ nf }: { nf: NfComRelacoes }) {
  function relativo(iso: string | null): string {
    if (!iso) return '';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'agora';
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
    if (diff < 86400 * 30) return `há ${Math.floor(diff / 86400)} dias`;
    return formatarData(iso);
  }
  const partes: string[] = [];
  if (nf.criado_por?.nome) partes.push(`Criada por ${nf.criado_por.nome} · ${relativo(nf.created_at)}`);
  if (nf.editado_por?.nome && nf.editado_por.nome !== nf.criado_por?.nome) {
    partes.push(`Editada por ${nf.editado_por.nome} · ${relativo(nf.updated_at)}`);
  } else if (nf.editado_por?.nome && nf.created_at !== nf.updated_at) {
    partes.push(`Editada · ${relativo(nf.updated_at)}`);
  }
  if (partes.length === 0) return null;
  return (
    <p className="text-[11px] text-text-3 -mt-1">{partes.join(' · ')}</p>
  );
}

function SecaoTransporte({
  aberto,
  onToggle,
  tipoFrete,
  onTipoFreteChange,
  register,
}: {
  aberto: boolean;
  onToggle: () => void;
  tipoFrete: TipoFrete | null;
  onTipoFreteChange: (t: TipoFrete | null) => void;
  register: ReturnType<typeof useForm<NfFormData>>['register'];
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-surface-2 transition"
      >
        <span className="flex items-center gap-2 text-sm text-text-2">
          <Truck size={15} /> Dados de transporte
        </span>
        <ChevronDown
          size={16}
          className={`text-text-3 transition ${aberto ? 'rotate-180' : ''}`}
        />
      </button>
      {aberto && (
        <div className="p-4 pt-0 flex flex-col gap-3">
          <div className="flex gap-1.5 bg-surface-2 border border-border rounded-full p-1 w-fit">
            {(['CIF', 'FOB'] as TipoFrete[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onTipoFreteChange(tipoFrete === t ? null : t)}
                className={`px-3 h-7 rounded-full text-xs transition ${
                  tipoFrete === t ? 'bg-accent text-[#0B0B0D]' : 'text-text-2 hover:text-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Transportadora" {...register('transportadora')} />
            <Input label="Placa" {...register('placa_veiculo')} />
            <Input label="Motorista" {...register('motorista')} />
          </div>
        </div>
      )}
    </Card>
  );
}

function SecaoPedido({
  clienteId,
  pedidoIdAtual,
  pesoAtual,
  nfIdAtual,
  onSelect,
}: {
  clienteId: string | null;
  pedidoIdAtual: string | null;
  pesoAtual: number;
  nfIdAtual: string | null;
  onSelect: (p: PedidoComEntregue | null) => void;
}) {
  const pedidos = usePedidosAtivosDoCliente(clienteId);

  const selecionado = useMemo(
    () => pedidos.find((p) => p.id === pedidoIdAtual) ?? null,
    [pedidos, pedidoIdAtual],
  );

  const saldoEfetivo = useMemo(() => {
    if (!selecionado) return null;
    const outras = selecionado.notas_fiscais.filter((n) => n.id !== nfIdAtual);
    const entregueOutras = outras.reduce((s, n) => s + Number(n.peso), 0);
    return Number(selecionado.peso_total) - entregueOutras;
  }, [selecionado, nfIdAtual]);

  if (!clienteId || pedidos.length === 0) {
    if (!pedidoIdAtual) return null;
    return null;
  }

  const ultrapassa = saldoEfetivo !== null && pesoAtual > saldoEfetivo + 0.0001;
  const pctUso = saldoEfetivo && saldoEfetivo > 0 ? Math.min(100, (pesoAtual / saldoEfetivo) * 100) : 0;

  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-text-3 mb-3">
        Vincular ao pedido
      </p>
      <div className="flex flex-col gap-3">
        <select
          value={pedidoIdAtual ?? ''}
          onChange={(e) => {
            const p = pedidos.find((x) => x.id === e.target.value) ?? null;
            onSelect(p);
          }}
          className="h-11 bg-surface-2 border border-border rounded-xl text-text px-3.5 outline-none focus:border-accent transition"
        >
          <option value="">Sem vínculo com pedido</option>
          {pedidos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.numero} · saldo {Number(p.saldo).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg
              {p.material ? ` · ${p.material}` : ''}
            </option>
          ))}
        </select>

        {selecionado && saldoEfetivo !== null && (
          <div
            className={`rounded-xl border p-3 ${
              ultrapassa ? 'border-warn-soft-border bg-warn-soft-bg' : 'border-accent-soft-border bg-accent-soft-bg'
            }`}
          >
            <div className="flex items-baseline justify-between gap-3 text-xs">
              <span className="text-text-2">
                Pedido {selecionado.numero} · saldo disponível pra esta NF
              </span>
              <span className={`font-mono-num ${ultrapassa ? 'text-warn' : 'text-accent'}`}>
                {fmtKg(Math.max(saldoEfetivo, 0))}
              </span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] ${ultrapassa ? 'bg-warn' : 'bg-accent'}`}
                style={{ width: `${pctUso}%` }}
              />
            </div>
            {ultrapassa ? (
              <p className="text-xs text-warn mt-2">
                ⚠ Peso ultrapassa o saldo. O servidor vai bloquear o salvamento.
              </p>
            ) : (
              pesoAtual > 0 && (
                <p className="text-xs text-text-3 mt-2 font-mono-num">
                  Esta NF usaria {fmtKg(pesoAtual)} ({pctUso.toFixed(1)}% do saldo)
                </p>
              )
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
