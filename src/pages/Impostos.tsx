import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usePapel } from '../hooks/usePapel';
import { dataHojeISO } from '../lib/dataUtils';

interface NFImposto {
  id: string;
  numero: string;
  data: string;
  cliente_nome: string;
  material: string;
  peso: number;
  valor_negociado: number;
  valor_final: number;
  icms: number;
  pis: number;
  cofins: number;
}

const ICMS_NF_PCT = 0.12;
const ICMS_EFETIVO_PCT = 0.05;
const CREDITO_PCT = ICMS_NF_PCT - ICMS_EFETIVO_PCT;

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Impostos() {
  const { isAdmin, isOperador, isFinanceiro } = usePapel();
  const [nfs, setNfs] = useState<NFImposto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroMaterial, setFiltroMaterial] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  useEffect(() => {
    const hojeStr = dataHojeISO();
    const [ano, mesStr] = hojeStr.split('-');
    const mes = Number(mesStr);
    const ultimoDia = new Date(Number(ano), mes, 0).getDate();
    setDataInicio(`${ano}-${mesStr}-01`);
    setDataFim(`${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`);
  }, []);

  useEffect(() => {
    if (!dataInicio || !dataFim) return;

    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      const { data, error } = await supabase
        .from('notas_fiscais')
        .select(
          'id, numero, data, cliente_nome, material, peso, valor_negociado, valor_final, icms, pis, cofins, substituida_em',
        )
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

      if (cancelado) return;

      if (!error && data) {
        const linhas = data
          .filter((nf) => nf.substituida_em === null)
          .map((nf) => ({
            id: nf.id,
            numero: String(nf.numero ?? ''),
            data: nf.data,
            cliente_nome: nf.cliente_nome ?? '',
            material: nf.material ?? '',
            peso: Number(nf.peso) || 0,
            valor_negociado: Number(nf.valor_negociado) || 0,
            valor_final: Number(nf.valor_final) || 0,
            icms: Number(nf.icms) || 0,
            pis: Number(nf.pis) || 0,
            cofins: Number(nf.cofins) || 0,
          }));
        setNfs(linhas);
      }
      setCarregando(false);
    }
    void carregar();
    return () => {
      cancelado = true;
    };
  }, [dataInicio, dataFim]);

  const nfsFiltradas = useMemo(() => {
    return nfs.filter((nf) => {
      if (filtroMaterial && nf.material !== filtroMaterial) return false;
      if (filtroCliente && nf.cliente_nome !== filtroCliente) return false;
      return true;
    });
  }, [nfs, filtroMaterial, filtroCliente]);

  const totais = useMemo(() => {
    let valorNegociado = 0;
    let valorFinal = 0;
    let icmsNF = 0;
    let pisTotal = 0;
    let cofinsTotal = 0;

    for (const nf of nfsFiltradas) {
      valorNegociado += nf.valor_negociado;
      valorFinal += nf.valor_final;
      icmsNF += nf.icms;
      pisTotal += nf.pis;
      cofinsTotal += nf.cofins;
    }

    const icmsPago = icmsNF * (ICMS_EFETIVO_PCT / ICMS_NF_PCT);
    const credito = icmsNF * (CREDITO_PCT / ICMS_NF_PCT);
    const aPagarTotal = icmsPago + pisTotal + cofinsTotal;

    return {
      totalNFs: nfsFiltradas.length,
      valorNegociado,
      valorFinal,
      icmsNF,
      icmsPago,
      credito,
      pisTotal,
      cofinsTotal,
      aPagarTotal,
    };
  }, [nfsFiltradas]);

  const porMaterial = useMemo(() => {
    const map = new Map<string, { nfs: number; icms: number; pis: number; cofins: number }>();
    for (const nf of nfsFiltradas) {
      const atual = map.get(nf.material) ?? { nfs: 0, icms: 0, pis: 0, cofins: 0 };
      atual.nfs += 1;
      atual.icms += nf.icms;
      atual.pis += nf.pis;
      atual.cofins += nf.cofins;
      map.set(nf.material, atual);
    }
    return Array.from(map.entries())
      .map(([material, dados]) => ({
        material,
        ...dados,
        icmsPago: dados.icms * (ICMS_EFETIVO_PCT / ICMS_NF_PCT),
        credito: dados.icms * (CREDITO_PCT / ICMS_NF_PCT),
      }))
      .sort((a, b) => b.icms - a.icms);
  }, [nfsFiltradas]);

  const materiais = useMemo(
    () => Array.from(new Set(nfs.map((nf) => nf.material))).filter(Boolean).sort(),
    [nfs],
  );
  const clientes = useMemo(
    () => Array.from(new Set(nfs.map((nf) => nf.cliente_nome))).filter(Boolean).sort(),
    [nfs],
  );

  if (!isAdmin && !isOperador && !isFinanceiro) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-serif-display mb-2">Impostos</h1>
        <p className="text-text-2 text-sm">
          Painel detalhado de ICMS, PIS e COFINS — com benefício fiscal de crédito presumido.
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-surface-2 rounded-2xl p-6 border border-border space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] text-text-3 uppercase tracking-[0.12em] block mb-2">
              Período
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text font-mono-num focus:outline-none focus:border-accent transition"
              />
              <span className="text-text-3 text-xs">até</span>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text font-mono-num focus:outline-none focus:border-accent transition"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-text-3 uppercase tracking-[0.12em] block mb-2">
                Material
              </label>
              <select
                value={filtroMaterial}
                onChange={(e) => setFiltroMaterial(e.target.value)}
                className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-accent transition"
              >
                <option value="">Todos</option>
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
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="text-center py-12 text-text-2 text-sm">Carregando...</div>
      ) : totais.totalNFs === 0 ? (
        <div className="text-center py-12 text-text-2 text-sm">
          Nenhuma NF no período selecionado.
        </div>
      ) : (
        <>
          {/* Resumo das NFs */}
          <div className="bg-surface-2 rounded-2xl p-6 border border-border">
            <h2 className="font-serif-display text-2xl mb-4">Resumo das NFs</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-[11px] text-text-3 uppercase tracking-[0.12em]">Total de NFs</p>
                <p className="text-2xl font-medium font-mono-num mt-1">{totais.totalNFs}</p>
              </div>
              <div>
                <p className="text-[11px] text-text-3 uppercase tracking-[0.12em]">
                  Valor negociado
                </p>
                <p className="text-2xl font-medium font-mono-num mt-1">
                  R$ {fmtBRL(totais.valorNegociado)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-text-3 uppercase tracking-[0.12em]">
                  Valor final (com impostos)
                </p>
                <p className="text-2xl font-medium font-mono-num mt-1">
                  R$ {fmtBRL(totais.valorFinal)}
                </p>
              </div>
            </div>
          </div>

          {/* ICMS */}
          <div className="bg-surface-2 rounded-2xl p-6 border border-border">
            <h2 className="font-serif-display text-2xl mb-4">
              🟢 ICMS · 12% nas NFs · Benefício Crédito Presumido
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-bg/60 rounded-xl p-4 border border-border-soft">
                <p className="text-[11px] text-text-3 uppercase tracking-[0.12em]">
                  ICMS agregado nas NFs (12%)
                </p>
                <p className="text-2xl font-medium font-mono-num mt-1">
                  R$ {fmtBRL(totais.icmsNF)}
                </p>
              </div>
              <div className="bg-warn-soft-bg border border-warn-soft-border rounded-xl p-4">
                <p className="text-[11px] text-warn uppercase tracking-[0.12em]">
                  A recolher (5%)
                </p>
                <p className="text-2xl font-medium font-mono-num mt-1 text-warn">
                  R$ {fmtBRL(totais.icmsPago)}
                </p>
                <p className="text-xs text-text-3 mt-2">Pago ao Estado</p>
              </div>
              <div className="bg-accent-soft-bg border border-accent-soft-border rounded-xl p-4">
                <p className="text-[11px] text-accent uppercase tracking-[0.12em]">
                  💰 Crédito Presumido (7%)
                </p>
                <p className="text-2xl font-medium font-mono-num mt-1 text-accent">
                  R$ {fmtBRL(totais.credito)}
                </p>
                <p className="text-xs text-text-3 mt-2">Lucro com o benefício</p>
              </div>
            </div>
          </div>

          {/* PIS e COFINS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface-2 rounded-2xl p-6 border border-border">
              <h2 className="font-serif-display text-xl mb-2">🟡 PIS · 1,65%</h2>
              <p className="text-3xl font-medium font-mono-num text-amber">
                R$ {fmtBRL(totais.pisTotal)}
              </p>
              <p className="text-xs text-text-3 mt-2">A recolher</p>
            </div>
            <div className="bg-surface-2 rounded-2xl p-6 border border-border">
              <h2 className="font-serif-display text-xl mb-2">🔴 COFINS · 7,60%</h2>
              <p className="text-3xl font-medium font-mono-num text-warn">
                R$ {fmtBRL(totais.cofinsTotal)}
              </p>
              <p className="text-xs text-text-3 mt-2">A recolher</p>
            </div>
          </div>

          {/* Resumo final */}
          <div className="bg-surface-2 rounded-2xl p-6 border border-border">
            <h2 className="font-serif-display text-2xl mb-4">📊 Resumo do período</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-border-soft">
                <span className="text-text-2 text-sm">ICMS a recolher (5%)</span>
                <span className="font-medium font-mono-num">R$ {fmtBRL(totais.icmsPago)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border-soft">
                <span className="text-text-2 text-sm">PIS a recolher (1,65%)</span>
                <span className="font-medium font-mono-num">R$ {fmtBRL(totais.pisTotal)}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-border-soft">
                <span className="text-text-2 text-sm">COFINS a recolher (7,60%)</span>
                <span className="font-medium font-mono-num">
                  R$ {fmtBRL(totais.cofinsTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-medium">TOTAL A PAGAR PRO GOVERNO</span>
                <span className="text-2xl font-medium font-mono-num text-warn">
                  R$ {fmtBRL(totais.aPagarTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 bg-accent-soft-bg -mx-6 px-6 py-3 rounded-lg border-t border-accent-soft-border">
                <span className="text-lg font-medium text-accent">
                  💰 CRÉDITO PRESUMIDO (lucro)
                </span>
                <span className="text-2xl font-medium font-mono-num text-accent">
                  R$ {fmtBRL(totais.credito)}
                </span>
              </div>
            </div>
          </div>

          {/* Por material */}
          <div className="bg-surface-2 rounded-2xl p-6 border border-border">
            <h2 className="font-serif-display text-2xl mb-4">Por Material</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] text-text-3 uppercase tracking-[0.12em] border-b border-border-soft">
                  <tr>
                    <th className="text-left py-2">Material</th>
                    <th className="text-right py-2">NFs</th>
                    <th className="text-right py-2">ICMS NF</th>
                    <th className="text-right py-2">ICMS pago</th>
                    <th className="text-right py-2">Crédito</th>
                    <th className="text-right py-2">PIS</th>
                    <th className="text-right py-2">COFINS</th>
                  </tr>
                </thead>
                <tbody>
                  {porMaterial.map((m) => (
                    <tr
                      key={m.material}
                      className="border-b border-border-soft last:border-0 hover:bg-surface-3 transition"
                    >
                      <td className="py-3 font-medium text-text">{m.material || '—'}</td>
                      <td className="py-3 text-right font-mono-num">{m.nfs}</td>
                      <td className="py-3 text-right font-mono-num">R$ {fmtBRL(m.icms)}</td>
                      <td className="py-3 text-right font-mono-num text-warn">
                        R$ {fmtBRL(m.icmsPago)}
                      </td>
                      <td className="py-3 text-right font-mono-num text-accent font-medium">
                        R$ {fmtBRL(m.credito)}
                      </td>
                      <td className="py-3 text-right font-mono-num">R$ {fmtBRL(m.pis)}</td>
                      <td className="py-3 text-right font-mono-num">R$ {fmtBRL(m.cofins)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
