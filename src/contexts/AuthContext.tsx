import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { usuarioParaEmail } from '../lib/userMapper';
import type { PerfilRow } from '../types/database';

export interface SetupData {
  empresa: {
    nomeFantasia: string;
    razaoSocial?: string;
    cnpj?: string;
  };
  admin: {
    nome: string;
    usuario: string;
    senha: string;
  };
}

interface AuthContextType {
  user: User | null;
  perfil: PerfilRow | null;
  session: Session | null;
  carregando: boolean;
  setupNeeded: boolean;
  login: (usuario: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  setupInicial: (dados: SetupData) => Promise<void>;
  resetSenha: (email: string) => Promise<void>;
  refetchPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilRow | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const navigate = useNavigate();
  const ultimoAcessoEnviado = useRef<string | null>(null);

  const carregarPerfil = useCallback(async (userId: string) => {
    console.log('🔵 [Auth] carregando perfil...', userId);
    try {
      const { data, error } = await supabase
        .from('perfis')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('🔴 [Auth] ERRO ao carregar perfil:', error);
        setPerfil(null);
        return null;
      }

      console.log('🟢 [Auth] perfil carregado:', data);
      setPerfil(data ?? null);

      if (data && ultimoAcessoEnviado.current !== userId) {
        ultimoAcessoEnviado.current = userId;
        void supabase
          .from('perfis')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', userId);
      }

      return data ?? null;
    } catch (err) {
      console.error('🔴 [Auth] ERRO inesperado em carregarPerfil:', err);
      setPerfil(null);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log('🔵 [Auth] useEffect inicial iniciado');
    let cancelado = false;

    // Timeout de emergência: força carregando=false após 8s
    // pra evitar tela presa em "Carregando..." se algo der pau silenciosamente
    const timeoutEmergencia = setTimeout(() => {
      console.warn('⏱️ [Auth] TIMEOUT 8s: forçando carregando=false');
      setCarregando(false);
    }, 8000);

    // Timeout específico de 3s na RPC precisa_setup — se demorar,
    // assume false e segue (não bloqueia a tela)
    console.log('🔵 [Auth] verificando setup...');
    const setupCheckPromise = supabase.rpc('precisa_setup');
    const setupTimeoutPromise = new Promise<{ data: boolean; error: null }>((resolve) => {
      setTimeout(() => {
        console.warn('⏱️ [Auth] TIMEOUT 3s na RPC precisa_setup — assumindo false');
        resolve({ data: false, error: null });
      }, 3000);
    });

    void Promise.race([setupCheckPromise, setupTimeoutPromise])
      .then((res) => {
        if (cancelado) return;
        const { data, error } = res as { data: unknown; error: unknown };
        console.log('🟢 [Auth] setup result:', { data, error });
        if (!error && typeof data === 'boolean') setSetupNeeded(data);
      })
      .catch((err) => {
        console.error('🔴 [Auth] ERRO em precisa_setup:', err);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, sess) => {
      console.log('🔵 [Auth] onAuthStateChange evento:', event, 'session?', !!sess);
      if (cancelado) return;
      try {
        setSession(sess);
        setUser(sess?.user ?? null);

        if (sess?.user) {
          await carregarPerfil(sess.user.id);
        } else {
          setPerfil(null);
          ultimoAcessoEnviado.current = null;
        }
      } catch (err) {
        console.error('🔴 [Auth] ERRO em onAuthStateChange:', err);
      } finally {
        console.log('✅ [Auth] setCarregando(false)');
        setCarregando(false);
      }
    });

    return () => {
      console.log('🔵 [Auth] cleanup do useEffect inicial');
      cancelado = true;
      clearTimeout(timeoutEmergencia);
      subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const login = useCallback(
    async (usuario: string, senha: string) => {
      const email = usuarioParaEmail(usuario);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) throw new Error(traduzirErro(error.message));

      if (data.user) {
        const { data: p } = await supabase
          .from('perfis')
          .select('id, nome, empresa_id')
          .eq('id', data.user.id)
          .maybeSingle();
        if (p) {
          void supabase.from('auditoria').insert({
            empresa_id: p.empresa_id,
            usuario_id: p.id,
            usuario_nome: p.nome,
            acao: 'LOGIN',
            recurso: 'sistema',
            detalhes: { user_agent: navigator.userAgent },
          });
        }
      }

      navigate('/dashboard');
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    if (perfil) {
      await supabase.from('auditoria').insert({
        empresa_id: perfil.empresa_id,
        usuario_id: perfil.id,
        usuario_nome: perfil.nome,
        acao: 'LOGOUT',
        recurso: 'sistema',
      });
    }
    await supabase.auth.signOut();
    setPerfil(null);
    ultimoAcessoEnviado.current = null;
    navigate('/login');
  }, [navigate, perfil]);

  const setupInicial = useCallback(
    async (dados: SetupData) => {
      const { usuario, senha, nome } = dados.admin;
      const email = usuarioParaEmail(usuario);

      let userId: string | null = null;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome } },
      });

      if (signUpError) {
        const msgLower = signUpError.message.toLowerCase();
        if (msgLower.includes('already registered') || msgLower.includes('already exists')) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: senha,
          });
          if (signInError) throw new Error(traduzirErro(signInError.message));
          userId = signInData.user?.id ?? null;
        } else {
          throw new Error(traduzirErro(signUpError.message));
        }
      } else {
        userId = signUpData.user?.id ?? null;
      }

      if (!userId) throw new Error('Falha ao obter usuário autenticado');

      const { error: rpcError } = await supabase.rpc('setup_inicial_bootstrap', {
        p_nome_fantasia: dados.empresa.nomeFantasia,
        p_nome_admin: nome,
        p_razao_social: dados.empresa.razaoSocial ?? null,
        p_cnpj: dados.empresa.cnpj ?? null,
      });

      if (rpcError) throw new Error('Erro no setup: ' + rpcError.message);

      await carregarPerfil(userId);
      setSetupNeeded(false);
      navigate('/dashboard');
    },
    [carregarPerfil, navigate],
  );

  const resetSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (error) throw new Error(traduzirErro(error.message));
  }, []);

  const refetchPerfil = useCallback(async () => {
    if (user) await carregarPerfil(user.id);
  }, [carregarPerfil, user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        perfil,
        session,
        carregando,
        setupNeeded,
        login,
        logout,
        setupInicial,
        resetSenha,
        refetchPerfil,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro do AuthProvider');
  return ctx;
}

function traduzirErro(msg: string): string {
  const map: Record<string, string> = {
    'Invalid login credentials': 'Email ou senha incorretos',
    'Email not confirmed': 'Email ainda não confirmado',
    'User already registered': 'Email já cadastrado',
    'Password should be at least 6 characters': 'Senha precisa ter pelo menos 8 caracteres',
    'Password should be at least 8 characters': 'Senha precisa ter pelo menos 8 caracteres',
    'Email rate limit exceeded': 'Muitos emails enviados — aguarde alguns minutos',
    'Unable to validate email address: invalid format': 'Email em formato inválido',
  };
  return map[msg] ?? msg;
}
