import { useState, type FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ArrowRight, Building2, User, UserRound } from 'lucide-react';
import { AuthHeader, AuthLayout } from '../components/layout/AuthLayout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PasswordStrength, avaliarSenha } from '../components/ui/PasswordStrength';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { formatCNPJ, onlyDigits } from '../lib/formatters';
import { validarUsuario } from '../lib/userMapper';

const empresaSchema = z.object({
  nomeFantasia: z.string().min(2, 'Nome fantasia obrigatório'),
  razaoSocial: z.string().optional(),
  cnpj: z
    .string()
    .optional()
    .refine((v) => !v || onlyDigits(v).length === 14, 'CNPJ deve ter 14 dígitos'),
});
type EmpresaForm = z.infer<typeof empresaSchema>;

const adminSchema = z
  .object({
    nome: z.string().min(2, 'Nome obrigatório'),
    usuario: z
      .string()
      .min(1, 'Usuário obrigatório')
      .refine((v) => validarUsuario(v) === null, {
        message: 'Use só letras, números, ponto, traço ou underscore (mínimo 3)',
      }),
    senha: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: 'As senhas não coincidem',
    path: ['confirmar'],
  });
type AdminForm = z.infer<typeof adminSchema>;

export default function Setup() {
  const [passo, setPasso] = useState<1 | 2>(1);
  const [empresaData, setEmpresaData] = useState<EmpresaForm | null>(null);
  const [enviando, setEnviando] = useState(false);
  const { setupInicial } = useAuth();
  const toast = useToast();

  const empresaForm = useForm<EmpresaForm>({
    resolver: zodResolver(empresaSchema),
    defaultValues: { nomeFantasia: '', razaoSocial: '', cnpj: '' },
  });

  const adminForm = useForm<AdminForm>({
    resolver: zodResolver(adminSchema),
    defaultValues: { nome: '', usuario: '', senha: '', confirmar: '' },
  });

  const senhaAtual = adminForm.watch('senha');

  function avancar(d: EmpresaForm) {
    setEmpresaData(d);
    setPasso(2);
  }

  async function concluir(d: AdminForm) {
    if (!empresaData) return;
    if (avaliarSenha(d.senha).score < 2) {
      toast.error('Escolha uma senha mais forte');
      return;
    }
    setEnviando(true);
    try {
      await setupInicial({
        empresa: {
          nomeFantasia: empresaData.nomeFantasia,
          razaoSocial: empresaData.razaoSocial,
          cnpj: empresaData.cnpj ? onlyDigits(empresaData.cnpj) : undefined,
        },
        admin: { nome: d.nome, usuario: d.usuario, senha: d.senha },
      });
      toast.success('Configuração concluída — bem-vindo!');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader subtitle="Vamos configurar seu sistema" />

      <Stepper passo={passo} />

      {passo === 1 ? (
        <PassoEmpresa form={empresaForm} onSubmit={empresaForm.handleSubmit(avancar)} />
      ) : (
        <PassoAdmin
          form={adminForm}
          senha={senhaAtual}
          onVoltar={() => setPasso(1)}
          onSubmit={adminForm.handleSubmit(concluir)}
          enviando={enviando}
        />
      )}
    </AuthLayout>
  );
}

function Stepper({ passo }: { passo: 1 | 2 }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <StepDot ativo={passo >= 1} icon={<Building2 size={14} />} label="Empresa" />
      <div className={`h-px w-8 ${passo >= 2 ? 'bg-accent' : 'bg-border'}`} />
      <StepDot ativo={passo >= 2} icon={<UserRound size={14} />} label="Admin" />
    </div>
  );
}

function StepDot({ ativo, icon, label }: { ativo: boolean; icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center border ${ativo ? 'bg-accent text-[#0B0B0D] border-accent' : 'bg-surface-2 text-text-3 border-border'}`}
      >
        {icon}
      </div>
      <span className={`text-xs ${ativo ? 'text-text' : 'text-text-3'}`}>{label}</span>
    </div>
  );
}

interface PassoEmpresaProps {
  form: ReturnType<typeof useForm<EmpresaForm>>;
  onSubmit: (e: FormEvent) => void;
}
function PassoEmpresa({ form, onSubmit }: PassoEmpresaProps) {
  const cnpjValue = form.watch('cnpj') ?? '';
  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium mb-1">Dados da empresa</h2>
      <p className="text-sm text-text-2 mb-5">Esses dados aparecem em comprovantes e relatórios.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome fantasia"
          placeholder="Ex.: Reciclagem Brasil"
          {...form.register('nomeFantasia')}
          error={form.formState.errors.nomeFantasia?.message}
        />
        <Input
          label="Razão social"
          placeholder="Opcional"
          {...form.register('razaoSocial')}
          error={form.formState.errors.razaoSocial?.message}
        />
        <Input
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          value={formatCNPJ(cnpjValue)}
          onChange={(e) => form.setValue('cnpj', e.target.value, { shouldValidate: true })}
          error={form.formState.errors.cnpj?.message}
          helper="Opcional — pode preencher depois"
        />
        <Button type="submit" size="lg" fullWidth>
          Próximo <ArrowRight size={16} />
        </Button>
      </form>
    </Card>
  );
}

interface PassoAdminProps {
  form: ReturnType<typeof useForm<AdminForm>>;
  senha: string;
  onVoltar: () => void;
  onSubmit: (e: FormEvent) => void;
  enviando: boolean;
}
function PassoAdmin({ form, senha, onVoltar, onSubmit, enviando }: PassoAdminProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium mb-1">Crie sua conta</h2>
      <p className="text-sm text-text-2 mb-5">Você será o primeiro administrador do sistema.</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome completo"
          placeholder="Seu nome"
          autoComplete="name"
          {...form.register('nome')}
          error={form.formState.errors.nome?.message}
        />
        <Input
          label="Usuário"
          type="text"
          placeholder="ex: admin"
          leftIcon={<User size={14} />}
          autoComplete="username"
          {...form.register('usuario', {
            setValueAs: (v: string) => v?.toLowerCase().trim() ?? '',
          })}
          helper="Nome curto pra fazer login (ex: admin, joao). Letras, números e ._-"
          error={form.formState.errors.usuario?.message}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Senha"
            type="password"
            autoComplete="new-password"
            {...form.register('senha')}
            error={form.formState.errors.senha?.message}
          />
          <PasswordStrength value={senha ?? ''} />
        </div>
        <Input
          label="Confirmar senha"
          type="password"
          autoComplete="new-password"
          {...form.register('confirmar')}
          error={form.formState.errors.confirmar?.message}
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onVoltar} disabled={enviando}>
            <ArrowLeft size={16} /> Voltar
          </Button>
          <Button type="submit" size="md" loading={enviando} className="flex-1">
            Concluir e entrar <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Card>
  );
}
