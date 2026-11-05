import { useMemo } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { CampoComSugestoes, type SugestaoItem } from '../ui/CampoComSugestoes';
import { useToast } from '../ui/Toast';
import { useMateriais, useCriarMaterial } from '../../hooks/useMateriais';
import { calcularImpostos, ALIQUOTAS_PADRAO } from '../../utils/calculos';
import { brl } from '../../lib/formatters';
import type { NfFormData, ItemNFFormData } from '../../schemas/nf';
import type { MaterialRow } from '../../types/database';

function itemPadrao(): ItemNFFormData {
  return {
    material: '',
    peso: '',
    preco_negociado: '',
    icms_ativo: true,
    piscofins_ativo: true,
    icms_pct_pp: String(ALIQUOTAS_PADRAO.ICMS * 100),
    pis_pct_pp: String(ALIQUOTAS_PADRAO.PIS * 100),
    cofins_pct_pp: String(ALIQUOTAS_PADRAO.COFINS * 100),
  };
}

function calcItem(vals: ItemNFFormData | undefined) {
  const peso = Number(String(vals?.peso ?? '').replace(',', '.')) || 0;
  const preco = Number(String(vals?.preco_negociado ?? '').replace(',', '.')) || 0;
  const icmsAtivo = vals?.icms_ativo ?? true;
  const piscofinsAtivo = vals?.piscofins_ativo ?? true;
  const icms = icmsAtivo ? (Number(String(vals?.icms_pct_pp ?? '').replace(',', '.')) || 0) : 0;
  const pis = piscofinsAtivo ? (Number(String(vals?.pis_pct_pp ?? '').replace(',', '.')) || 0) : 0;
  const cofins = piscofinsAtivo ? (Number(String(vals?.cofins_pct_pp ?? '').replace(',', '.')) || 0) : 0;
  return calcularImpostos({
    peso,
    precoNegociado: preco,
    icmsAtivo,
    piscofinsAtivo,
    icmsPct: icms / 100,
    pisPct: pis / 100,
    cofinsPct: cofins / 100,
  });
}

export function ItensNF() {
  const toast = useToast();
  const materiais = useMateriais();
  const criarMaterial = useCriarMaterial();

  const {
    control,
    watch,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<NfFormData>();

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });

  const sugestoes = useMemo<SugestaoItem<MaterialRow>[]>(
    () => (materiais.data ?? []).map((m) => ({ id: m.id, label: m.nome, payload: m })),
    [materiais.data],
  );

  const valoresItens = watch('itens') ?? [];

  const totais = useMemo(() => {
    return valoresItens.reduce(
      (acc, item) => {
        const c = calcItem(item);
        return {
          valorFinal: acc.valorFinal + c.valorFinal,
          totalImpostos: acc.totalImpostos + c.totalImpostos,
        };
      },
      { valorFinal: 0, totalImpostos: 0 },
    );
  }, [valoresItens]);

  async function onCriarMaterial(nome: string, idx: number) {
    try {
      const novo = await criarMaterial.mutateAsync({
        nome,
        icms_padrao: 18,
        pis_padrao: 1.65,
        cofins_padrao: 7.6,
      });
      setValue(`itens.${idx}.material`, novo.nome, { shouldValidate: true });
      toast.success(`Material "${nome}" criado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar material');
    }
  }

  const erroArray = !Array.isArray(errors.itens)
    ? (errors.itens as { message?: string } | undefined)?.message
    : undefined;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.16em] text-text-3">Itens da nota</p>
        {fields.length < 10 && (
          <button
            type="button"
            onClick={() => append(itemPadrao())}
            className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs bg-surface-2 text-text-2 border border-border hover:text-text hover:bg-surface-3 transition"
          >
            <Plus size={12} /> Adicionar item
          </button>
        )}
      </div>

      {fields.map((field, idx) => {
        const vals = valoresItens[idx];
        const preview = calcItem(vals);
        const errosItem = Array.isArray(errors.itens) ? errors.itens[idx] : undefined;
        const icmsAtivo = vals?.icms_ativo ?? true;
        const piscofinsAtivo = vals?.piscofins_ativo ?? true;

        return (
          <Card key={field.id} className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-text-3">Item {idx + 1}</span>
              {fields.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  aria-label="Remover item"
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-text-3 hover:text-warn hover:bg-warn-soft-bg transition"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>

            <CampoComSugestoes
              label="Material *"
              value={vals?.material ?? ''}
              onChange={(v) => setValue(`itens.${idx}.material`, v, { shouldValidate: true })}
              onSelect={(item) => {
                setValue(`itens.${idx}.material`, item.payload.nome, { shouldValidate: true });
                setValue(`itens.${idx}.icms_pct_pp`, String(Number(item.payload.icms_padrao)), { shouldValidate: true });
                setValue(`itens.${idx}.pis_pct_pp`, String(Number(item.payload.pis_padrao)), { shouldValidate: true });
                setValue(`itens.${idx}.cofins_pct_pp`, String(Number(item.payload.cofins_padrao)), { shouldValidate: true });
              }}
              onCriar={(nome) => onCriarMaterial(nome, idx)}
              sugestoes={sugestoes}
              permitirNovo
              placeholder="Sucata ferrosa, alumínio..."
              error={errosItem?.material?.message}
            />

            <div className="grid grid-cols-2 gap-3 mt-3">
              <Input
                label="Peso (kg) *"
                type="number"
                step="0.001"
                {...register(`itens.${idx}.peso`)}
                error={errosItem?.peso?.message}
              />
              <Input
                label="R$/kg negociado *"
                type="number"
                step="0.0001"
                {...register(`itens.${idx}.preco_negociado`)}
                error={errosItem?.preco_negociado?.message}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-end gap-2">
                <div className="flex flex-col gap-1 pb-0.5">
                  <span className="text-xs text-text-2">ICMS</span>
                  <ToggleSmall
                    ativo={icmsAtivo}
                    onChange={(v) => setValue(`itens.${idx}.icms_ativo`, v)}
                  />
                </div>
                <Input
                  label="Alíquota (%)"
                  type="number"
                  step="0.01"
                  {...register(`itens.${idx}.icms_pct_pp`)}
                  disabled={!icmsAtivo}
                  className="flex-1"
                />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mt-auto pt-0.5">
                  <ToggleSmall
                    ativo={piscofinsAtivo}
                    onChange={(v) => setValue(`itens.${idx}.piscofins_ativo`, v)}
                  />
                  <span className="text-xs text-text-2">PIS/COFINS</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="PIS (%)"
                    type="number"
                    step="0.01"
                    {...register(`itens.${idx}.pis_pct_pp`)}
                    disabled={!piscofinsAtivo}
                  />
                  <Input
                    label="COFINS (%)"
                    type="number"
                    step="0.01"
                    {...register(`itens.${idx}.cofins_pct_pp`)}
                    disabled={!piscofinsAtivo}
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border-soft flex justify-end">
              <div className="text-right">
                <p className="text-xs text-text-3">Valor final do item</p>
                <p
                  className="font-serif-display font-mono-num text-lg"
                  style={{
                    background: 'linear-gradient(135deg, #F5C44A 0%, #D4A017 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {brl(preview.valorFinal)}
                </p>
              </div>
            </div>
          </Card>
        );
      })}

      {erroArray && <p className="text-xs text-warn">{erroArray}</p>}

      {fields.length > 1 && (
        <div
          className="relative overflow-hidden rounded-[14px] border border-accent-soft-border p-4"
          style={{ background: 'linear-gradient(135deg, #2A2010 0%, transparent 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-accent mb-1">Total consolidado</p>
              <p className="text-xs text-text-3 font-mono-num">{fields.length} itens</p>
            </div>
            <div className="text-right">
              <p
                className="font-serif-display font-mono-num text-2xl"
                style={{
                  background: 'linear-gradient(135deg, #F5C44A 0%, #D4A017 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                {brl(totais.valorFinal)}
              </p>
              <p className="text-xs text-text-3 font-mono-num">
                impostos: {brl(totais.totalImpostos)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToggleSmall({ ativo, onChange }: { ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      onClick={() => onChange(!ativo)}
      className={`relative w-8 h-5 rounded-full transition flex-shrink-0 ${ativo ? 'bg-accent' : 'bg-surface-3'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition ${ativo ? 'translate-x-3' : ''}`}
      />
    </button>
  );
}
