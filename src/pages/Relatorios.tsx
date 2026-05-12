import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Coins,
  Layers,
  Scale,
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
  useRelatorioNotasPagas,
  useRelatorioPrecoReal,
  type ItemDiferencaPeso,
  type ItemEmAberto,
  type ItemImpureza,
  type ItemNotaPaga,
} from '../hooks/useRelatorios';
import { useEmpresa } from '../hooks/useEmpresa';
import { useOrdenacao } from '../hooks/useOrdenacao';
import { usePeriodo } from '../contexts/PeriodoContext';
import { brl, brl4, formatarData, kg as fmtKg } from '../lib/formatters';
import { imprimirRelatorio, type MetricaParaPrint } from '../utils/imprimirRelatorio';
import {
  imprimirRelatorio as imprimirPrecoReal,
  baixarPDFRelatorio,
  exportarExcelRelatorio,
  type DadosRelatorio,
} from '../lib/relatorioPrecoReal';
import type { EmpresaRow } from '../types/database';

type Aba = 'impureza' | 'diferenca' | 'aberto' | 'pagas' | 'precoReal';

const ABAS: { key: Aba; label: string; icon: LucideIcon }[] = [
  { key: 'impureza', label: 'Impureza por material', icon: Layers },
  { key: 'diferenca', label: 'Diferença de peso', icon: Scale },
  { key: 'aberto', label: 'Notas em aberto', icon: Clock },
  { key: 'pagas', label: 'Notas pagas', icon: CheckCircle2 },
  { key: 'precoReal', label: 'Preço real', icon: Coins },
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
      {aba === 'aberto' && (
        <ViewAberto
          sort={sort}
          empresaIncompleta={empresaIncompleta}
          onErroImpressao={(m) => toast.error(m)}
          empresa={empresa.data ?? null}
          periodoLabel={formatarPeriodo()}
        />
      )}
      {aba === 'pagas' && (
        <ViewPagas
          sort={sort}
          empresaIncompleta={empresaIncompleta}
          onErroImpressao={(m) => toast.error(m)}
          empresa={empresa.data ?? null}
          periodoLabel={formatarPeriodo()}
        />
      )}
      {aba === 'precoReal' && (
        <ViewPrecoReal empresa={empresa.data ?? null} periodoLabel={formatarPeriodo()} />
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

function precoKgStr(v: number | string | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  const n = typeof v === 'string' ? Number(v) : v;
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `${brl4(n)}/kg`;
}

function precoKgMedioPond(itens: { peso: number; precoKg: number }[]): number {
  let somaPondPeso = 0;
  let somaPeso = 0;
  for (const i of itens) {
    if (!Number.isFinite(i.precoKg) || i.precoKg <= 0) continue;
    if (!Number.isFinite(i.peso) || i.peso <= 0) continue;
    somaPondPeso += i.precoKg * i.peso;
    somaPeso += i.peso;
  }
  return somaPeso > 0 ? somaPondPeso / somaPeso : 0;
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

// ─── Aba: Notas pagas (NFs com recebimento + pago=true) ────────────────

function ViewPagas({ sort, empresaIncompleta, onErroImpressao, empresa, periodoLabel }: ViewProps) {
  const dados = useRelatorioNotasPagas();
  const itens = dados.data;

  const metricas: MetricaSlim[] = useMemo(() => {
    const totalValor = itens.reduce((s, i) => s + i.valorPago, 0);
    const totalPeso = itens.reduce((s, i) => s + Number(i.nf.peso), 0);
    const precoMedio = precoKgMedioPond(
      itens.map((i) => ({
        peso: Number(i.nf.peso) || 0,
        precoKg: Number(i.nf.preco_negociado) || 0,
      })),
    );
    return [
      { label: 'NFs pagas', valor: itens.length, tom: 'accent' },
      { label: 'Peso total', valor: fmtKg(totalPeso) },
      { label: 'Valor pago total', valor: brl(totalValor), tom: 'accent' },
      { label: 'R$/kg médio', valor: precoKgStr(precoMedio), tom: 'accent' },
    ];
  }, [itens]);

  const colunas: ColunaRelatorio<ItemNotaPaga>[] = [
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
      label: 'Data NF',
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
      key: 'preco_kg',
      label: 'R$/kg',
      ordenavel: true,
      align: 'right',
      extrair: (i) => Number(i.nf.preco_negociado) || 0,
      render: (i) => (
        <span className="font-medium text-accent">{precoKgStr(i.nf.preco_negociado)}</span>
      ),
      printValue: (i) => precoKgStr(i.nf.preco_negociado),
      total: (arr) =>
        precoKgStr(
          precoKgMedioPond(
            arr.map((i) => ({
              peso: Number(i.nf.peso) || 0,
              precoKg: Number(i.nf.preco_negociado) || 0,
            })),
          ),
        ),
      printTotal: (arr) =>
        precoKgStr(
          precoKgMedioPond(
            arr.map((i) => ({
              peso: Number(i.nf.peso) || 0,
              precoKg: Number(i.nf.preco_negociado) || 0,
            })),
          ),
        ),
    },
    {
      key: 'valor_pago',
      label: 'Valor pago',
      ordenavel: true,
      align: 'right',
      extrair: (i) => i.valorPago,
      render: (i) => <span className="font-medium text-accent">{brl(i.valorPago)}</span>,
      printValue: (i) => brl(i.valorPago),
      total: (arr) => brl(arr.reduce((s, i) => s + i.valorPago, 0)),
      printTotal: (arr) => brl(arr.reduce((s, i) => s + i.valorPago, 0)),
    },
    {
      key: 'data_pagamento',
      label: 'Data pagto',
      ordenavel: true,
      extrair: (i) => i.dataPagamento ?? '',
      render: (i) => (
        <span className="font-mono-num text-text-2 whitespace-nowrap">
          {i.dataPagamento ? formatarData(i.dataPagamento) : '—'}
        </span>
      ),
      printValue: (i) => (i.dataPagamento ? formatarData(i.dataPagamento) : '—'),
    },
  ];

  function imprimir() {
    const r = montarImpressao({
      titulo: 'Relatório de notas pagas',
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
        icon: CheckCircle2,
        titulo: 'Notas pagas',
        descricao: 'NFs com recebimento conferido e pagamento realizado.',
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
        emptyTitulo="Nenhuma NF paga neste período"
        emptyDescricao="Quando recebimentos forem marcados como pagos, aparecem aqui."
        emptyIcon={<CheckCircle2 size={28} />}
        minWidth={1200}
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
    const precoMedio = precoKgMedioPond(
      itens.map((i) => ({
        peso: Number(i.nf.peso) || 0,
        precoKg: Number(i.nf.preco_negociado) || 0,
      })),
    );
    return [
      { label: 'NFs em aberto', valor: itens.length },
      { label: 'Peso total', valor: fmtKg(totPeso) },
      { label: 'Valor total', valor: brl(totVal), tom: 'accent' },
      { label: 'R$/kg médio', valor: precoKgStr(precoMedio), tom: 'accent' },
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
      key: 'preco_kg',
      label: 'R$/kg',
      ordenavel: true,
      align: 'right',
      extrair: (i) => Number(i.nf.preco_negociado) || 0,
      render: (i) => (
        <span className="font-medium text-accent">{precoKgStr(i.nf.preco_negociado)}</span>
      ),
      printValue: (i) => precoKgStr(i.nf.preco_negociado),
      total: (arr) =>
        precoKgStr(
          precoKgMedioPond(
            arr.map((i) => ({
              peso: Number(i.nf.peso) || 0,
              precoKg: Number(i.nf.preco_negociado) || 0,
            })),
          ),
        ),
      printTotal: (arr) =>
        precoKgStr(
          precoKgMedioPond(
            arr.map((i) => ({
              peso: Number(i.nf.peso) || 0,
              precoKg: Number(i.nf.preco_negociado) || 0,
            })),
          ),
        ),
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
        minWidth={1100}
      />
    </ViewContainer>
  );
}

// ─── Aba: Preço real ───────────────────────────────────────────────────

function ViewPrecoReal({
  empresa,
  periodoLabel,
}: {
  empresa: EmpresaRow | null;
  periodoLabel: string;
}) {
  const dados = useRelatorioPrecoReal();
  const itens = dados.data;

  const [filtroMaterial, setFiltroMaterial] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');

  const materiais = useMemo(
    () => Array.from(new Set(itens.map((i) => i.material).filter(Boolean))).sort(),
    [itens],
  );
  const clientes = useMemo(
    () => Array.from(new Set(itens.map((i) => i.cliente_nome).filter(Boolean))).sort(),
    [itens],
  );

  const itensFiltrados = useMemo(() => {
    return itens.filter((i) => {
      if (filtroMaterial && i.material !== filtroMaterial) return false;
      if (filtroCliente && i.cliente_nome !== filtroCliente) return false;
      return true;
    });
  }, [itens, filtroMaterial, filtroCliente]);

  const resumo = useMemo(() => {
    const totalNFs = itensFiltrados.length;
    const pesoTotal = itensFiltrados.reduce((s, i) => s + i.pesoOrigem, 0);
    const valorTotal = itensFiltrados.reduce((s, i) => s + i.valorPago, 0);
    const precoMedio = pesoTotal > 0 ? valorTotal / pesoTotal : 0;
    return { totalNFs, pesoTotal, valorTotal, precoMedio };
  }, [itensFiltrados]);

  const porMaterial = useMemo(() => {
    const map = new Map<string, { peso: number; valor: number; nfs: number }>();
    for (const i of itensFiltrados) {
      const atual = map.get(i.material) ?? { peso: 0, valor: 0, nfs: 0 };
      atual.peso += i.pesoOrigem;
      atual.valor += i.valorPago;
      atual.nfs += 1;
      map.set(i.material, atual);
    }
    return Array.from(map.entries())
      .map(([material, d]) => ({
        material,
        ...d,
        precoReal: d.peso > 0 ? d.valor / d.peso : 0,
      }))
      .sort((a, b) => b.precoReal - a.precoReal);
  }, [itensFiltrados]);

  const porCliente = useMemo(() => {
    const map = new Map<string, { peso: number; valor: number; nfs: number }>();
    for (const i of itensFiltrados) {
      const atual = map.get(i.cliente_nome) ?? { peso: 0, valor: 0, nfs: 0 };
      atual.peso += i.pesoOrigem;
      atual.valor += i.valorPago;
      atual.nfs += 1;
      map.set(i.cliente_nome, atual);
    }
    return Array.from(map.entries())
      .map(([cliente, d]) => ({
        cliente,
        ...d,
        precoReal: d.peso > 0 ? d.valor / d.peso : 0,
      }))
      .sort((a, b) => b.precoReal - a.precoReal);
  }, [itensFiltrados]);

  const itensOrdenados = useMemo(
    () => [...itensFiltrados].sort((a, b) => b.precoReal - a.precoReal),
    [itensFiltrados],
  );

  function montarDadosRelatorio(): DadosRelatorio {
    const enderecoCompleto = empresa
      ? [
          empresa.endereco,
          [empresa.cidade, empresa.uf].filter(Boolean).join('/'),
          empresa.cep ? `CEP ${empresa.cep}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';

    return {
      empresa: {
        nome_fantasia: empresa?.nome_fantasia ?? 'AC INDÚSTRIA',
        razao_social: empresa?.razao_social ?? undefined,
        cnpj: empresa?.cnpj ?? undefined,
        endereco: enderecoCompleto || undefined,
        telefone: empresa?.telefone ?? undefined,
        email: empresa?.email ?? undefined,
      },
      periodo: { label: periodoLabel },
      filtros: {
        material: filtroMaterial || undefined,
        cliente: filtroCliente || undefined,
      },
      resumo,
      porMaterial,
      porCliente,
      detalhado: itensOrdenados.map((i) => ({
        numero: i.nf.numero,
        data: i.nf.data,
        cliente_nome: i.cliente_nome,
        material: i.material,
        peso: i.pesoOrigem,
        valor_pago: i.valorPago,
        preco_real: i.precoReal,
      })),
    };
  }

  function handleImprimir() {
    imprimirPrecoReal(montarDadosRelatorio());
  }

  function handleBaixarPDF() {
    baixarPDFRelatorio(montarDadosRelatorio());
  }

  function handleExportarExcel() {
    exportarExcelRelatorio(montarDadosRelatorio());
  }

  const semDados = resumo.totalNFs === 0;

  if (dados.isLoading) {
    return (
      <Card className="p-8 text-center text-text-2 text-sm">
        Carregando preço real...
      </Card>
    );
  }

  if (itens.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Coins size={28} className="mx-auto text-text-3 mb-3" />
        <p className="text-text">Sem recebimentos no período</p>
        <p className="text-text-2 text-sm mt-1">
          Lance recebimentos pra calcular o preço real (valor pago ÷ peso de origem).
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filtros */}
      <Card className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-text-3 uppercase tracking-[0.12em] block mb-2">
              Material
            </label>
            <select
              value={filtroMaterial}
              onChange={(e) => setFiltroMaterial(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition"
            >
              <option value="">Todos os materiais</option>
              {materiais.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-text-3 uppercase tracking-[0.12em] block mb-2">
              Cliente
            </label>
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition"
            >
              <option value="">Todos os clientes</option>
              {clientes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Botões de exportação */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleImprimir}
          disabled={semDados}
          className="px-4 h-10 rounded-lg text-sm bg-surface-2 text-text-2 border border-border hover:text-text hover:border-accent transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-text-2"
        >
          🖨️ Imprimir
        </button>
        <button
          type="button"
          onClick={handleBaixarPDF}
          disabled={semDados}
          className="px-4 h-10 rounded-lg text-sm bg-surface-2 text-text-2 border border-border hover:text-text hover:border-accent transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-text-2"
        >
          📥 Baixar PDF
        </button>
        <button
          type="button"
          onClick={handleExportarExcel}
          disabled={semDados}
          className="px-4 h-10 rounded-lg text-sm bg-surface-2 text-text-2 border border-border hover:text-text hover:border-accent transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-border disabled:hover:text-text-2"
        >
          📊 Exportar Excel
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <p className="text-[11px] text-text-3 uppercase tracking-[0.12em]">NFs processadas</p>
          <p className="text-3xl font-medium font-mono-num mt-2 text-text">{resumo.totalNFs}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-text-3 uppercase tracking-[0.12em]">Peso de origem</p>
          <p className="text-2xl font-medium font-mono-num mt-2 text-text">
            {fmtKg(resumo.pesoTotal)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] text-text-3 uppercase tracking-[0.12em]">Valor pago</p>
          <p className="text-2xl font-medium font-mono-num mt-2 text-text">
            {brl(resumo.valorTotal)}
          </p>
        </Card>
        <Card className="p-4 bg-accent-soft-bg border-accent-soft-border">
          <p className="text-[11px] text-accent uppercase tracking-[0.12em]">
            ⭐ Preço real médio
          </p>
          <p className="font-serif-display font-mono-num text-3xl text-accent mt-2">
            {brl4(resumo.precoMedio)}
            <span className="text-sm text-accent/70 ml-1">/kg</span>
          </p>
        </Card>
      </div>

      {/* Por material */}
      <Card className="p-5">
        <h2 className="font-serif-display text-2xl mb-4">Por material</h2>
        <div className="flex flex-col">
          {porMaterial.map((m) => (
            <div
              key={m.material}
              className="flex items-center justify-between gap-4 border-b border-border-soft py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-text truncate">{m.material || '—'}</p>
                <p className="text-xs text-text-3 font-mono-num mt-0.5">
                  {m.nfs} NF · {fmtKg(m.peso)} · {brl(m.valor)}
                </p>
              </div>
              <p className="text-lg font-medium text-accent font-mono-num whitespace-nowrap">
                {brl4(m.precoReal)}
                <span className="text-xs text-text-3 ml-1">/kg</span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Por cliente */}
      <Card className="p-5">
        <h2 className="font-serif-display text-2xl mb-4">Por fornecedor</h2>
        <div className="flex flex-col">
          {porCliente.map((c) => (
            <div
              key={c.cliente}
              className="flex items-center justify-between gap-4 border-b border-border-soft py-3 last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AvatarCliente nome={c.cliente} size={32} />
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">{c.cliente}</p>
                  <p className="text-xs text-text-3 font-mono-num mt-0.5">
                    {c.nfs} NF · {fmtKg(c.peso)} · {brl(c.valor)}
                  </p>
                </div>
              </div>
              <p className="text-lg font-medium text-accent font-mono-num whitespace-nowrap">
                {brl4(c.precoReal)}
                <span className="text-xs text-text-3 ml-1">/kg</span>
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Detalhado por NF */}
      <Card className="p-0 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="font-serif-display text-2xl">Detalhado por NF</h2>
          <p className="text-xs text-text-3 mt-1">
            Ordenado pelo preço real mais alto pro mais baixo
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-text-3 bg-surface-2 border-y border-border-soft">
                <th className="px-3 py-2.5 font-medium">Nº NF</th>
                <th className="px-3 py-2.5 font-medium">Data</th>
                <th className="px-3 py-2.5 font-medium">Cliente</th>
                <th className="px-3 py-2.5 font-medium">Material</th>
                <th className="px-3 py-2.5 font-medium text-right">Peso origem</th>
                <th className="px-3 py-2.5 font-medium text-right">Valor pago</th>
                <th className="px-3 py-2.5 font-medium text-right">Preço real</th>
              </tr>
            </thead>
            <tbody>
              {itensOrdenados.map((i) => (
                <tr
                  key={i.nf.id}
                  className="border-b border-border-soft last:border-0 hover:bg-surface-2 transition"
                >
                  <td className="px-3 py-3 font-mono-num text-text">{i.nf.numero}</td>
                  <td className="px-3 py-3 font-mono-num text-text-2 whitespace-nowrap">
                    {formatarData(i.nf.data)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarCliente nome={i.cliente_nome} size={26} />
                      <span className="text-text truncate">{i.cliente_nome}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-text-2">{i.material || '—'}</td>
                  <td className="px-3 py-3 text-right font-mono-num text-text-2">
                    {fmtKg(i.pesoOrigem)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono-num text-text">
                    {brl(i.valorPago)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono-num text-accent font-medium whitespace-nowrap">
                    {brl4(i.precoReal)}
                    <span className="text-xs text-text-3 ml-1">/kg</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {itensOrdenados.length === 0 && (
          <p className="text-center text-text-2 text-sm py-8">
            Nenhuma NF bateu nos filtros aplicados.
          </p>
        )}
      </Card>
    </div>
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
