import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Truck } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { CampoComSugestoes, type SugestaoItem } from '../ui/CampoComSugestoes';
import { useToast } from '../ui/Toast';
import { useClientes, useCriarCliente } from '../../hooks/useClientes';
import {
  useCriarMaterial,
  useMateriais,
} from '../../hooks/useMateriais';
import {
  useCriarNf,
  useEditarNf,
  useSubstituirNf,
  type NfComRelacoes,
  type NfPayload,
} from '../../hooks/useNfs';
import { usePedidosAtivosDoCliente, type PedidoComEntregue } from '../../hooks/usePedidos';
import { calcularImpostos, ALIQUOTAS_PADRAO } from '../../utils/calculos';
import { brl, brl4, kg as fmtKg } from '../../lib/formatters';
import {
  MOTIVOS_COMPLEMENTAR,
  nfFormSchema,
  type NfFormData,
} from '../../schemas/nf';
import type {
  ClienteRow,
  MaterialRow,
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

const formDefault = (ctx: ModalNfContexto): NfFormData => {
  const today = new Date().toISOString().slice(0, 10);
  if (ctx.kind === 'editar') {
    const n = ctx.nf;
    return {
      numero: n.numero,
      data: n.data,
      cliente_id: n.cliente_id,
      cliente_nome: n.cliente_nome,
      material: n.material ?? '',
      peso: String(n.peso),
      preco_negociado: String(n.preco_negociado),
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
      peso: String(p.peso),
      preco_negociado: String(p.preco_negociado),
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
    };
  }
  return {
    numero: '',
    data: today,
    cliente_id: null,
    cliente_nome: '',
    material: '',
    peso: '',
    preco_negociado: '',
    icms_ativo: true,
    piscofins_ativo: true,
    icms_pct_pp: String(ALIQUOTAS_PADRAO.ICMS * 100),
    pis_pct_pp: String(ALIQUOTAS_PADRAO.PIS * 100),
    cofins_pct_pp: String(ALIQUOTAS_PADRAO.COFINS * 100),
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
  const clientes = useClientes();
  const materiais = useMateriais();
  const criarCliente = useCriarCliente();
  const criarMaterial = useCriarMaterial();
  const criarNf = useCriarNf();
  const editarNf = useEditarNf();
  const substituirNf = useSubstituirNf();

  const [modoComp, setModoComp] = useState<ModoComp>('nova');
  const [transporteAberto, setTransporteAberto] = useState(false);
  const [tabImposto, setTabImposto] = useState<'ICMS' | 'PISCOFINS'>('ICMS');

  const form = useForm<NfFormData>({
    resolver: zodResolver(nfFormSchema),
    defaultValues: formDefault(contexto),
  });

  useEffect(() => {
    if (contexto.kind === 'editar' && contexto.nf) {
      const tem =
        contexto.nf.transportadora ||
        contexto.nf.placa_veiculo ||
        contexto.nf.motorista ||
        contexto.nf.tipo_frete;
      if (tem) setTransporteAberto(true);
    }
  }, [contexto]);

  const valores = form.watch();

  const calc = useMemo(() => {
    const peso = Number(String(valores.peso).replace(',', '.')) || 0;
    const preco = Number(String(valores.preco_negociado).replace(',', '.')) || 0;
    const icms = Number(String(valores.icms_pct_pp).replace(',', '.')) || 0;
    const pis = Number(String(valores.pis_pct_pp).replace(',', '.')) || 0;
    const cofins = Number(String(valores.cofins_pct_pp).replace(',', '.')) || 0;
    return calcularImpostos({
      peso,
      precoNegociado: preco,
      icmsAtivo: valores.icms_ativo,
      piscofinsAtivo: valores.piscofins_ativo,
      icmsPct: icms / 100,
      pisPct: pis / 100,
      cofinsPct: cofins / 100,
    });
  }, [
    valores.peso,
    valores.preco_negociado,
    valores.icms_ativo,
    valores.piscofins_ativo,
    valores.icms_pct_pp,
    valores.pis_pct_pp,
    valores.cofins_pct_pp,
  ]);

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
    form.setValue('icms_pct_pp', String(Number(item.payload.icms_padrao)), { shouldValidate: true });
    form.setValue('pis_pct_pp', String(Number(item.payload.pis_padrao)), { shouldValidate: true });
    form.setValue('cofins_pct_pp', String(Number(item.payload.cofins_padrao)), { shouldValidate: true });
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

  async function onSubmit(d: NfFormData) {
    const calcData = nfFormSchema.parse(d);
    const payload: NfPayload = {
      numero: calcData.numero,
      data: calcData.data,
      cliente_id: calcData.cliente_id,
      cliente_nome: calcData.cliente_nome,
      material: calcData.material?.trim() || null,
      peso: calcData.peso,
      preco_negociado: calcData.preco_negociado,
      icms_ativo: calcData.icms_ativo,
      piscofins_ativo: calcData.piscofins_ativo,
      icms_pct: calcData.icms_pct_pp / 100,
      pis_pct: calcData.pis_pct_pp / 100,
      cofins_pct: calcData.cofins_pct_pp / 100,
      tipo_frete: calcData.tipo_frete ?? null,
      transportadora: calcData.transportadora?.trim() || null,
      placa_veiculo: calcData.placa_veiculo?.trim() || null,
      motorista: calcData.motorista?.trim() || null,
      pedido_id: calcData.pedido_id ?? null,
      pedido_numero: calcData.pedido_numero ?? null,
      observacoes: calcData.observacoes?.trim() || null,
      nf_pai_id: contexto.kind === 'complementar' && modoComp === 'nova' ? contexto.pai.id : null,
      nf_pai_numero: contexto.kind === 'complementar' && modoComp === 'nova' ? contexto.pai.numero : null,
      motivo_complementar:
        contexto.kind === 'complementar' && modoComp === 'nova'
          ? (calcData.motivo_complementar ?? 'OUTRO')
          : null,
    };

    try {
      if (contexto.kind === 'editar') {
        await editarNf.mutateAsync({ id: contexto.nf.id, dados: payload });
        toast.success('NF atualizada');
      } else if (contexto.kind === 'complementar' && modoComp === 'substituir') {
        const motivo = (calcData.motivo_complementar ?? 'OUTRO') as MotivoComplementar;
        await substituirNf.mutateAsync({ id: contexto.pai.id, dados: payload, motivo });
        toast.success('NF substituída');
      } else {
        await criarNf.mutateAsync(payload);
        toast.success('NF criada');
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  const ehComplementar = contexto.kind === 'complementar';
  const salvando = criarNf.isPending || editarNf.isPending || substituirNf.isPending;
  const titulo = tituloDe(contexto, modoComp);

  return (
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
          <div /> {/* spacer */}
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

        <CampoComSugestoes
          label="Material"
          value={valores.material ?? ''}
          onChange={(v) => form.setValue('material', v, { shouldValidate: true })}
          onSelect={onSelectMaterial}
          onCriar={onCriarMaterial}
          sugestoes={sugestoesMateriais}
          permitirNovo
          placeholder="Sucata ferrosa, alumínio..."
          helper="Selecionar um material preenche as alíquotas padrão"
        />

        <SecaoPedido
          clienteId={valores.cliente_id}
          pedidoIdAtual={valores.pedido_id ?? null}
          pesoAtual={Number(String(valores.peso ?? '0').replace(',', '.')) || 0}
          nfIdAtual={contexto.kind === 'editar' ? contexto.nf.id : null}
          onSelect={(p) => {
            form.setValue('pedido_id', p?.id ?? null, { shouldValidate: true });
            form.setValue('pedido_numero', p?.numero ?? null);
          }}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Peso (kg) *"
            type="number"
            step="0.001"
            {...form.register('peso')}
            error={form.formState.errors.peso?.message}
          />
          <Input
            label="Preço negociado (R$/kg) *"
            type="number"
            step="0.0001"
            {...form.register('preco_negociado')}
            error={form.formState.errors.preco_negociado?.message}
          />
        </div>

        <SecaoImpostos
          icmsAtivo={valores.icms_ativo}
          piscofinsAtivo={valores.piscofins_ativo}
          tab={tabImposto}
          onTabChange={setTabImposto}
          onToggle={(qual, on) => {
            if (qual === 'ICMS') form.setValue('icms_ativo', on);
            else form.setValue('piscofins_ativo', on);
          }}
          icmsPP={String(valores.icms_pct_pp ?? '')}
          pisPP={String(valores.pis_pct_pp ?? '')}
          cofinsPP={String(valores.cofins_pct_pp ?? '')}
          onChangePP={(qual, v) => {
            const key = qual === 'ICMS' ? 'icms_pct_pp' : qual === 'PIS' ? 'pis_pct_pp' : 'cofins_pct_pp';
            form.setValue(key, v, { shouldValidate: true });
          }}
        />

        <CardValorFinal calc={calc} />

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

function SecaoImpostos({
  icmsAtivo,
  piscofinsAtivo,
  tab,
  onTabChange,
  onToggle,
  icmsPP,
  pisPP,
  cofinsPP,
  onChangePP,
}: {
  icmsAtivo: boolean;
  piscofinsAtivo: boolean;
  tab: 'ICMS' | 'PISCOFINS';
  onTabChange: (t: 'ICMS' | 'PISCOFINS') => void;
  onToggle: (qual: 'ICMS' | 'PISCOFINS', on: boolean) => void;
  icmsPP: string;
  pisPP: string;
  cofinsPP: string;
  onChangePP: (qual: 'ICMS' | 'PIS' | 'COFINS', v: string) => void;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-text-3 mb-3">Impostos a agregar</p>
      <div className="flex items-center gap-2 mb-3">
        <AbaImposto
          label={`ICMS${!icmsAtivo ? ' · off' : ''}`}
          ativo={tab === 'ICMS'}
          dim={!icmsAtivo}
          onClick={() => onTabChange('ICMS')}
        />
        <AbaImposto
          label={`PIS+COFINS${!piscofinsAtivo ? ' · off' : ''}`}
          ativo={tab === 'PISCOFINS'}
          dim={!piscofinsAtivo}
          onClick={() => onTabChange('PISCOFINS')}
        />
      </div>

      {tab === 'ICMS' ? (
        <div className="flex items-end gap-3">
          <ToggleSwitch
            label="Aplicar ICMS"
            ativo={icmsAtivo}
            onChange={(v) => onToggle('ICMS', v)}
          />
          <Input
            label="Alíquota ICMS (%)"
            type="number"
            step="0.01"
            value={icmsPP}
            onChange={(e) => onChangePP('ICMS', e.target.value)}
            disabled={!icmsAtivo}
            className="max-w-[12rem]"
          />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-end gap-3">
          <ToggleSwitch
            label="Aplicar PIS/COFINS"
            ativo={piscofinsAtivo}
            onChange={(v) => onToggle('PISCOFINS', v)}
          />
          <Input
            label="PIS (%)"
            type="number"
            step="0.01"
            value={pisPP}
            onChange={(e) => onChangePP('PIS', e.target.value)}
            disabled={!piscofinsAtivo}
          />
          <Input
            label="COFINS (%)"
            type="number"
            step="0.01"
            value={cofinsPP}
            onChange={(e) => onChangePP('COFINS', e.target.value)}
            disabled={!piscofinsAtivo}
          />
        </div>
      )}
    </Card>
  );
}

function AbaImposto({
  label,
  ativo,
  dim,
  onClick,
}: {
  label: string;
  ativo: boolean;
  dim: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 h-8 rounded-lg text-xs transition ${
        ativo ? 'bg-accent text-[#0B0B0D]' : 'bg-surface-2 text-text-2 hover:text-text'
      } ${dim && !ativo ? 'opacity-40' : ''}`}
    >
      {label}
    </button>
  );
}

function ToggleSwitch({
  label,
  ativo,
  onChange,
}: {
  label: string;
  ativo: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ativo)}
      className="flex items-center gap-2.5 h-11 px-1"
      role="switch"
      aria-checked={ativo}
    >
      <span
        className={`relative w-10 h-6 rounded-full transition ${
          ativo ? 'bg-accent' : 'bg-surface-3'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${
            ativo ? 'translate-x-4' : ''
          }`}
        />
      </span>
      <span className="text-sm text-text-2">{label}</span>
    </button>
  );
}

function CardValorFinal({ calc }: { calc: ReturnType<typeof calcularImpostos> }) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-accent-soft-border p-6"
      style={{ background: 'linear-gradient(135deg, #2A2010 0%, transparent 100%)' }}
    >
      <div
        className="absolute -top-1/2 -right-[20%] w-52 h-52 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, #D4A017 0%, transparent 70%)',
          opacity: 0.18,
        }}
      />
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-accent mb-1">Valor final</p>
          <p
            className="font-serif-display font-mono-num"
            style={{
              fontSize: 40,
              lineHeight: 1.1,
              background: 'linear-gradient(135deg, #F5C44A 0%, #D4A017 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {brl(calc.valorFinal)}
          </p>
          <p className="text-xs text-text-3 mt-1 font-mono-num">
            {fmtKg(Number.isFinite(calc.valorFinal) ? (calc.precoFinalKg ? Number(calc.precoFinalKg) : 0) : 0).replace(' kg', '')}{' '}
            · preço final {brl4(calc.precoFinalKg)}/kg
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right text-xs">
          <Mini label="Negociado" valor={brl(calc.valorNegociado)} />
          <Mini label="Impostos" valor={brl(calc.totalImpostos)} />
          <Mini
            label="Alíquota"
            valor={`${(calc.totalAlqDecimal * 100).toLocaleString('pt-BR', {
              maximumFractionDigits: 2,
            })}%`}
          />
        </div>
      </div>
    </div>
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
    return new Date(iso).toLocaleDateString('pt-BR');
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

function Mini({ label, valor }: { label: string; valor: ReactNode }) {
  return (
    <div>
      <p className="text-text-3 uppercase tracking-wider">{label}</p>
      <p className="font-mono-num text-text mt-0.5">{valor}</p>
    </div>
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

  // Inclui o pedido atual se já vinculado mas não está mais "ativo" (pra editar funcionar)
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
    // Edição com pedido vinculado mas cliente sem pedidos ativos (já concluído talvez)
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
