import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, MailCheck } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
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

type Estado = 'carregando' | 'pronto' | 'sem-sessao';

export default function AceitarConvite() {
  const navigate = useNavigate();
  const toast = useToast();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [sessao, setSessao] = useState<Session | null>(null);
  const [enviando, setEnviando] = useState(false);

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { senha: '', confirmar: '' },
  });

  useEffect(() => {
    let cancelado = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelado) return;
      if (data.session) {
        setSessao(data.session);
        setEstado('pronto');
      } else {
        setEstado('sem-sessao');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, sess) => {
      if (cancelado) return;
      if (sess) {
        setSessao(sess);
        setEstado('pronto');
      }
    });

    return () => {
      cancelado = true;
      subscription.unsubscribe();
    };
  }, []);

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
      toast.success('Senha definida — bem-vindo!');
      navigate('/dashboard');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao definir senha');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader subtitle="Aceitar convite" />
      <Card className="p-6">
        {estado === 'carregando' && (
          <p className="text-sm text-text-2 text-center">Validando seu convite...</p>
        )}

        {estado === 'sem-sessao' && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <AlertCircle size={36} className="text-warn" />
            <h2 className="text-lg font-medium">Convite inválido ou expirado</h2>
            <p className="text-sm text-text-2">
              Esse link já foi usado ou passou de 24h. Peça pro administrador reenviar o convite.
            </p>
          </div>
        )}

        {estado === 'pronto' && sessao && (
          <>
            <div className="flex flex-col items-center gap-2 mb-5">
              <MailCheck size={32} className="text-accent" />
              <h2 className="text-lg font-medium">Bem-vindo!</h2>
              <p className="text-sm text-text-2 text-center">
                Defina sua senha pra entrar.
                <br />
                <span className="text-text-3 text-xs font-mono-num">
                  {sessao.user.email}
                </span>
              </p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Input
                  label="Nova senha *"
                  type="password"
                  autoComplete="new-password"
                  {...form.register('senha')}
                  error={form.formState.errors.senha?.message}
                  autoFocus
                />
                <PasswordStrength value={senha ?? ''} />
              </div>
              <Input
                label="Confirmar senha *"
                type="password"
                autoComplete="new-password"
                {...form.register('confirmar')}
                error={form.formState.errors.confirmar?.message}
              />
              <Button type="submit" size="lg" fullWidth loading={enviando}>
                Definir senha e entrar
              </Button>
            </form>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
