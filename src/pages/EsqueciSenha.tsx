import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { AuthHeader, AuthLayout } from '../components/layout/AuthLayout';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

const schema = z.object({
  email: z.string().email('Email inválido'),
});
type Form = z.infer<typeof schema>;

export default function EsqueciSenha() {
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const { resetSenha } = useAuth();
  const toast = useToast();

  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(d: Form) {
    setEnviando(true);
    try {
      await resetSenha(d.email);
      setEnviado(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthLayout>
      <AuthHeader subtitle="Recuperação de senha" />
      <Card className="p-6">
        {enviado ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <MailCheck size={36} className="text-accent" />
            <h2 className="text-lg font-medium">Link enviado</h2>
            <p className="text-sm text-text-2">
              Se o email estiver cadastrado, você receberá em instantes um link para redefinir sua
              senha. Verifique também a pasta de spam.
            </p>
            <Link to="/login" className="mt-3 text-sm text-accent hover:underline">
              ← Voltar para login
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-medium mb-1">Esqueci minha senha</h2>
            <p className="text-sm text-text-2 mb-5">
              Informe seu email e enviaremos um link para você criar uma nova senha.
            </p>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input
                label="Email"
                type="email"
                placeholder="voce@empresa.com"
                autoComplete="email"
                {...form.register('email')}
                error={form.formState.errors.email?.message}
              />
              <Button type="submit" size="lg" fullWidth loading={enviando}>
                Enviar link de recuperação
              </Button>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-1 text-sm text-text-2 hover:text-accent transition"
              >
                <ArrowLeft size={14} /> Voltar para login
              </Link>
            </form>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}
