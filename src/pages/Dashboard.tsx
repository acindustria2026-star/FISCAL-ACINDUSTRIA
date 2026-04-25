import { useState } from 'react';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import { calcularInsight, HeroDashboard } from '../components/dashboard/HeroDashboard';
import { CardEmAberto } from '../components/dashboard/CardEmAberto';
import { AlertasDashboard } from '../components/dashboard/AlertasDashboard';
import { AcoesRapidas } from '../components/dashboard/AcoesRapidas';
import { GridStatCards } from '../components/dashboard/GridStatCards';
import { ListaPendentes } from '../components/dashboard/ListaPendentes';
import { PedidosEmAndamento } from '../components/dashboard/PedidosEmAndamento';
import { ModalRecebimento, type ModalRecContexto } from '../components/recebimentos/ModalRecebimento';
import { ModalNF, type ModalNfContexto } from '../components/nfs/ModalNF';
import { useDashboard, type DashboardPendente } from '../hooks/useDashboard';
import { usePapel } from '../hooks/usePapel';
import { usePeriodo } from '../contexts/PeriodoContext';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const dashboard = useDashboard();
  const { podeEditarNFs } = usePapel();
  const { formatarPeriodo } = usePeriodo();
  const toast = useToast();
  const [modalRec, setModalRec] = useState<ModalRecContexto | null>(null);
  const [modalNf, setModalNf] = useState<ModalNfContexto | null>(null);

  if (dashboard.isLoading) {
    return <DashboardSkeleton />;
  }

  if (dashboard.isError || !dashboard.data) {
    return (
      <Card className="p-6">
        <p className="text-sm text-warn">
          Erro ao carregar dashboard:{' '}
          {dashboard.error instanceof Error ? dashboard.error.message : 'desconhecido'}
        </p>
      </Card>
    );
  }

  const data = dashboard.data;
  const insight = calcularInsight(data);

  async function lancarRecebimento(p: DashboardPendente) {
    // Busca dados completos da NF (preço final etc) pra preencher o modal
    const { data: nf, error } = await supabase
      .from('notas_fiscais')
      .select('id, numero, cliente_nome, material, peso, preco_final_kg, valor_final')
      .eq('id', p.id)
      .maybeSingle();
    if (error || !nf) {
      toast.error('Não foi possível abrir essa NF');
      return;
    }
    setModalRec({ kind: 'criar', nf });
  }

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <HeroDashboard insight={insight} />

      <p className="text-xs text-text-3 -mt-4 font-mono-num">
        Período em foco: <span className="text-accent">{formatarPeriodo()}</span>
      </p>

      <CardEmAberto
        qtd={data.metricas.total_em_aberto}
        valor={data.metricas.valor_em_aberto}
        peso={data.metricas.peso_em_aberto}
      />

      <AlertasDashboard data={data} />

      <AcoesRapidas onNovaNF={() => setModalNf({ kind: 'criar' })} />

      <GridStatCards metricas={data.metricas} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PedidosEmAndamento
          pedidos={data.pedidos}
          totalGeral={data.pedidos_metricas.total}
          podeEditar={podeEditarNFs}
        />
        <ListaPendentes
          pendentes={data.pendentes}
          totalGeral={data.pendentes_total.total}
          podeReceber={podeEditarNFs}
          onLancar={lancarRecebimento}
        />
      </div>

      {modalRec && (
        <ModalRecebimento
          open
          onClose={() => setModalRec(null)}
          contexto={modalRec}
        />
      )}

      {modalNf && (
        <ModalNF open onClose={() => setModalNf(null)} contexto={modalNf} />
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="space-y-3 animate-pulse">
        <div className="h-3 w-32 bg-surface-2 rounded" />
        <div className="h-12 w-2/3 bg-surface-2 rounded" />
        <div className="h-7 w-48 bg-surface-2 rounded-full" />
      </div>
      <div className="h-24 bg-surface-2 rounded-[14px] animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-12 bg-surface-2 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-surface-2 rounded-[14px] animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-64 bg-surface-2 rounded-[14px] animate-pulse" />
        <div className="h-64 bg-surface-2 rounded-[14px] animate-pulse" />
      </div>
    </div>
  );
}
