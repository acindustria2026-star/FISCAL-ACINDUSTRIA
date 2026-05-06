import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { AvatarCliente } from '../ui/AvatarCliente';
import { BlocoComparativo, LinhaComparativo } from './BlocoComparativo';
import { StatusPillComparativo, corBarraStatus } from './StatusPillComparativo';
import { brl, brl4, formatarData, kg as fmtKg } from '../../lib/formatters';
import type { ItemComparativo } from '../../hooks/useComparativo';

interface Props {
  item: ItemComparativo;
  selecionada: boolean;
  onToggleSelecao: () => void;
}

export function CardComparativo({ item, selecionada, onToggleSelecao }: Props) {
  const [aberto, setAberto] = useState(false);
  const c = item;
  const valorRef = c.valorPago ?? c.valorFinalNf;

  return (
    <div
      className={`rounded-[14px] overflow-hidden border transition ${
        selecionada
          ? 'border-accent shadow-[0_4px_16px_rgba(212,160,23,0.15)]'
          : 'border-border'
      }`}
      style={{
        background: selecionada
          ? 'linear-gradient(90deg, var(--accent-soft-bg) 0%, var(--surface) 100%)'
          : 'var(--surface)',
      }}
    >
      <div className={`h-[3px] ${corBarraStatus[c.status]}`} />

      <div className="flex">
        <button
          type="button"
          onClick={onToggleSelecao}
          aria-label={selecionada ? 'Desmarcar' : 'Selecionar'}
          aria-pressed={selecionada}
          className="px-4 py-3 flex items-start hover:bg-surface-2/60 transition"
        >
          <span
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
              selecionada ? 'bg-accent border-accent' : 'border-border bg-transparent'
            }`}
          >
            {selecionada && <Check size={12} className="text-[#0B0B0D]" strokeWidth={3} />}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            className="w-full text-left flex items-center gap-3 px-2 py-3 hover:bg-surface-2/60 transition"
          >
            <ChevronRight
              size={16}
              className={`text-text-3 flex-shrink-0 transition ${aberto ? 'rotate-90' : ''}`}
            />
            <AvatarCliente nome={c.nf.cliente_nome} size={32} />
            <div className="flex flex-col flex-shrink-0 min-w-[110px]">
              <span className="text-sm text-text font-mono-num">NF {c.nf.numero}</span>
              <span className="text-xs text-text-3 font-mono-num">{formatarData(c.nf.data)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text truncate">{c.nf.cliente_nome}</p>
              <p className="text-xs text-text-3 truncate font-mono-num">
                {c.nf.material ?? 'sem material'} · {fmtKg(c.pesoEmitido)}
              </p>
            </div>
            {c.difPesoPct !== null && (
              <span
                className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono-num ${
                  c.status === 'divergente'
                    ? 'bg-warn-soft-bg text-warn border border-warn-soft-border'
                    : 'bg-surface-3 text-text-2 border border-border'
                }`}
              >
                {(c.difPesoPct * 100).toLocaleString('pt-BR', {
                  signDisplay: 'always',
                  maximumFractionDigits: 2,
                })}
                %
              </span>
            )}
            <span className="hidden md:inline text-sm text-text font-serif-display font-mono-num min-w-[120px] text-right">
              {brl(valorRef)}
            </span>
            <StatusPillComparativo status={c.status} />
          </button>

          {aberto && (
            <div className="border-t border-border-soft px-5 py-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <BlocoComparativo titulo="Peso">
                  <LinhaComparativo label="Emitido" valor={fmtKg(c.pesoEmitido)} />
                  <LinhaComparativo
                    label="Recebido bruto"
                    valor={c.rec?.peso_bruto != null ? fmtKg(c.rec.peso_bruto) : '—'}
                  />
                  <LinhaComparativo
                    label="Impureza"
                    cor={c.rec?.impureza_kg != null && Number(c.rec.impureza_kg) > 0 ? 'warn' : 'muted'}
                    valor={
                      c.rec?.impureza_kg != null
                        ? `− ${fmtKg(c.rec.impureza_kg)}`
                        : '—'
                    }
                  />
                  <LinhaComparativo
                    label="Recebido líq."
                    destaque
                    valor={c.pesoLiquido !== null ? fmtKg(c.pesoLiquido) : '—'}
                  />
                  <LinhaComparativo
                    label="Diferença"
                    cor={c.status === 'divergente' ? 'warn' : c.difPeso === null ? 'muted' : 'accent'}
                    destaque
                    valor={
                      c.difPeso !== null && c.difPesoPct !== null
                        ? `${c.difPeso > 0 ? '+' : ''}${fmtKg(c.difPeso)} (${(
                            c.difPesoPct * 100
                          ).toLocaleString('pt-BR', {
                            signDisplay: 'always',
                            maximumFractionDigits: 2,
                          })}%)`
                        : '—'
                    }
                  />
                </BlocoComparativo>

                <BlocoComparativo titulo="Valor">
                  <LinhaComparativo label="Negociado" valor={brl(c.valorNegociadoNf)} />
                  <LinhaComparativo label="Final NF" valor={brl(c.valorFinalNf)} />
                  <LinhaComparativo
                    label="Pago"
                    cor={c.valorPago !== null ? 'accent' : 'muted'}
                    destaque
                    valor={c.valorPago !== null ? brl(c.valorPago) : '—'}
                  />
                  {c.difValor !== null && Math.abs(c.difValor) >= 0.01 && (
                    <LinhaComparativo
                      label="Diferença"
                      cor={c.difValor > 0 ? 'accent' : 'warn'}
                      valor={`${c.difValor > 0 ? '+' : ''}${brl(c.difValor)}`}
                    />
                  )}
                </BlocoComparativo>

                <BlocoComparativo titulo="Imposto">
                  <LinhaComparativo label="Total NF" valor={brl(c.impostoNf)} />
                  <LinhaComparativo label="ICMS" valor={brl(c.nf.icms)} />
                  <LinhaComparativo
                    label="PIS+COFINS"
                    valor={brl(Number(c.nf.pis) + Number(c.nf.cofins))}
                  />
                  <LinhaComparativo
                    label="R$/kg final"
                    valor={brl4(c.nf.preco_final_kg)}
                  />
                </BlocoComparativo>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
