import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthHeader, AuthLayout } from '../components/layout/AuthLayout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { PasswordStrength, avaliarSenha } from '../components/ui/PasswordStrength';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';

const schema = z
  .object({
    senha: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmar: z.string(),
  })
  .refine((d) => d.senha === d.confirmar, {
    message: 'As senhas não coincidem',
    path: ['confirmar'],
  });
type Form = z.infer<typeof schema>;

export default function RedefinirSenha() {
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { senha: '', confirmar: '' },
  });
  const senha = form.watch('senha');

  async function onSubmit(d: Form) {
    if (avaliarSenha(d.senha).score < 2) {
      toast.error('Escolha uma senha mais forte');
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: d.senha });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso');
      await supabase.auth.signOut();
      navigate('/login');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader subtitle="Definir nova senha" />
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-1">Nova senha</h2>
        <p className="text-sm text-text-2 mb-5">
          Escolha uma senha forte que você não use em outros lugares.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Input
              label="Nova senha"
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
          <Button type="submit" size="lg" fullWidth loading={enviando}>
            Salvar nova senha
          </Button>
        </form>
      </Card>
    </AuthLayout>
  );
}
