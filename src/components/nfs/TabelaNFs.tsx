import { FileText, GitBranch, PackageCheck, Pencil, Trash2, Truck } from 'lucide-react';
import { Card } from '../ui/Card';
import { AvatarCliente } from '../ui/AvatarCliente';
import { EmptyState } from '../ui/EmptyState';
import { Loading } from '../ui/Loading';
import { brl, brl4, formatarData, kg as fmtKg } from '../../lib/formatters';
import type { NfComRelacoes } from '../../hooks/useNfs';

interface Props {
  nfs: NfComRelacoes[];
  isLoading: boolean;
  podeEditar: boolean;
  onEditar: (nf: NfComRelacoes) => void;
  onComplementar: (nf: NfComRelacoes) => void;
  onExcluir: (nf: NfComRelacoes) => void;
  onAbrirVinculo: (nf: NfComRelacoes) => void;
  onReceber?: (nf: NfComRelacoes) => void;
}

function temRecebimento(nf: NfComRelacoes): boolean {
  const r = nf.recebimento as unknown;
  if (Array.isArray(r)) return r.length > 0;
  return r != null;
}

export function TabelaNFs({
  nfs,
  isLoading,
  podeEditar,
  onEditar,
  onComplementar,
  onExcluir,
  onAbrirVinculo,
  onReceber,
}: Props) {
  if (isLoading) return <Loading fullScreen={false} text="Carregando notas..." />;
  if (nfs.length === 0) {
    return (
      <Card className="p-0 overflow-hidden">
        <EmptyState
          icon={<FileText size={32} />}
          titulo="Nenhuma NF no período"
          descricao="Cadastre a primeira nota usando o botão acima."
        />
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px]">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-b border-border-soft">
              <th className="px-3 py-2.5 font-medium">Nº NF</th>
              <th className="px-3 py-2.5 font-medium">Data</th>
              <th className="px-3 py-2.5 font-medium">Cliente</th>
              <th className="px-3 py-2.5 font-medium">Material</th>
              <th className="px-3 py-2.5 font-medium font-mono-num text-right">Peso</th>
              <th className="px-3 py-2.5 font-medium font-mono-num text-right">R$/kg neg</th>
              <th className="px-3 py-2.5 font-medium font-mono-num text-right">R$/kg final</th>
              <th className="px-3 py-2.5 font-medium font-mono-num text-right">Negociado</th>
              <th className="px-3 py-2.5 font-medium font-mono-num text-right">Impostos</th>
              <th className="px-3 py-2.5 font-medium font-mono-num text-right">Valor final</th>
              {podeEditar && <th className="px-3 py-2.5 font-medium w-[200px]" />}
            </tr>
          </thead>
          <tbody>
            {nfs.map((nf) => {
              const ehFilha = !!nf.nf_pai_id;
              const foiSubstituida = !!nf.substituida_em;
              const filhasCount = nf.nfs_filhas?.[0]?.count ?? 0;
              const temTransporte = !!(nf.transportadora || nf.placa_veiculo || nf.motorista || nf.tipo_frete);
              const precoMudou =
                nf.preco_final_kg !== null &&
                Math.abs(Number(nf.preco_final_kg) - Number(nf.preco_negociado)) > 0.0001;

              return (
                <tr
                  key={nf.id}
                  className="border-b border-border-soft last:border-b-0 hover:bg-surface-2 transition"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm text-text font-mono-num">{nf.numero}</span>
                      {(ehFilha || foiSubstituida) && (
                        <BadgeCompl onClick={() => onAbrirVinculo(nf)} />
                      )}
                      {filhasCount > 0 && (
                        <BadgeFilhas count={filhasCount} onClick={() => onAbrirVinculo(nf)} />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-text-2 font-mono-num whitespace-nowrap">
                    {formatarData(nf.data)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <AvatarCliente nome={nf.cliente_nome} size={28} />
                      <span className="text-sm text-text">{nf.cliente_nome}</span>
                      {temTransporte && (
                        <Truck size={13} className="text-text-3" aria-label="Com transporte" />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-text-2">{nf.material ?? '—'}</td>
                  <td className="px-3 py-3 text-sm text-text-2 font-mono-num text-right">
                    {fmtKg(nf.peso)}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-2 font-mono-num text-right">
                    {brl4(nf.preco_negociado)}
                  </td>
                  <td
                    className={`px-3 py-3 text-sm font-mono-num text-right ${
                      precoMudou ? 'text-accent' : 'text-text-2'
                    }`}
                  >
                    {brl4(nf.preco_final_kg)}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-2 font-mono-num text-right">
                    {brl(nf.valor_negociado)}
                  </td>
                  <td className="px-3 py-3 text-sm text-text-2 font-mono-num text-right">
                    {brl(nf.total_impostos)}
                  </td>
                  <td className="px-3 py-3 text-sm font-mono-num text-right">
                    <span className="font-serif-display text-base text-text">{brl(nf.valor_final)}</span>
                  </td>
                  {podeEditar && (
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {onReceber && !temRecebimento(nf) && (
                          <button
                            type="button"
                            onClick={() => onReceber(nf)}
                            title="Lançar recebimento"
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs bg-accent-soft-bg text-accent border border-accent-soft-border hover:brightness-125 transition"
                          >
                            <PackageCheck size={12} /> Receber
                          </button>
                        )}
                        <IconBtn label="Complementar" onClick={() => onComplementar(nf)}>
                          <GitBranch size={13} />
                        </IconBtn>
                        <IconBtn label="Editar" onClick={() => onEditar(nf)}>
                          <Pencil size={13} />
                        </IconBtn>
                        <IconBtn label="Excluir" warn onClick={() => onExcluir(nf)}>
                          <Trash2 size={13} />
                        </IconBtn>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function BadgeCompl({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-block px-1.5 py-px rounded-full text-[9px] tracking-[0.08em] uppercase font-bold bg-accent-soft-bg text-accent border border-accent-soft-border hover:brightness-125 transition"
    >
      COMPL
    </button>
  );
}

function BadgeFilhas({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-block px-1.5 py-px rounded-full text-[9px] tracking-[0.08em] uppercase font-bold bg-accent-soft-bg text-accent border border-accent-soft-border hover:brightness-125 transition"
    >
      +{count}
    </button>
  );
}

function IconBtn({
  children,
  label,
  warn,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  warn?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`w-7 h-7 flex items-center justify-center rounded-lg transition ${
        warn
          ? 'text-text-2 hover:text-warn hover:bg-warn-soft-bg'
          : 'text-text-2 hover:text-text hover:bg-surface-3'
      }`}
    >
      {children}
    </button>
  );
}
