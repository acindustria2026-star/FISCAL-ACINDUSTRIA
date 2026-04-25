import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Lock } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { useToast } from '../ui/Toast';
import { useEditarUsuario, useUsuarios } from '../../hooks/useUsuarios';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime } from '../../lib/formatters';
import { emailParaUsuario } from '../../lib/userMapper';
import type { Papel, PerfilRow } from '../../types/database';

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  papel: z.enum(['ADMIN', 'OPERADOR', 'FINANCEIRO']),
  ativo: z.boolean(),
});
type Form = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  usuario: PerfilRow | null;
}

const PAPEIS: { value: Papel; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'OPERADOR', label: 'Operador' },
  { value: 'FINANCEIRO', label: 'Financeiro' },
];

export function ModalEditarUsuario({ open, onClose, usuario }: Props) {
  const editar = useEditarUsuario();
  const lista = useUsuarios();
  const { perfil: meuPerfil, refetchPerfil } = useAuth();
  const toast = useToast();
  const [erroBloqueio, setErroBloqueio] = useState<string | null>(null);

  const ehProprio = usuario?.id === meuPerfil?.id;
  const totalAdminsAtivos = (lista.data ?? []).filter(
    (u) => u.papel === 'ADMIN' && u.ativo,
  ).length;

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { nome: '', papel: 'OPERADOR', ativo: true },
  });

  useEffect(() => {
    if (usuario) {
      form.reset({ nome: usuario.nome, papel: usuario.papel, ativo: usuario.ativo });
      setErroBloqueio(null);
    }
  }, [usuario, form]);

  if (!usuario) return null;

  async function onSubmit(d: Form) {
    if (!usuario) return;
    setErroBloqueio(null);

    // Regras de proteção
    if (ehProprio && d.papel !== usuario.papel) {
      setErroBloqueio('Você não pode alterar seu próprio papel');
      return;
    }
    if (ehProprio && !d.ativo) {
      setErroBloqueio('Você não pode desativar a si mesmo');
      return;
    }
    if (
      usuario.papel === 'ADMIN' &&
      usuario.ativo &&
      (d.papel !== 'ADMIN' || !d.ativo) &&
      totalAdminsAtivos <= 1
    ) {
      setErroBloqueio('Não é possível remover o último administrador ativo');
      return;
    }

    try {
      await editar.mutateAsync({
        id: usuario.id,
        dados: { nome: d.nome, papel: d.papel, ativo: d.ativo },
      });
      if (ehProprio) await refetchPerfil();
      toast.success('Usuário atualizado');
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  const ativo = form.watch('ativo');
  const papel = form.watch('papel');
  const nuncaLogou = !usuario.ultimo_acesso;

  return (
    <Modal
      open={open}
      onClose={editar.isPending ? () => {} : onClose}
      title="Editar usuário"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={editar.isPending}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} loading={editar.isPending}>
            Salvar
          </Button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex items-center gap-4 pb-4 border-b border-border-soft">
          <Avatar nome={usuario.nome} papel={usuario.papel} size={56} />
          <div>
            <p className="text-base text-text">{usuario.nome}</p>
            <p className="text-sm text-text-3 font-mono-num">@{emailParaUsuario(usuario.email)}</p>
            <p className="text-xs text-text-3 mt-1">
              Último acesso: {usuario.ultimo_acesso ? formatDateTime(usuario.ultimo_acesso) : 'Nunca'}
              {nuncaLogou && (
                <span className="ml-2 px-1.5 py-px rounded-md text-[10px] uppercase tracking-wider bg-amber-soft-bg text-amber border border-amber-soft-border">
                  Pendente
                </span>
              )}
            </p>
          </div>
        </div>

        <Input
          label="Nome *"
          {...form.register('nome')}
          error={form.formState.errors.nome?.message}
        />

        <div>
          <p className="text-sm text-text-2 font-medium mb-2">
            Papel
            {ehProprio && (
              <span className="ml-2 inline-flex items-center gap-1 text-xs text-text-3">
                <Lock size={11} /> Não editável (você mesmo)
              </span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {PAPEIS.map((p) => (
              <button
                type="button"
                key={p.value}
                disabled={ehProprio}
                onClick={() => form.setValue('papel', p.value, { shouldValidate: true })}
                className={`p-2.5 rounded-lg border text-sm transition ${
                  papel === p.value
                    ? 'border-accent bg-accent-soft-bg text-accent'
                    : 'border-border bg-surface-2 text-text-2 hover:text-text'
                } ${ehProprio ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <div>
            <p className="text-sm text-text font-medium">Ativo</p>
            <p className="text-xs text-text-3">
              Inativos não conseguem fazer login. Histórico permanece preservado.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !ehProprio && form.setValue('ativo', !ativo)}
            disabled={ehProprio}
            role="switch"
            aria-checked={ativo}
            className={`relative w-10 h-6 rounded-full transition flex-shrink-0 ${
              ativo ? 'bg-accent' : 'bg-surface-3'
            } ${ehProprio ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition ${
                ativo ? 'translate-x-4' : ''
              }`}
            />
          </button>
        </div>

        {erroBloqueio && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warn-soft-bg border border-warn-soft-border text-sm text-warn">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{erroBloqueio}</span>
          </div>
        )}

        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
