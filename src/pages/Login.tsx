import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User } from 'lucide-react';
import { AuthHeader, AuthLayout } from '../components/layout/AuthLayout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

const schema = z.object({
  usuario: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .regex(/^[a-zA-Z0-9._@-]+$/, 'Use só letras, números, ponto, traço, @ ou underscore'),
  senha: z.string().min(1, 'Informe a senha'),
});
type LoginForm = z.infer<typeof schema>;

export default function Login() {
  const [enviando, setEnviando] = useState(false);
  const [nomeEmpresa, setNomeEmpresa] = useState<string | null>(null);
  const { login } = useAuth();
  const toast = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { usuario: '', senha: '' },
  });

  useEffect(() => {
    let cancelado = false;
    void supabase
      .from('empresas')
      .select('nome_fantasia')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelado && data?.nome_fantasia) setNomeEmpresa(data.nome_fantasia);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  async function onSubmit(d: LoginForm) {
    setEnviando(true);
    try {
      await login(d.usuario, d.senha);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader subtitle={nomeEmpresa ?? 'Reciclagem'} />
      <Card className="p-6">
        <h2 className="text-lg font-medium mb-1">Entrar</h2>
        <p className="text-sm text-text-2 mb-5">Acesse com seu usuário e senha.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Usuário"
            type="text"
            placeholder="ex: admin"
            leftIcon={<User size={14} />}
            autoComplete="username"
            autoFocus
            {...form.register('usuario', {
              setValueAs: (v: string) => v?.toLowerCase().trim() ?? '',
            })}
            error={form.formState.errors.usuario?.message}
          />
          <Input
            label="Senha"
            type="password"
            autoComplete="current-password"
            {...form.register('senha')}
            error={form.formState.errors.senha?.message}
          />
          <Button type="submit" size="lg" fullWidth loading={enviando}>
            Entrar
          </Button>
          <p className="text-xs text-text-3 text-center mt-1">
            Esqueceu a senha? Peça pro administrador resetar.
          </p>
        </form>
      </Card>
    </AuthLayout>
  );
}
