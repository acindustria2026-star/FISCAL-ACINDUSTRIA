import { useMemo, useState } from 'react';
import { CheckCircle2, PackageCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { AvatarCliente } from '../components/ui/AvatarCliente';
import {
  ModalRecebimento,
  type ModalRecContexto,
} from '../components/recebimentos/ModalRecebimento';
import { useNfsEmAberto } from '../hooks/useNfsEmAberto';
import { usePapel } from '../hooks/usePapel';
import { usePeriodo } from '../contexts/PeriodoContext';
import { brl, formatarData, kg as fmtKg } from '../lib/formatters';
import type { NotaFiscalRow } from '../types/database';

type CorIdade = 'cinza' | 'amber' | 'coral';

function calcularIdade(dataEmissao: string): { dias: number; cor: CorIdade } {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(dataEmissao);
  d.setHours(0, 0, 0, 0);
  const dias = Math.max(
    0,
    Math.floor((hoje.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)),
  );
  if (dias > 30) return { dias, cor: 'coral' };
  if (dias > 7) return { dias, cor: 'amber' };
  return { dias, cor: 'cinza' };
}

const corBadge: Record<CorIdade, string> = {
  cinza: 'bg-surface-2 text-text-2 border-border-soft',
  amber: 'bg-amber-soft-bg text-amber border-amber-soft-border',
  coral: 'bg-warn-soft-bg text-warn border-warn-soft-border',
};

export default function NotasEmAberto() {
  const lista = useNfsEmAberto();
  const { podeEditarNFs } = usePapel();
  const { formatarPeriodo } = usePeriodo();
  const [modalRec, setModalRec] = useState<ModalRecContexto | null>(null);

  const itens = lista.data ?? [];

  const totais = useMemo(() => {
    const totValor = itens.reduce((s, n) => s + Number(n.valor_final), 0);
    const totPeso = itens.reduce((s, n) => s + Number(n.peso), 0);
    const maisAntiga = itens[0]?.data ?? null;
    const maisAntigaIdade = maisAntiga ? calcularIdade(maisAntiga) : null;
    return { qtd: itens.length, totValor, totPeso, maisAntiga, maisAntigaIdade };
  }, [itens]);

  function lancarRecebimento(nf: NotaFiscalRow) {
    setModalRec({
      kind: 'criar',
      nf: {
        id: nf.id,
        numero: nf.numero,
        cliente_nome: nf.cliente_nome,
        material: nf.material,
        peso: nf.peso,
        preco_final_kg: nf.preco_final_kg,
        valor_final: nf.valor_final,
      },
    });
  }

  return (
    <div className="max-w-[1200px] mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-accent mb-2 font-mono-num">
          {formatarPeriodo()}
        </p>
        <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Notas em aberto</h1>
        <p className="text-text-2 text-sm md:text-base">
          NFs emitidas sem recebimento lançado · mercadoria ainda não conferida pelo cliente.
        </p>
      </header>

      <div className="bg-surface-2 border border-border-soft rounded-xl p-4 mb-5">
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <Metric label="Total de NFs" valor={String(totais.qtd)} />
          <Metric label="Valor total" valor={brl(totais.totValor)} />
          <Metric label="Peso total" valor={fmtKg(totais.totPeso)} />
          <Metric
            label="Mais antiga"
            valor={
              totais.maisAntiga
                ? `${formatarData(totais.maisAntiga)}${
                    totais.maisAntigaIdade ? ` · ${totais.maisAntigaIdade.dias}d` : ''
                  }`
                : '—'
            }
            tom={totais.maisAntigaIdade?.cor === 'coral' ? 'warn' : undefined}
          />
        </div>
      </div>

      {lista.isLoading ? (
        <Loading fullScreen={false} text="Carregando..." />
      ) : itens.length === 0 ? (
        <Card className="p-0 overflow-hidden">
          <EmptyState
            icon={<CheckCircle2 size={36} className="text-accent" />}
            titulo="Nenhuma nota em aberto"
            descricao="Todos os recebimentos estão em dia."
          />
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
                  <th className="px-3 py-2.5 font-medium w-10">#</th>
                  <th className="px-3 py-2.5 font-medium">Nº NF</th>
                  <th className="px-3 py-2.5 font-medium">Data</th>
                  <th className="px-3 py-2.5 font-medium">Idade</th>
                  <th className="px-3 py-2.5 font-medium">Material</th>
                  <th className="px-3 py-2.5 font-medium font-mono-num text-right">Peso</th>
                  <th className="px-3 py-2.5 font-medium font-mono-num text-right">Valor</th>
                  <th className="px-3 py-2.5 font-medium">Cliente</th>
                  {podeEditarNFs && <th className="px-3 py-2.5 w-44" />}
                </tr>
              </thead>
              <tbody>
                {itens.map((nf, idx) => {
                  const idade = calcularIdade(nf.data);
                  return (
                    <tr
                      key={nf.id}
                      className="border-b border-border-soft last:border-b-0 hover:bg-surface-2/60 transition"
                    >
                      <td className="px-3 py-3 text-xs text-text-3 font-mono-num">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-3 text-sm text-text font-mono-num">
                        {nf.numero}
                      </td>
                      <td className="px-3 py-3 text-sm text-text-2 font-mono-num whitespace-nowrap">
                        {formatarData(nf.data)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium font-mono-num border ${corBadge[idade.cor]}`}
                        >
                          {idade.dias === 0 ? 'hoje' : `${idade.dias} ${idade.dias === 1 ? 'dia' : 'dias'}`}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-text-2">
                        {nf.material ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-text font-mono-num text-right">
                        {fmtKg(nf.peso)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className="font-mono-num text-text font-medium">
                          {brl(nf.valor_final)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <AvatarCliente nome={nf.cliente_nome} size={28} />
                          <span className="text-sm text-text truncate">
                            {nf.cliente_nome}
                          </span>
                        </div>
                      </td>
                      {podeEditarNFs && (
                        <td className="px-3 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => lancarRecebimento(nf)}
                            className="inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs bg-accent-soft-bg text-accent border border-accent-soft-border hover:bg-accent hover:text-[#0B0B0D] transition"
                          >
                            <PackageCheck size={12} /> Lançar recebimento
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modalRec && (
        <ModalRecebimento
          open
          onClose={() => setModalRec(null)}
          contexto={modalRec}
        />
      )}
    </div>
  );
}

function Metric({
  label,
  valor,
  tom,
}: {
  label: string;
  valor: string;
  tom?: 'warn';
}) {
  return (
    <div className="flex flex-col gap-1 min-w-[120px]">
      <span className="text-[10px] uppercase tracking-[0.12em] text-text-3">{label}</span>
      <span
        className={`text-sm font-mono-num font-semibold ${
          tom === 'warn' ? 'text-warn' : 'text-text'
        }`}
      >
        {valor}
      </span>
    </div>
  );
}
