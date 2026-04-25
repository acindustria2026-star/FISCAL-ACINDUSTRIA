import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Check, Copy, KeyRound, User } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import {
  useConvidarUsuario,
  type ConvidarResposta,
} from '../../hooks/useUsuarios';
import { validarUsuario } from '../../lib/userMapper';
import type { Papel } from '../../types/database';

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  usuario: z
    .string()
    .min(1, 'Usuário obrigatório')
    .refine((v) => validarUsuario(v) === null, {
      message: 'Use só letras, números, ponto, traço ou underscore (mínimo 3)',
    }),
  papel: z.enum(['ADMIN', 'OPERADOR', 'FINANCEIRO']),
});
type Form = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

const PAPEIS: { value: Papel; label: string; descricao: string }[] = [
  { value: 'ADMIN', label: 'Admin', descricao: 'Faz tudo · convida usuários · vê auditoria' },
  { value: 'OPERADOR', label: 'Operador', descricao: 'Cria NFs, recebimentos e cadastros' },
  { value: 'FINANCEIRO', label: 'Financeiro', descricao: 'Vê pagamentos, marca como pago, sem editar NFs' },
];

export function ModalConvidarUsuario({ open, onClose }: Props) {
  const [resposta, setResposta] = useState<ConvidarResposta | null>(null);
  const convidar = useConvidarUsuario();
  const toast = useToast();

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', usuario: '', papel: 'OPERADOR' },
  });

  async function onSubmit(d: Form) {
    try {
      const r = await convidar.mutateAsync(d);
      setResposta(r);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao convidar');
    }
  }

  function fechar() {
    form.reset();
    setResposta(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={convidar.isPending ? () => {} : fechar}
      title={resposta ? 'Usuário criado' : 'Convidar usuário'}
      description={
        resposta
          ? undefined
          : 'Sistema gera uma senha temporária. Anote e passe pro funcionário — ele troca depois.'
      }
      size="md"
      footer={
        resposta ? (
          <Button onClick={fechar}>Fechar</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={fechar} disabled={convidar.isPending}>
              Cancelar
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} loading={convidar.isPending}>
              Criar usuário
            </Button>
          </>
        )
      }
    >
      {resposta ? (
        <CredenciaisGeradas resposta={resposta} />
      ) : (
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <Input
            label="Nome *"
            placeholder="Nome completo"
            {...form.register('nome')}
            error={form.formState.errors.nome?.message}
            autoFocus
          />
          <Input
            label="Usuário *"
            placeholder="ex: maria"
            leftIcon={<User size={14} />}
            autoComplete="off"
            {...form.register('usuario', {
              setValueAs: (v: string) => v?.toLowerCase().trim() ?? '',
            })}
            error={form.formState.errors.usuario?.message}
            helper="Nome curto pra fazer login. Letras, números e ._-"
          />
          <div>
            <p className="text-sm text-text-2 font-medium mb-2">Papel</p>
            <div className="flex flex-col gap-2">
              {PAPEIS.map((p) => {
                const ativo = form.watch('papel') === p.value;
                return (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => form.setValue('papel', p.value, { shouldValidate: true })}
                    className={`text-left p-3 rounded-xl border transition ${
                      ativo
                        ? 'border-accent bg-accent-soft-bg'
                        : 'border-border bg-surface-2 hover:border-text-3'
                    }`}
                  >
                    <p className={`text-sm font-medium ${ativo ? 'text-accent' : 'text-text'}`}>
                      {p.label}
                    </p>
                    <p className="text-xs text-text-3 mt-0.5">{p.descricao}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      )}
    </Modal>
  );
}

function CredenciaisGeradas({ resposta }: { resposta: ConvidarResposta }) {
  const [copiouUsuario, setCopiouUsuario] = useState(false);
  const [copiouSenha, setCopiouSenha] = useState(false);

  async function copiar(valor: string, tipo: 'usuario' | 'senha') {
    try {
      await navigator.clipboard.writeText(valor);
      if (tipo === 'usuario') {
        setCopiouUsuario(true);
        setTimeout(() => setCopiouUsuario(false), 2000);
      } else {
        setCopiouSenha(true);
        setTimeout(() => setCopiouSenha(false), 2000);
      }
    } catch {
      // ignore
    }
  }

  async function copiarTudo() {
    const txt = `Usuário: ${resposta.usuario}\nSenha: ${resposta.senha_temporaria}`;
    try {
      await navigator.clipboard.writeText(txt);
      setCopiouUsuario(true);
      setCopiouSenha(true);
      setTimeout(() => {
        setCopiouUsuario(false);
        setCopiouSenha(false);
      }, 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl border border-accent-soft-border p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #2A2010 0%, transparent 100%)' }}
      >
        <div
          className="absolute -top-1/2 -right-[20%] w-40 h-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #D4A017 0%, transparent 70%)',
            opacity: 0.15,
          }}
        />
        <div className="relative flex flex-col gap-3">
          <CredenciaisCampo
            label="Usuário"
            valor={resposta.usuario}
            icon={<User size={14} />}
            copiou={copiouUsuario}
            onCopy={() => copiar(resposta.usuario, 'usuario')}
          />
          <CredenciaisCampo
            label="Senha temporária"
            valor={resposta.senha_temporaria}
            icon={<KeyRound size={14} />}
            copiou={copiouSenha}
            onCopy={() => copiar(resposta.senha_temporaria, 'senha')}
            destacar
          />
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-soft-bg border border-amber-soft-border">
        <AlertTriangle size={14} className="text-amber mt-0.5 flex-shrink-0" />
        <p className="text-sm text-text">
          Anote agora — esta senha só aparece uma vez. Passe pro funcionário e peça pra trocar
          depois pelo botão "Trocar senha".
        </p>
      </div>

      <Button variant="secondary" onClick={copiarTudo}>
        <Copy size={14} /> Copiar usuário e senha
      </Button>
    </div>
  );
}

function CredenciaisCampo({
  label,
  valor,
  icon,
  copiou,
  onCopy,
  destacar,
}: {
  label: string;
  valor: string;
  icon: React.ReactNode;
  copiou: boolean;
  onCopy: () => void;
  destacar?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-text-3 mb-1">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 px-3 py-2 rounded-lg bg-surface-2 border border-border font-mono-num text-sm break-all ${
            destacar ? 'text-accent' : 'text-text'
          }`}
        >
          {valor}
        </code>
        <button
          type="button"
          onClick={onCopy}
          aria-label={`Copiar ${label}`}
          className={`w-9 h-9 flex items-center justify-center rounded-lg border transition ${
            copiou
              ? 'border-accent text-accent bg-accent-soft-bg'
              : 'border-border text-text-2 hover:text-text hover:bg-surface-3'
          }`}
        >
          {copiou ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  );
}
