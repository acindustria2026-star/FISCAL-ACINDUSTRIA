import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { CheckCircle2, Info, Loader2, Lock } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Loading } from '../ui/Loading';
import { useToast } from '../ui/Toast';
import { useAtualizarEmpresa, useEmpresa } from '../../hooks/useEmpresa';
import { usePapel } from '../../hooks/usePapel';
import { formatarCEP, formatarCNPJ, formatarTelefone, onlyDigits } from '../../lib/formatters';
import type { EmpresaRow } from '../../types/database';

type CampoTexto = keyof Pick<
  EmpresaRow,
  | 'razao_social'
  | 'nome_fantasia'
  | 'cnpj'
  | 'inscricao_estadual'
  | 'endereco'
  | 'cidade'
  | 'uf'
  | 'cep'
  | 'telefone'
  | 'email'
  | 'site'
>;

const campoFormatador: Partial<Record<CampoTexto, (v: string) => string>> = {
  cnpj: (v) => onlyDigits(v).slice(0, 14),
  cep: (v) => onlyDigits(v).slice(0, 8),
  uf: (v) => v.toUpperCase().slice(0, 2),
  telefone: (v) => onlyDigits(v).slice(0, 11),
};

type StatusSalvar = 'idle' | 'salvando' | 'salvo' | 'erro';

export function AbaEmpresa() {
  const empresa = useEmpresa();
  const atualizar = useAtualizarEmpresa();
  const { isAdmin } = usePapel();
  const toast = useToast();
  const readonly = !isAdmin;

  const [form, setForm] = useState<EmpresaRow | null>(null);
  const pendentes = useRef<Partial<EmpresaRow>>({});
  const [status, setStatus] = useState<StatusSalvar>('idle');

  useEffect(() => {
    if (empresa.data && form === null) setForm(empresa.data);
  }, [empresa.data, form]);

  const flush = useDebouncedCallback(async () => {
    const dados = pendentes.current;
    if (Object.keys(dados).length === 0) return;
    pendentes.current = {};
    setStatus('salvando');
    try {
      await atualizar.mutateAsync(dados);
      setStatus('salvo');
      window.setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error('Falha ao salvar: ' + msg);
      setStatus('erro');
    }
  }, 800);

  function handle(campo: CampoTexto) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      if (readonly) return;
      const raw = e.target.value;
      const formatador = campoFormatador[campo];
      const value = formatador ? formatador(raw) : raw;
      setForm((curr) => (curr ? { ...curr, [campo]: value || null } : curr));
      pendentes.current = { ...pendentes.current, [campo]: value || null };
      flush();
    };
  }

  if (empresa.isLoading || !form) return <Loading fullScreen={false} text="Carregando empresa..." />;

  return (
    <div className="flex flex-col gap-6">
      <Banner readonly={readonly} status={status} />

      <Section titulo="Identificação">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Nome fantasia *"
            value={form.nome_fantasia ?? ''}
            onChange={handle('nome_fantasia')}
            disabled={readonly}
          />
          <Input
            label="Razão social"
            value={form.razao_social ?? ''}
            onChange={handle('razao_social')}
            disabled={readonly}
          />
          <Input
            label="CNPJ"
            value={formatarCNPJ(form.cnpj ?? '')}
            onChange={handle('cnpj')}
            placeholder="00.000.000/0000-00"
            disabled={readonly}
          />
          <Input
            label="Inscrição estadual"
            value={form.inscricao_estadual ?? ''}
            onChange={handle('inscricao_estadual')}
            disabled={readonly}
          />
        </div>
      </Section>

      <Section titulo="Endereço">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Endereço"
              value={form.endereco ?? ''}
              onChange={handle('endereco')}
              placeholder="Rua, número, complemento"
              disabled={readonly}
            />
          </div>
          <Input label="Cidade" value={form.cidade ?? ''} onChange={handle('cidade')} disabled={readonly} />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="UF"
              value={form.uf ?? ''}
              onChange={handle('uf')}
              placeholder="SP"
              disabled={readonly}
            />
            <Input
              label="CEP"
              value={formatarCEP(form.cep ?? '')}
              onChange={handle('cep')}
              placeholder="00000-000"
              disabled={readonly}
            />
          </div>
        </div>
      </Section>

      <Section titulo="Contato">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Telefone"
            value={formatarTelefone(form.telefone ?? '')}
            onChange={handle('telefone')}
            placeholder="(11) 99999-9999"
            disabled={readonly}
          />
          <Input
            label="Email"
            type="email"
            value={form.email ?? ''}
            onChange={handle('email')}
            placeholder="contato@empresa.com"
            disabled={readonly}
          />
          <div className="md:col-span-2">
            <Input
              label="Site"
              value={form.site ?? ''}
              onChange={handle('site')}
              placeholder="https://"
              disabled={readonly}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}

function Banner({ readonly, status }: { readonly: boolean; status: StatusSalvar }) {
  if (readonly) {
    return (
      <Card className="p-4 flex items-center gap-3 border-amber-soft-border bg-amber-soft-bg">
        <Lock size={16} className="text-amber" />
        <p className="text-sm text-text">
          Você está em modo somente leitura. Apenas administradores podem editar a empresa.
        </p>
      </Card>
    );
  }
  return (
    <Card className="p-4 flex items-center justify-between gap-3 border-accent-soft-border bg-accent-soft-bg">
      <div className="flex items-center gap-3">
        <Info size={16} className="text-accent" />
        <p className="text-sm text-text">
          Esses dados aparecem no timbrado dos comprovantes. Salvamento automático.
        </p>
      </div>
      <StatusSalvarBadge status={status} />
    </Card>
  );
}

function StatusSalvarBadge({ status }: { status: StatusSalvar }) {
  if (status === 'salvando')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-text-2">
        <Loader2 size={13} className="animate-spin" /> Salvando...
      </span>
    );
  if (status === 'salvo')
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-accent">
        <CheckCircle2 size={13} /> Salvo
      </span>
    );
  if (status === 'erro')
    return <span className="text-xs text-warn">Erro ao salvar</span>;
  return null;
}

function Section({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="text-xs uppercase tracking-[0.16em] text-text-3 mb-4">{titulo}</h3>
      {children}
    </Card>
  );
}
