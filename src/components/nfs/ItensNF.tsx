import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { brl, kg as fmtKg } from '../../lib/formatters';
import type { NfFormData, ItemNF } from '../../schemas/nf';
import type { MaterialRow } from '../../types/database';

interface Props {
  materiais: MaterialRow[];
}

function itemPadrao(): ItemNF {
  return {
    id: null,
    material: '',
    peso: 0,
    preco_negociado: 0,
    icms_pct: 0,
    pis_pct: 0,
    cofins_pct: 0,
  };
}

export function ItensNF({ materiais }: Props) {
  const {
    control,
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<NfFormData>();

  const { fields, append, remove } = useFieldArray({ control, name: 'itens' });
  const valoresItens = watch('itens') ?? [];

  const totalPeso = valoresItens.reduce((s, i) => s + Number(i?.peso ?? 0), 0);
  const totalNegociado = valoresItens.reduce(
    (s, i) => s + Number(i?.peso ?? 0) * Number(i?.preco_negociado ?? 0),
    0,
  );

  function aplicarAliquotasDoMaterial(idx: number, nomeMaterial: string) {
    const mat = materiais.find((m) => m.nome === nomeMaterial);
    if (mat) {
      setValue(`itens.${idx}.icms_pct`, mat.icms_padrao ?? 0);
      setValue(`itens.${idx}.pis_pct`, mat.pis_padrao ?? 0);
      setValue(`itens.${idx}.cofins_pct`, mat.cofins_padrao ?? 0);
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

      {fields.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <p className="text-sm text-text-3 mb-2">Nenhum item adicionado</p>
          <button
            type="button"
            onClick={() => append(itemPadrao())}
            className="text-sm text-accent hover:underline"
          >
            Adicionar primeiro item
          </button>
        </div>
      )}

      {fields.map((field, idx) => {
        const vals = valoresItens[idx];
        const peso = Number(vals?.peso ?? 0);
        const preco = Number(vals?.preco_negociado ?? 0);
        const subtotal = peso * preco;
        const errosItem = Array.isArray(errors.itens) ? errors.itens[idx] : undefined;

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

            <div>
              <label className="text-sm text-text-2 font-medium">Material *</label>
              <select
                value={vals?.material ?? ''}
                onChange={(e) => {
                  setValue(`itens.${idx}.material`, e.target.value, { shouldValidate: true });
                  aplicarAliquotasDoMaterial(idx, e.target.value);
                }}
                className="mt-1.5 w-full h-11 bg-surface-2 border border-border rounded-xl px-3.5 text-text outline-none focus:border-accent transition"
              >
                <option value="">Selecione...</option>
                {materiais.map((m) => (
                  <option key={m.id} value={m.nome}>
                    {m.nome}
                  </option>
                ))}
              </select>
              {errosItem?.material?.message && (
                <p className="text-xs text-warn mt-1">{errosItem.material.message}</p>
              )}
            </div>

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

            <div className="grid grid-cols-3 gap-3 mt-3">
              <Input
                label="ICMS (%)"
                type="number"
                step="0.01"
                {...register(`itens.${idx}.icms_pct`)}
              />
              <Input
                label="PIS (%)"
                type="number"
                step="0.01"
                {...register(`itens.${idx}.pis_pct`)}
              />
              <Input
                label="COFINS (%)"
                type="number"
                step="0.01"
                {...register(`itens.${idx}.cofins_pct`)}
              />
            </div>

            {subtotal > 0 && (
              <div className="mt-3 pt-3 border-t border-border-soft flex justify-end">
                <div className="text-right">
                  <p className="text-xs text-text-3">Subtotal negociado</p>
                  <p className="font-serif-display font-mono-num text-accent">{brl(subtotal)}</p>
                </div>
              </div>
            )}
          </Card>
        );
      })}

      {erroArray && <p className="text-xs text-warn">{erroArray}</p>}

      {fields.length > 1 && (
        <div className="rounded-[14px] border border-accent-soft-border bg-accent-soft-bg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-accent mb-1">Total</p>
            <p className="text-xs text-text-3 font-mono-num">
              {fmtKg(totalPeso)} · {fields.length} itens
            </p>
          </div>
          <div className="text-right">
            <p className="font-serif-display font-mono-num text-xl text-accent">
              {brl(totalNegociado)}
            </p>
            <p className="text-xs text-text-3">valor negociado</p>
          </div>
        </div>
      )}
    </div>
  );
}
