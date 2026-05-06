import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, GitCompare } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useToast } from '../components/ui/Toast';
import { CardComparativo } from '../components/comparativo/CardComparativo';
import { BarraFlutuante } from '../components/comparativo/BarraFlutuante';
import { useComparativo, type StatusComparativo } from '../hooks/useComparativo';
import { useEmpresa } from '../hooks/useEmpresa';
import { usePeriodo } from '../contexts/PeriodoContext';
import { imprimirComprovante } from '../utils/impressao';

type Filtro = 'todas' | 'divergentes' | 'conferidas' | 'aguardando';

const FILTRO_STATUS: Record<Filtro, StatusComparativo[] | null> = {
  todas: null,
  divergentes: ['divergente'],
  conferidas: ['ok'],
  aguardando: ['aguardando'],
};

export default function Comparativo() {
  const lista = useComparativo();
  const empresa = useEmpresa();
  const { formatarPeriodo } = usePeriodo();
  const toast = useToast();

  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [selecao, setSelecao] = useState<Set<string>>(new Set());

  const itens = lista.data ?? [];

  const counts = useMemo(() => {
    const c = { todas: itens.length, divergentes: 0, conferidas: 0, aguardando: 0 };
    for (const i of itens) {
      if (i.status === 'divergente') c.divergentes++;
      else if (i.status === 'ok') c.conferidas++;
      else c.aguardando++;
    }
    return c;
  }, [itens]);

  const filtrados = useMemo(() => {
    const allowed = FILTRO_STATUS[filtro];
    if (!allowed) return itens;
    return itens.filter((i) => allowed.includes(i.status));
  }, [itens, filtro]);

  const itensSelecionados = useMemo(
    () => itens.filter((i) => selecao.has(i.nf.id)),
    [itens, selecao],
  );

  const todosFiltradosSelecionados =
    filtrados.length > 0 && filtrados.every((i) => selecao.has(i.nf.id));

  function toggle(id: string) {
    setSelecao((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function alternarTodos() {
    setSelecao((prev) => {
      const novo = new Set(prev);
      if (todosFiltradosSelecionados) {
        for (const i of filtrados) novo.delete(i.nf.id);
      } else {
        for (const i of filtrados) novo.add(i.nf.id);
      }
      return novo;
    });
  }

  function limparSelecao() {
    setSelecao(new Set());
  }

  const empresaIncompleta =
    !empresa.data || !empresa.data.nome_fantasia || !empresa.data.cnpj;

  async function imprimir() {
    if (!empresa.data) {
      toast.error('Empresa não carregada');
      return;
    }
    if (empresaIncompleta) {
      toast.error('Configure os dados da empresa em Cadastros antes de imprimir');
      return;
    }
    if (itensSelecionados.length === 0) {
      toast.error('Selecione ao menos uma NF');
      return;
    }
    const r = await imprimirComprovante(itensSelecionados, empresa.data);
    if (!r.ok) toast.error(r.motivo ?? 'Erro ao abrir impressão');
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.16em] text-accent mb-2 font-mono-num">
          {formatarPeriodo()}
        </p>
        <h1 className="font-serif-display text-4xl md:text-5xl mb-2">Comparativo</h1>
        <p className="text-text-2 text-sm md:text-base">
          NF emitida × recebimento conferido. Use os checkboxes pra selecionar e imprimir
          comprovantes.
        </p>
      </header>

      {empresaIncompleta && (
        <Card className="p-4 mb-4 bg-amber-soft-bg border-amber-soft-border flex items-start gap-3">
          <AlertCircle size={16} className="text-amber mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-text">Configure os dados da empresa</p>
            <p className="text-xs text-text-2 mt-0.5">
              Nome fantasia e CNPJ são obrigatórios pro timbrado dos comprovantes.{' '}
              <Link to="/cadastros" className="text-accent hover:underline">
                Ir pra Cadastros
              </Link>
            </p>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1.5 bg-surface-2 border border-border rounded-full p-1 w-fit">
          <FiltroPill ativo={filtro === 'todas'} onClick={() => setFiltro('todas')}>
            Todas <span className="text-text-3 ml-1 font-mono-num">{counts.todas}</span>
          </FiltroPill>
          <FiltroPill ativo={filtro === 'divergentes'} onClick={() => setFiltro('divergentes')}>
            Divergentes <span className="text-text-3 ml-1 font-mono-num">{counts.divergentes}</span>
          </FiltroPill>
          <FiltroPill ativo={filtro === 'conferidas'} onClick={() => setFiltro('conferidas')}>
            Conferidas <span className="text-text-3 ml-1 font-mono-num">{counts.conferidas}</span>
          </FiltroPill>
          <FiltroPill ativo={filtro === 'aguardando'} onClick={() => setFiltro('aguardando')}>
            Aguardando <span className="text-text-3 ml-1 font-mono-num">{counts.aguardando}</span>
          </FiltroPill>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={alternarTodos}
          disabled={filtrados.length === 0}
          className="text-xs text-text-2 hover:text-accent transition disabled:opacity-50"
        >
          {todosFiltradosSelecionados ? 'Desmarcar todas' : 'Selecionar todas'}
        </button>
      </div>

      <BarraFlutuante
        count={selecao.size}
        onLimpar={limparSelecao}
        onImprimir={imprimir}
        desabilitado={empresaIncompleta}
        motivoDesabilitado={
          empresaIncompleta ? 'Configure a empresa antes de imprimir' : null
        }
      />

      <div className={`flex flex-col gap-3 ${selecao.size > 0 ? 'mt-3' : ''}`}>
        {lista.isLoading ? (
          <Loading fullScreen={false} text="Carregando comparativo..." />
        ) : filtrados.length === 0 ? (
          <Card className="p-0 overflow-hidden">
            <EmptyState
              icon={<GitCompare size={32} />}
              titulo={
                filtro === 'todas'
                  ? 'Nenhuma NF no período'
                  : `Nenhuma NF ${
                      filtro === 'divergentes'
                        ? 'divergente'
                        : filtro === 'conferidas'
                          ? 'conferida'
                          : 'aguardando'
                    }`
              }
              descricao="Tente ajustar período ou filtro."
            />
          </Card>
        ) : (
          filtrados.map((item) => (
            <CardComparativo
              key={item.nf.id}
              item={item}
              selecionada={selecao.has(item.nf.id)}
              onToggleSelecao={() => toggle(item.nf.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function FiltroPill({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 h-7 rounded-full text-xs whitespace-nowrap transition ${
        ativo
          ? 'bg-accent text-[#0B0B0D] font-medium'
          : 'text-text-2 hover:text-text hover:bg-surface-3'
      }`}
    >
      {children}
    </button>
  );
}
