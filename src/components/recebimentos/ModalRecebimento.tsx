import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { AvatarCliente } from '../ui/AvatarCliente';
import { useToast } from '../ui/Toast';
import {
  useCriarRecebimento,
  useEditarRecebimento,
  type RecebimentoComNf,
} from '../../hooks/useRecebimentos';
import { recebimentoFormSchema, type RecebimentoFormData } from '../../schemas/recebimento';
import { brl, brl4, kg as fmtKg } from '../../lib/formatters';
import type { NotaFiscalRow } from '../../types/database';

type NFParaContexto = Pick<
  NotaFiscalRow,
  | 'id'
  | 'numero'
  | 'cliente_nome'
  | 'material'
  | 'peso'
  | 'preco_final_kg'
  | 'valor_final'
>;

export type ModalRecContexto =
  | { kind: 'criar'; nf: NFParaContexto }
  | { kind: 'editar'; recebimento: RecebimentoComNf };

interface Props {
  open: boolean;
  onClose: () => void;
  contexto: ModalRecContexto;
}

const formDefault = (ctx: ModalRecContexto): RecebimentoFormData => {
  const today = new Date().toISOString().slice(0, 10);
  if (ctx.kind === 'editar') {
    const r = ctx.recebimento;
    return {
      nf_id: r.nf_id,
      data_recebimento: r.data_recebimento,
      peso_bruto: String(r.peso_bruto),
      impureza_kg: String(r.impureza_kg ?? 0),
      pago: r.pago,
      data_pagamento: r.data_pagamento,
      valor_real_recebido: r.valor_real_recebido !== null ? String(r.valor_real_recebido) : '',
      observacoes: r.observacoes ?? '',
    };
  }
  return {
    nf_id: ctx.nf.id,
    data_recebimento: today,
    peso_bruto: String(ctx.nf.peso),
    impureza_kg: '0',
    pago: true,
    data_pagamento: today,
    valor_real_recebido: '',
    observacoes: '',
  };
};

function nfDoContexto(ctx: ModalRecContexto): NFParaContexto {
  if (ctx.kind === 'criar') return ctx.nf;
  const nf = ctx.recebimento.nf;
  if (!nf) {
    return {
      id: ctx.recebimento.nf_id,
      numero: '—',
      cliente_nome: '—',
      material: null,
      peso: ctx.recebimento.peso_bruto,
      preco_final_kg: 0,
      valor_final: 0,
    };
  }
  return {
    id: nf.id,
    numero: nf.numero,
    cliente_nome: nf.cliente_nome,
    material: nf.material,
    peso: nf.peso,
    preco_final_kg: nf.preco_final_kg,
    valor_final: nf.valor_final,
  };
}

export function ModalRecebimento({ open, onClose, contexto }: Props) {
  if (!open) return null;
  return <Inner onClose={onClose} contexto={contexto} />;
}

function Inner({ onClose, contexto }: { onClose: () => void; contexto: ModalRecContexto }) {
  const toast = useToast();
  const criar = useCriarRecebimento();
  const editar = useEditarRecebimento();
  const nf = nfDoContexto(contexto);
  const precoFinalKg = Number(nf.preco_final_kg ?? 0);

  const form = useForm<RecebimentoFormData>({
    resolver: zodResolver(recebimentoFormSchema),
    defaultValues: formDefault(contexto),
  });

  const pagamentoTocado = useRef(false);
  const [, forceRerender] = useState(0);

  const valores = form.watch();

  // Mirror: data_pagamento = data_recebimento, a não ser que o usuário tenha tocado
  useEffect(() => {
    if (!pagamentoTocado.current && valores.pago) {
      const atual = form.getValues('data_pagamento');
      if (atual !== valores.data_recebimento) {
        form.setValue('data_pagamento', valores.data_recebimento);
      }
    }
  }, [valores.data_recebimento, valores.pago, form]);

  // Quando ativa pagamento, garante data_pagamento preenchida
  useEffect(() => {
    if (valores.pago && !valores.data_pagamento) {
      form.setValue('data_pagamento', valores.data_recebimento);
      pagamentoTocado.current = false;
    }
  }, [valores.pago, valores.data_pagamento, valores.data_recebimento, form]);

  const calc = useMemo(() => {
    const pb = Number(String(valores.peso_bruto ?? '0').replace(',', '.')) || 0;
    const ik = Number(String(valores.impureza_kg ?? '0').replace(',', '.')) || 0;
    const pesoLiquido = Math.max(pb - ik, 0);
    const impPct = pb > 0 ? ik / pb : 0;
    const valorPago = pesoLiquido * precoFinalKg;
    const impInvalida = ik > pb;
    return { pesoLiquido, impPct, valorPago, impInvalida };
  }, [valores.peso_bruto, valores.impureza_kg, precoFinalKg]);

  const valorRealRecebidoNum = useMemo(() => {
    const v = String(valores.valor_real_recebido ?? '').trim();
    if (!v) return null;
    const n = Number(v.replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }, [valores.valor_real_recebido]);

  const diferenca =
    valorRealRecebidoNum !== null ? valorRealRecebidoNum - calc.valorPago : null;

  const dataPagamentoEspelha =
    !pagamentoTocado.current ||
    valores.data_pagamento === valores.data_recebimento;

  async function onSubmit(d: RecebimentoFormData) {
    const parsed = recebimentoFormSchema.parse(d);
    const payload = {
      nf_id: parsed.nf_id,
      data_recebimento: parsed.data_recebimento,
      peso_bruto: parsed.peso_bruto,
      impureza_kg: parsed.impureza_kg,
      pago: parsed.pago,
      data_pagamento: parsed.pago ? parsed.data_pagamento ?? parsed.data_recebimento : null,
      valor_real_recebido: parsed.pago ? parsed.valor_real_recebido ?? null : null,
      observacoes: parsed.observacoes?.trim() || null,
    };

    try {
      if (contexto.kind === 'editar') {
        await editar.mutateAsync({
          id: contexto.recebimento.id,
          dados: payload,
          precoFinalKg,
          pagoAnterior: contexto.recebimento.pago,
        });
        toast.success('Recebimento atualizado');
      } else {
        await criar.mutateAsync(payload);
        toast.success('Recebimento lançado');
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  const salvando = criar.isPending || editar.isPending;
  const titulo = contexto.kind === 'editar' ? `Editar recebimento · NF ${nf.numero}` : `Lançar recebimento · NF ${nf.numero}`;

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
        <ResumoNF nf={nf} />

        <Section titulo="Dados do recebimento">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Data do recebimento *"
              type="date"
              {...form.register('data_recebimento')}
              error={form.formState.errors.data_recebimento?.message}
            />
            <Input
              label="Peso bruto (kg) *"
              type="number"
              step="0.001"
              {...form.register('peso_bruto')}
              error={form.formState.errors.peso_bruto?.message}
            />
          </div>
        </Section>

        <Section titulo="Conferência">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Impureza (kg)"
              type="number"
              step="0.001"
              {...form.register('impureza_kg')}
              error={
                calc.impInvalida
                  ? 'Impureza maior que o peso bruto'
                  : form.formState.errors.impureza_kg?.message
              }
            />
            <ReadonlyField
              label="Peso líquido"
              valor={calc.impInvalida ? '—' : fmtKg(calc.pesoLiquido)}
              destacar
            />
            <ReadonlyField
              label="Impureza %"
              valor={
                calc.impInvalida
                  ? '—'
                  : `${(calc.impPct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
              }
            />
          </div>
        </Section>

        <CardCalculado
          pesoLiquido={calc.pesoLiquido}
          impurezaKg={Number(String(valores.impureza_kg ?? '0').replace(',', '.')) || 0}
          impurezaPct={calc.impPct}
          valorPago={calc.valorPago}
          precoFinalKg={precoFinalKg}
          impInvalida={calc.impInvalida}
        />

        <TogglePagamento
          ativo={valores.pago}
          onChange={(v) => {
            form.setValue('pago', v);
            if (!v) pagamentoTocado.current = false;
            forceRerender((n) => n + 1);
          }}
        />

        {valores.pago ? (
          <Section titulo="Pagamento">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Data do pagamento *"
                  type="date"
                  value={valores.data_pagamento ?? ''}
                  onChange={(e) => {
                    pagamentoTocado.current = true;
                    form.setValue('data_pagamento', e.target.value);
                    forceRerender((n) => n + 1);
                  }}
                />
                {!dataPagamentoEspelha && (
                  <button
                    type="button"
                    onClick={() => {
                      pagamentoTocado.current = false;
                      form.setValue('data_pagamento', valores.data_recebimento);
                      forceRerender((n) => n + 1);
                    }}
                    className="self-start inline-flex items-center gap-1 text-xs text-text-3 hover:text-accent transition"
                  >
                    <RotateCcw size={11} /> usar data do recebimento
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Input
                  label="Valor realmente recebido (R$)"
                  type="number"
                  step="0.01"
                  placeholder={String(calc.valorPago.toFixed(2))}
                  {...form.register('valor_real_recebido')}
                  helper="Deixe vazio se recebeu o valor exato"
                />
                {diferenca !== null && Math.abs(diferenca) >= 0.01 && (
                  <p
                    className={`text-xs font-mono-num ${
                      diferenca > 0 ? 'text-accent' : 'text-warn'
                    }`}
                  >
                    Diferença: {diferenca > 0 ? '+' : '−'}
                    {brl(Math.abs(diferenca))}
                  </p>
                )}
              </div>
            </div>
          </Section>
        ) : (
          <Card className="p-4 bg-amber-soft-bg border-amber-soft-border flex items-start gap-3">
            <AlertCircle size={16} className="text-amber mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-text">Recebimento sem pagamento imediato</p>
              <p className="text-xs text-text-2 mt-0.5">
                Cliente recebeu mas pagará depois. Marque como pago no Financeiro quando o
                pagamento for confirmado.
              </p>
            </div>
          </Card>
        )}

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

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-text-3 mb-3">{titulo}</p>
      {children}
    </div>
  );
}

function ResumoNF({ nf }: { nf: NFParaContexto }) {
  return (
    <Card className="p-4 flex items-center gap-4 flex-wrap">
      <AvatarCliente nome={nf.cliente_nome} size={40} />
      <Item label="NF" valor={nf.numero} />
      <Item label="Cliente" valor={nf.cliente_nome} />
      <Item label="Material" valor={nf.material ?? '—'} />
      <Item label="Peso emitido" valor={fmtKg(nf.peso)} />
      <Item label="Valor NF" valor={brl(nf.valor_final)} />
      <Item label="R$/kg final" valor={brl4(nf.preco_final_kg ?? 0)} />
    </Card>
  );
}

function Item({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-text-3">{label}</p>
      <p className="text-sm text-text font-mono-num mt-0.5">{valor}</p>
    </div>
  );
}

function ReadonlyField({ label, valor, destacar }: { label: string; valor: string; destacar?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-text-2 font-medium">{label}</span>
      <div
        className={`h-11 px-3.5 flex items-center bg-surface-3 border border-border rounded-xl font-mono-num ${
          destacar ? 'text-accent text-base font-medium' : 'text-text-2'
        }`}
      >
        {valor}
      </div>
    </div>
  );
}

function CardCalculado({
  pesoLiquido,
  impurezaKg,
  impurezaPct,
  valorPago,
  impInvalida,
}: {
  pesoLiquido: number;
  impurezaKg: number;
  impurezaPct: number;
  valorPago: number;
  precoFinalKg: number;
  impInvalida: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-accent-soft-border p-5"
      style={{ background: 'linear-gradient(135deg, #2A2010 0%, transparent 100%)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Bloco
          label="Peso líquido"
          valor={impInvalida ? '—' : `${pesoLiquido.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`}
          dourado
        />
        <Bloco
          label="Impureza"
          valor={
            impInvalida
              ? '—'
              : `${impurezaKg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg (${(impurezaPct * 100).toLocaleString(
                  'pt-BR',
                  { maximumFractionDigits: 2 },
                )}%)`
          }
        />
        <Bloco
          label="Valor a pagar"
          valor={impInvalida ? '—' : brl(valorPago)}
          dourado
        />
      </div>
    </div>
  );
}

function Bloco({ label, valor, dourado }: { label: string; valor: string; dourado?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-text-3 mb-1.5">{label}</p>
      <p
        className={`font-serif-display font-mono-num ${dourado ? 'text-accent' : 'text-text'}`}
        style={{ fontSize: 22 }}
      >
        {valor}
      </p>
    </div>
  );
}

function TogglePagamento({ ativo, onChange }: { ativo: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!ativo)}
      className="flex items-center gap-3 text-left"
      role="switch"
      aria-checked={ativo}
    >
      <span
        className={`relative w-10 h-6 rounded-full transition flex-shrink-0 ${
          ativo ? 'bg-accent' : 'bg-surface-3'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${
            ativo ? 'translate-x-4' : ''
          }`}
        />
      </span>
      <div>
        <p className="text-sm text-text font-medium">Recebimento com pagamento</p>
        <p className="text-xs text-text-3">Padrão: pagamento à vista no recebimento</p>
      </div>
    </button>
  );
}
