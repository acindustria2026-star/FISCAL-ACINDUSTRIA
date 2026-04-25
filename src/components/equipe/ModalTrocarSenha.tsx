import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PasswordStrength, avaliarSenha } from '../ui/PasswordStrength';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const schema = z
  .object({
    senhaAtual: z.string().min(1, 'Informe a senha atual'),
    novaSenha: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: 'As senhas não coincidem',
    path: ['confirmar'],
  })
  .refine((d) => d.novaSenha !== d.senhaAtual, {
    message: 'A nova senha deve ser diferente da atual',
    path: ['novaSenha'],
  });

type Form = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ModalTrocarSenha({ open, onClose }: Props) {
  const { perfil } = useAuth();
  const toast = useToast();
  const [enviando, setEnviando] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { senhaAtual: '', novaSenha: '', confirmar: '' },
  });

  const novaSenha = form.watch('novaSenha');

  async function onSubmit(d: Form) {
    if (!perfil?.email) {
      toast.error('Sessão inválida');
      return;
    }
    if (avaliarSenha(d.novaSenha).score < 2) {
      toast.error('Escolha uma senha mais forte');
      return;
    }
    setEnviando(true);
    try {
      // Re-autentica pra validar senha atual
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: perfil.email,
        password: d.senhaAtual,
      });
      if (signInErr) throw new Error('Senha atual incorreta');

      const { error: updErr } = await supabase.auth.updateUser({ password: d.novaSenha });
      if (updErr) throw updErr;

      toast.success('Senha atualizada');
      form.reset();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao trocar senha');
    } finally {
      setEnviando(false);
    }
  }

  function fechar() {
    form.reset();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={enviando ? () => {} : fechar}
      title="Trocar minha senha"
      description="Você precisa informar a senha atual pra confirmar a mudança."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={fechar} disabled={enviando}>
            Cancelar
          </Button>
          <Button onClick={form.handleSubmit(onSubmit)} loading={enviando}>
            Salvar
          </Button>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Input
          label="Senha atual *"
          type="password"
          autoComplete="current-password"
          {...form.register('senhaAtual')}
          error={form.formState.errors.senhaAtual?.message}
        />
        <div className="flex flex-col gap-2">
          <Input
            label="Nova senha *"
            type="password"
            autoComplete="new-password"
            {...form.register('novaSenha')}
            error={form.formState.errors.novaSenha?.message}
          />
          <PasswordStrength value={novaSenha ?? ''} />
        </div>
        <Input
          label="Confirmar nova senha *"
          type="password"
          autoComplete="new-password"
          {...form.register('confirmar')}
          error={form.formState.errors.confirmar?.message}
        />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
