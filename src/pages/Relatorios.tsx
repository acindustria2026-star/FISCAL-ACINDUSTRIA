import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Clock,
  Layers,
  Scale,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { AvatarCliente } from '../components/ui/AvatarCliente';
import { useToast } from '../components/ui/Toast';
import { CabecalhoRelatorio } from '../components/relatorios/CabecalhoRelatorio';
import {
  MetricasRelatorio,
  type MetricaSlim,
} from '../components/relatorios/MetricasRelatorio';
import {
  TabelaRelatorio,
  type ColunaRelatorio,
} from '../components/relatorios/TabelaRelatorio';
import {
  useRelatorioDiferencaPeso,
  useRelatorioEmAberto,
  useRelatorioImpureza,
  useRelatorioValorReceber,
  type ItemDiferencaPeso,
  type ItemEmAberto,
  type ItemImpureza,
  type ItemValorReceber,
} from '../hooks/useRelatorios';
import { useEmpresa } from '../hooks/useEmpresa';
import { useOrdenacao } from '../hooks/useOrdenacao';
import { usePeriodo } from '../contexts/PeriodoContext';
import { brl, formatarData, kg as fmtKg } from '../lib/formatters';
import { imprimirRelatorio, type MetricaParaPrint } from '../utils/imprimirRelatorio';

type Aba = 'impureza' | 'diferenca' | 'valor' | 'aberto';

const ABAS: { key: Aba; label: string; icon: LucideIcon }[] = [
  { key: 'impureza', label: 'Impureza por material', icon: Layers },
  { key: 'diferenca', label: 'Diferença de peso', icon: Scale },
  { key: 'valor', label: 'Valor a receber', icon: Wallet },
  { key: 'aberto', label: 'Notas em aberto', icon: Clock },
];

export default function Relatorios() {
  const [aba, setAba] = useState<Aba>('impureza');
  const sort = useOrdenacao();
  const { formatarPeriodo } = usePeriodo();
  const empresa = useEmpresa();
  const toast = useToast();

  function trocarAba(nova: Aba) {
    setAba(nova);
    sort.reset();
  }

  const empresaIncompleta =
    !empresa.data || !empresa.data.nome_fantasia || !empresa.data.cnpj;

  return (
    <div className="max-w-[1300px] mx-auto flex flex-col gap-5">
      <header>
        <p className="text-xs uppercase tracking-[0.16em] text-accent mb-2 font-mono-num">
          {formatarPeriodo()}
        </p>
        <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Relatórios</h1>
        <p className="text-text-2 text-sm md:text-base">
          Análises consolidadas do período. Click em "Imprimir" pra gerar versão timbrada.
        </p>
      </header>

      {empresaIncompleta && (
        <Card className="p-4 bg-amber-soft-bg border-amber-soft-border flex items-start gap-3">
          <AlertCircle size={16} className="text-amber mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-text">Configure os dados da empresa</p>
            <p className="text-xs text-text-2 mt-0.5">
              Nome fantasia e CNPJ são obrigatórios pro timbrado.{' '}
              <Link to="/cadastros" className="text-accent hover:underline">
                Ir pra Cadastros
              </Link>
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {ABAS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => trocarAba(a.key)}
            className={`inline-flex items-center gap-2 px-4 h-9 rounded-full text-sm transition border ${
              aba === a.key
                ? 'bg-accent text-[#0B0B0D] border-accent'
                : 'bg-surface-2 text-text-2 hover:text-text border-border'
            }`}
          >
            <a.icon size={14} />
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'impureza' && (
        <ViewImpureza
          sort={sort}
          empresaIncompleta={empresaIncompleta}
          onErroImpressao={(m) => toast.error(m)}
          empresa={empresa.data ?? null}
          periodoLabel={formatarPeriodo()}
        />
      )}
      {aba === 'diferenca' && (
        <ViewDiferenca
          sort={sort}
          empresaIncompleta={empresaIncompleta}
          onErroImpressao={(m) => toast.error(m)}
          empresa={empresa.data ?? null}
          periodoLabel={formatarPeriodo()}
        />
      )}
      {aba === 'valor' && (
        <ViewValor
          sort={sort}
          empresaIncompleta={empresaIncompleta}
          onErroImpressao={(m) => toast.error(m)}
          empresa={empresa.data ?? null}
          periodoLabel={formatarPeriodo()}
        />
      )}
      {aba === 'aberto' && (
        <ViewAberto
          sort={sort}
          empresaIncompleta={empresaIncompleta}
          onErroImpressao={(m) => toast.error(m)}
          empresa={empresa.data ?? null}
          periodoLabel={formatarPeriodo()}
        />
      )}
    </div>
  );
}

interface ViewProps {
  sort: ReturnType<typeof useOrdenacao>;
  empresaIncompleta: boolean;
  onErroImpressao: (msg: string) => void;
  empresa: import('../types/database').EmpresaRow | null;
  periodoLabel: string;
}

function pctStr(n: number, signed = false): string {
  return `${(n * 100).toLocaleString('pt-BR', {
    signDisplay: signed ? 'always' : 'auto',
    maximumFractionDigits: 2,
  })}%`;
}

// ─── Aba: Impureza ─────────────────────────────────────────────────────

function ViewImpureza({ sort, empresaIncompleta, onErroImpressao, empresa, periodoLabel }: ViewProps) {
  const dados = useRelatorioImpureza();
  const itens = dados.data?.itens ?? [];
  const m = dados.data?.metricas;

  const metricas: MetricaSlim[] = m
    ? [
        { label: 'Total impureza', valor: fmtKg(m.total_impureza), tom: 'warn' },
        { label: 'Peso total', valor: fmtKg(m.total_peso) },
        { label: '% médio', valor: pctStr(m.pct_medio), tom: 'accent' },
        { label: 'Materiais', valor: m.materiais_afetados },
        { label: 'Recebimentos', valor: m.qtd_recebimentos },
      ]
    : [];

  const colunas: ColunaRelatorio<ItemImpureza>[] = [
    {
      key: 'material',
      label: 'Material',
      ordenavel: true,
      extrair: (i) => i.material,
      render: (i) => <span className="text-text">{i.material}</span>,
      printValue: (i) => i.material,
      total: () => 'Total',
    },
    {
      key: 'peso_total',
      label: 'Peso total',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.peso_total,
      render: (i) => <span className="text-text">{fmtKg(i.peso_total)}</span>,
      printValue: (i) => fmtKg(i.peso_total),
      total: (arr) => fmtKg(arr.reduce((s, i) => s + i.peso_total, 0)),
      printTotal: (arr) => fmtKg(arr.reduce((s, i) => s + i.peso_total, 0)),
    },
    {
      key: 'impureza_total',
      label: 'Impureza',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.impureza_total,
      render: (i) => <span className="text-warn">{fmtKg(i.impureza_total)}</span>,
      printValue: (i) => fmtKg(i.impureza_total),
      total: (arr) => fmtKg(arr.reduce((s, i) => s + i.impureza_total, 0)),
      printTotal: (arr) => fmtKg(arr.reduce((s, i) => s + i.impureza_total, 0)),
    },
    {
      key: 'impureza_media',
      label: '% médio',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.impureza_media,
      render: (i) => <span className="text-text-2">{pctStr(i.impureza_media)}</span>,
      printValue: (i) => pctStr(i.impureza_media),
    },
    {
      key: 'qtd_recebimentos',
      label: 'Recs',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.qtd_recebimentos,
      render: (i) => <span className="text-text-2">{i.qtd_recebimentos}</span>,
      printValue: (i) => String(i.qtd_recebimentos),
    },
    {
      key: 'cliente_principal',
      label: 'Cliente principal',
      ordenavel: true,
      extrair: (i) => i.cliente_principal ?? '',
      render: (i) =>
        i.cliente_principal ? (
          <div className="flex items-center gap-2 min-w-0">
            <AvatarCliente nome={i.cliente_principal} size={28} />
            <span className="text-text truncate">{i.cliente_principal}</span>
          </div>
        ) : (
          <span className="text-text-3">—</span>
        ),
      printValue: (i) => i.cliente_principal ?? '—',
    },
  ];

  function imprimir() {
    const r = montarImpressao({
      titulo: 'Relatório de impureza por material',
      itens,
      colunas,
      metricas,
      empresa,
      empresaIncompleta,
      periodoLabel,
    });
    if (!r.ok) onErroImpressao(r.motivo ?? 'Erro');
  }

  return (
    <ViewContainer
      cabecalho={{
        icon: Layers,
        titulo: 'Impureza por material',
        descricao: 'Quanto de impureza descartada em cada tipo de material no período.',
        onImprimir: imprimir,
        empresaIncompleta,
      }}
      metricas={metricas}
    >
      <TabelaRelatorio
        itens={itens}
        colunas={colunas}
        estado={sort.estado}
        onToggle={sort.toggle}
        isLoading={dados.isLoading}
        rowKey={(i) => i.material}
        emptyTitulo="Sem recebimentos no período"
        emptyDescricao="Lance recebimentos pra ver agregação por material."
        emptyIcon={<Layers size={28} />}
        minWidth={900}
      />
    </ViewContainer>
  );
}

// ─── Aba: Diferença ────────────────────────────────────────────────────

function ViewDiferenca({ sort, empresaIncompleta, onErroImpressao, empresa, periodoLabel }: ViewProps) {
  const dados = useRelatorioDiferencaPeso();
  const itens = dados.data;

  const metricas: MetricaSlim[] = useMemo(() => {
    const totalDif = itens.reduce((s, i) => s + i.difKg, 0);
    const divergentes = itens.filter((i) => i.status === 'divergente').length;
    const pesoEmitido = itens.reduce((s, i) => s + i.pesoEmitido, 0);
    const pctMedio = pesoEmitido > 0 ? totalDif / pesoEmitido : 0;
    return [
      { label: 'NFs com diferença', valor: itens.length },
      { label: 'Total Δ', valor: `${totalDif > 0 ? '+' : ''}${fmtKg(totalDif)}`, tom: 'warn' },
      { label: 'Δ médio', valor: pctStr(pctMedio, true) },
      { label: 'Divergentes (>2%)', valor: divergentes, tom: divergentes > 0 ? 'warn' : 'default' },
    ];
  }, [itens]);

  const colunas: ColunaRelatorio<ItemDiferencaPeso>[] = [
    {
      key: 'numero',
      label: 'Nº NF',
      ordenavel: true,
      extrair: (i) => i.nf.numero,
      render: (i) => <span className="font-mono-num text-text">{i.nf.numero}</span>,
      printValue: (i) => i.nf.numero,
    },
    {
      key: 'data',
      label: 'Data',
      ordenavel: true,
      extrair: (i) => i.nf.data,
      render: (i) => (
        <span className="font-mono-num text-text-2 whitespace-nowrap">
          {formatarData(i.nf.data)}
        </span>
      ),
      printValue: (i) => formatarData(i.nf.data),
    },
    {
      key: 'peso_emitido',
      label: 'Peso emitido',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.pesoEmitido,
      render: (i) => fmtKg(i.pesoEmitido),
      printValue: (i) => fmtKg(i.pesoEmitido),
    },
    {
      key: 'peso_recebido',
      label: 'Peso recebido',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.pesoLiquido,
      render: (i) => fmtKg(i.pesoLiquido),
      printValue: (i) => fmtKg(i.pesoLiquido),
    },
    {
      key: 'dif_kg',
      label: 'Δ kg',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.difKg,
      render: (i) => (
        <span className={i.status === 'divergente' ? 'text-warn' : 'text-text-2'}>
          {i.difKg > 0 ? '+' : ''}
          {fmtKg(i.difKg)}
        </span>
      ),
      printValue: (i) => `${i.difKg > 0 ? '+' : ''}${fmtKg(i.difKg)}`,
    },
    {
      key: 'dif_pct',
      label: 'Δ %',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.difPct,
      render: (i) => (
        <span className={i.status === 'divergente' ? 'text-warn' : 'text-text-2'}>
          {pctStr(i.difPct, true)}
        </span>
      ),
      printValue: (i) => pctStr(i.difPct, true),
    },
    {
      key: 'status',
      label: 'Status',
      ordenavel: true,
      extrair: (i) => i.status,
      render: (i) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-md text-xs border ${
            i.status === 'divergente'
              ? 'bg-warn-soft-bg text-warn border-warn-soft-border'
              : 'bg-accent-soft-bg text-accent border-accent-soft-border'
          }`}
        >
          {i.status === 'divergente' ? 'Divergente' : 'OK'}
        </span>
      ),
      printValue: (i) => (i.status === 'divergente' ? 'Divergente' : 'OK'),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      ordenavel: true,
      extrair: (i) => i.cliente_nome,
      render: (i) => (
        <div className="flex items-center gap-2 min-w-0">
          <AvatarCliente nome={i.cliente_nome} size={28} />
          <span className="text-text truncate">{i.cliente_nome}</span>
        </div>
      ),
      printValue: (i) => i.cliente_nome,
    },
  ];

  function imprimir() {
    const r = montarImpressao({
      titulo: 'Relatório de diferença de peso',
      itens,
      colunas,
      metricas,
      empresa,
      empresaIncompleta,
      periodoLabel,
    });
    if (!r.ok) onErroImpressao(r.motivo ?? 'Erro');
  }

  return (
    <ViewContainer
      cabecalho={{
        icon: Scale,
        titulo: 'Diferença de peso',
        descricao: 'NFs com discrepância entre peso emitido e peso recebido pelo cliente.',
        onImprimir: imprimir,
        empresaIncompleta,
      }}
      metricas={metricas}
    >
      <TabelaRelatorio
        itens={itens}
        colunas={colunas}
        estado={sort.estado}
        onToggle={sort.toggle}
        isLoading={dados.isLoading}
        rowKey={(i) => i.nf.id}
        emptyTitulo="Nenhuma diferença no período"
        emptyDescricao="Todos os recebimentos bateram com o peso emitido."
        emptyIcon={<Scale size={28} />}
        minWidth={1000}
      />
    </ViewContainer>
  );
}

// ─── Aba: Valor a receber ──────────────────────────────────────────────

function ViewValor({ sort, empresaIncompleta, onErroImpressao, empresa, periodoLabel }: ViewProps) {
  const dados = useRelatorioValorReceber();
  const itens = dados.data;

  const metricas: MetricaSlim[] = useMemo(() => {
    const total = itens.reduce((s, i) => s + i.valor, 0);
    const atrasadas = itens.filter((i) => i.status === 'atrasada');
    const totalAtrasado = atrasadas.reduce((s, i) => s + i.valor, 0);
    return [
      { label: 'Total a receber', valor: brl(total), tom: 'accent' },
      { label: 'NFs', valor: itens.length },
      { label: 'Atrasadas', valor: atrasadas.length, tom: atrasadas.length > 0 ? 'warn' : 'default' },
      { label: 'Total atrasado', valor: brl(totalAtrasado), tom: totalAtrasado > 0 ? 'warn' : 'default' },
    ];
  }, [itens]);

  const colunas: ColunaRelatorio<ItemValorReceber>[] = [
    {
      key: 'numero',
      label: 'Nº NF',
      ordenavel: true,
      extrair: (i) => i.nf.numero,
      render: (i) => <span className="font-mono-num text-text">{i.nf.numero}</span>,
      printValue: (i) => i.nf.numero,
      total: () => 'Total',
    },
    {
      key: 'emissao',
      label: 'Emissão',
      ordenavel: true,
      extrair: (i) => i.nf.data,
      render: (i) => (
        <span className="font-mono-num text-text-2 whitespace-nowrap">
          {formatarData(i.nf.data)}
        </span>
      ),
      printValue: (i) => formatarData(i.nf.data),
    },
    {
      key: 'vencimento',
      label: 'Vencimento',
      ordenavel: true,
      extrair: (i) => i.vencimento,
      render: (i) => (
        <span
          className={`font-mono-num whitespace-nowrap ${
            i.status === 'atrasada' ? 'text-warn' : 'text-text-2'
          }`}
        >
          {i.vencimento ? formatarData(i.vencimento) : '—'}
        </span>
      ),
      printValue: (i) => (i.vencimento ? formatarData(i.vencimento) : '—'),
    },
    {
      key: 'valor',
      label: 'Valor',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.valor,
      render: (i) => <span className="font-medium text-text">{brl(i.valor)}</span>,
      printValue: (i) => brl(i.valor),
      total: (arr) => brl(arr.reduce((s, i) => s + i.valor, 0)),
      printTotal: (arr) => brl(arr.reduce((s, i) => s + i.valor, 0)),
    },
    {
      key: 'dias',
      label: 'Em aberto',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.diasEmAberto,
      render: (i) => <span className="text-text-2 font-mono-num">{i.diasEmAberto}d</span>,
      printValue: (i) => `${i.diasEmAberto}d`,
    },
    {
      key: 'status',
      label: 'Status',
      ordenavel: true,
      extrair: (i) => i.status,
      render: (i) => (
        <span
          className={`inline-block px-2 py-0.5 rounded-md text-xs border ${
            i.status === 'atrasada'
              ? 'bg-warn-soft-bg text-warn border-warn-soft-border'
              : 'bg-amber-soft-bg text-amber border-amber-soft-border'
          }`}
        >
          {i.status === 'atrasada'
            ? `Atrasada · ${i.diasAtraso ?? 0}d`
            : i.diasParaVencer !== null
              ? `Vence em ${i.diasParaVencer}d`
              : 'Aguardando'}
        </span>
      ),
      printValue: (i) =>
        i.status === 'atrasada'
          ? `Atrasada · ${i.diasAtraso ?? 0}d`
          : i.diasParaVencer !== null
            ? `Vence em ${i.diasParaVencer}d`
            : 'Aguardando',
    },
    {
      key: 'cliente',
      label: 'Cliente',
      ordenavel: true,
      extrair: (i) => i.cliente_nome,
      render: (i) => (
        <div className="flex items-center gap-2 min-w-0">
          <AvatarCliente nome={i.cliente_nome} size={28} />
          <span className="text-text truncate">{i.cliente_nome}</span>
        </div>
      ),
      printValue: (i) => i.cliente_nome,
    },
  ];

  function imprimir() {
    const r = montarImpressao({
      titulo: 'Relatório de valor a receber',
      itens,
      colunas,
      metricas,
      empresa,
      empresaIncompleta,
      periodoLabel,
    });
    if (!r.ok) onErroImpressao(r.motivo ?? 'Erro');
  }

  return (
    <ViewContainer
      cabecalho={{
        icon: Wallet,
        titulo: 'Valor a receber',
        descricao: 'NFs pendentes e atrasadas no período (recebido fica fora).',
        onImprimir: imprimir,
        empresaIncompleta,
      }}
      metricas={metricas}
    >
      <TabelaRelatorio
        itens={itens}
        colunas={colunas}
        estado={sort.estado}
        onToggle={sort.toggle}
        isLoading={dados.isLoading}
        rowKey={(i) => i.nf.id}
        emptyTitulo="Sem pendências no período"
        emptyDescricao="Tudo já foi pago — bom trabalho."
        emptyIcon={<Wallet size={28} />}
        minWidth={1100}
      />
    </ViewContainer>
  );
}

// ─── Aba: Em aberto ────────────────────────────────────────────────────

function ViewAberto({ sort, empresaIncompleta, onErroImpressao, empresa, periodoLabel }: ViewProps) {
  const dados = useRelatorioEmAberto();
  const itens = dados.data;

  const metricas: MetricaSlim[] = useMemo(() => {
    const totVal = itens.reduce((s, i) => s + Number(i.nf.valor_final), 0);
    const totPeso = itens.reduce((s, i) => s + Number(i.nf.peso), 0);
    const maisAntigo = itens.length > 0 ? Math.max(...itens.map((i) => i.diasEmAberto)) : 0;
    return [
      { label: 'NFs em aberto', valor: itens.length },
      { label: 'Peso total', valor: fmtKg(totPeso) },
      { label: 'Valor total', valor: brl(totVal), tom: 'accent' },
      { label: 'Mais antiga', valor: `${maisAntigo}d`, tom: maisAntigo > 30 ? 'warn' : 'default' },
    ];
  }, [itens]);

  const colunas: ColunaRelatorio<ItemEmAberto>[] = [
    {
      key: 'numero',
      label: 'Nº NF',
      ordenavel: true,
      extrair: (i) => i.nf.numero,
      render: (i) => <span className="font-mono-num text-text">{i.nf.numero}</span>,
      printValue: (i) => i.nf.numero,
      total: () => 'Total',
    },
    {
      key: 'data',
      label: 'Data',
      ordenavel: true,
      extrair: (i) => i.nf.data,
      render: (i) => (
        <span className="font-mono-num text-text-2 whitespace-nowrap">
          {formatarData(i.nf.data)}
        </span>
      ),
      printValue: (i) => formatarData(i.nf.data),
    },
    {
      key: 'dias',
      label: 'Idade',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.diasEmAberto,
      render: (i) => {
        const cor =
          i.diasEmAberto > 30
            ? 'bg-warn-soft-bg text-warn border-warn-soft-border'
            : i.diasEmAberto > 7
              ? 'bg-amber-soft-bg text-amber border-amber-soft-border'
              : 'bg-surface-2 text-text-2 border-border-soft';
        return (
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-mono-num border ${cor}`}>
            {i.diasEmAberto === 0 ? 'hoje' : `${i.diasEmAberto}d`}
          </span>
        );
      },
      printValue: (i) => (i.diasEmAberto === 0 ? 'hoje' : `${i.diasEmAberto}d`),
    },
    {
      key: 'material',
      label: 'Material',
      ordenavel: true,
      extrair: (i) => i.nf.material ?? '',
      render: (i) => <span className="text-text-2">{i.nf.material ?? '—'}</span>,
      printValue: (i) => i.nf.material ?? '—',
    },
    {
      key: 'peso',
      label: 'Peso',
      ordenavel: true,
      align: 'right',
      extrair: (i) => Number(i.nf.peso),
      render: (i) => fmtKg(i.nf.peso),
      printValue: (i) => fmtKg(i.nf.peso),
      total: (arr) => fmtKg(arr.reduce((s, i) => s + Number(i.nf.peso), 0)),
      printTotal: (arr) => fmtKg(arr.reduce((s, i) => s + Number(i.nf.peso), 0)),
    },
    {
      key: 'valor',
      label: 'Valor',
      ordenavel: true,
      align: 'right',
      extrair: (i) => Number(i.nf.valor_final),
      render: (i) => <span className="font-medium text-text">{brl(i.nf.valor_final)}</span>,
      printValue: (i) => brl(i.nf.valor_final),
      total: (arr) => brl(arr.reduce((s, i) => s + Number(i.nf.valor_final), 0)),
      printTotal: (arr) => brl(arr.reduce((s, i) => s + Number(i.nf.valor_final), 0)),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      ordenavel: true,
      extrair: (i) => i.cliente_nome,
      render: (i) => (
        <div className="flex items-center gap-2 min-w-0">
          <AvatarCliente nome={i.cliente_nome} size={28} />
          <span className="text-text truncate">{i.cliente_nome}</span>
        </div>
      ),
      printValue: (i) => i.cliente_nome,
    },
  ];

  function imprimir() {
    const r = montarImpressao({
      titulo: 'Relatório de notas em aberto',
      itens,
      colunas,
      metricas,
      empresa,
      empresaIncompleta,
      periodoLabel,
    });
    if (!r.ok) onErroImpressao(r.motivo ?? 'Erro');
  }

  return (
    <ViewContainer
      cabecalho={{
        icon: Clock,
        titulo: 'Notas em aberto',
        descricao: 'NFs sem recebimento lançado · mercadoria ainda não conferida.',
        onImprimir: imprimir,
        empresaIncompleta,
      }}
      metricas={metricas}
    >
      <TabelaRelatorio
        itens={itens}
        colunas={colunas}
        estado={sort.estado}
        onToggle={sort.toggle}
        isLoading={dados.isLoading}
        rowKey={(i) => i.nf.id}
        emptyTitulo="Nenhuma nota em aberto"
        emptyDescricao="Todos os recebimentos estão em dia."
        emptyIcon={<Clock size={28} />}
        minWidth={1000}
      />
    </ViewContainer>
  );
}

// ─── Helpers compartilhados ─────────────────────────────────────────────

function ViewContainer({
  cabecalho,
  metricas,
  children,
}: {
  cabecalho: {
    icon: LucideIcon;
    titulo: string;
    descricao: string;
    onImprimir: () => void;
    empresaIncompleta: boolean;
  };
  metricas: MetricaSlim[];
  children: React.ReactNode;
}) {
  return (
    <>
      <CabecalhoRelatorio
        icon={cabecalho.icon}
        titulo={cabecalho.titulo}
        descricao={cabecalho.descricao}
        onImprimir={cabecalho.onImprimir}
        desabilitarImprimir={cabecalho.empresaIncompleta}
        motivoDesabilitar={
          cabecalho.empresaIncompleta ? 'Configure a empresa antes de imprimir' : null
        }
      />
      <MetricasRelatorio metricas={metricas} />
      {children}
    </>
  );
}

interface ImpressaoArgs<T> {
  titulo: string;
  itens: T[];
  colunas: ColunaRelatorio<T>[];
  metricas: MetricaSlim[];
  empresa: import('../types/database').EmpresaRow | null;
  empresaIncompleta: boolean;
  periodoLabel: string;
}

function metricasParaPrint(arr: MetricaSlim[]): MetricaParaPrint[] {
  return arr.map((m) => ({ label: m.label, valor: String(m.valor) }));
}

function montarImpressao<T>(args: ImpressaoArgs<T>) {
  if (!args.empresa) return { ok: false, motivo: 'Empresa não carregada' };
  if (args.empresaIncompleta) {
    return { ok: false, motivo: 'Configure os dados da empresa em Cadastros' };
  }
  if (args.itens.length === 0) {
    return { ok: false, motivo: 'Nada pra imprimir — relatório vazio' };
  }

  const headers = args.colunas.map((c) => c.label);
  const rows = args.itens.map((item) =>
    args.colunas.map((c) => (c.printValue ? c.printValue(item) : '')),
  );
  const temTotal = args.colunas.some((c) => c.total || c.printTotal);
  const totalRow = temTotal
    ? args.colunas.map((c, idx) => {
        if (c.printTotal) return c.printTotal(args.itens);
        if (idx === 0) return 'Total';
        return '';
      })
    : null;

  const alignmentByCol = args.colunas.map((c) =>
    c.align === 'right' ? ('right' as const) : ('left' as const),
  );

  return imprimirRelatorio({
    empresa: args.empresa,
    titulo: args.titulo,
    periodo: args.periodoLabel,
    metricas: metricasParaPrint(args.metricas),
    headers,
    rows,
    totalRow,
    alignmentByCol,
  });
}
