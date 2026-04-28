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
import { verificarAcesso } from '../lib/seguranca';
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

// Helper genérico de timeout — aceita qualquer thenable
async function comTimeout<T>(
  thenable: PromiseLike<T>,
  ms: number,
  label: string,
): Promise<T> {
  return Promise.race([
    Promise.resolve(thenable),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout ${ms}ms: ${label}`)), ms),
    ),
  ]);
}

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
      const { data, error } = await comTimeout(
        supabase.from('perfis').select('*').eq('id', userId).maybeSingle(),
        5000,
        'select perfis',
      );

      if (error) {
        console.error('🔴 [Auth] ERRO ao carregar perfil:', error);
        setPerfil(null);
        return null;
      }

      console.log('🟢 [Auth] perfil carregado:', data);
      setPerfil(data ?? null);

      if (data && ultimoAcessoEnviado.current !== userId) {
        ultimoAcessoEnviado.current = userId;
        // fire-and-forget
        supabase
          .from('perfis')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', userId)
          .then(
            () => {},
            (err) => console.warn('⚠️ Falha update ultimo_acesso:', err),
          );
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

    const timeoutEmergencia = setTimeout(() => {
      console.warn('⏱️ [Auth] TIMEOUT 25s: forçando carregando=false');
      if (!cancelado) setCarregando(false);
    }, 25000);

    // Setup check com timeout
    console.log('🔵 [Auth] verificando setup...');
    comTimeout(supabase.rpc('precisa_setup'), 3000, 'rpc precisa_setup')
      .then((res) => {
        if (cancelado) return;
        const { data, error } = res as { data: unknown; error: unknown };
        console.log('🟢 [Auth] setup result:', { data, error });
        if (!error && typeof data === 'boolean') setSetupNeeded(data);
      })
      .catch((err: Error) => {
        console.warn(
          '⏱️ [Auth] precisa_setup falhou/timeout — assumindo false:',
          err.message,
        );
      });

    // Sessão inicial — com retry (3 tentativas) e timeout maior por tentativa
    void (async () => {
      let sess: Session | null = null;
      let tentativas = 0;
      const MAX_TENTATIVAS = 3;

      while (tentativas < MAX_TENTATIVAS && !cancelado) {
        tentativas++;
        try {
          console.log(`🔵 [Auth] getSession tentativa ${tentativas}/${MAX_TENTATIVAS}`);
          const sessRes = await comTimeout(
            supabase.auth.getSession(),
            8000,
            `getSession #${tentativas}`,
          );
          sess = sessRes.data.session;
          console.log('🔵 [Auth] sessão inicial OK:', !!sess);
          break;
        } catch (err) {
          console.warn(
            `⏱️ [Auth] tentativa ${tentativas} falhou:`,
            (err as Error).message,
          );
          if (tentativas < MAX_TENTATIVAS) {
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }

      if (cancelado) return;

      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user) {
        await carregarPerfil(sess.user.id);
      }

      if (!cancelado) {
        console.log('✅ [Auth] setCarregando(false) — sessão inicial');
        setCarregando(false);
      }
    })();

    // Listener pra mudanças posteriores (login/logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, sess) => {
      console.log('🔵 [Auth] onAuthStateChange evento:', event, 'session?', !!sess);
      if (cancelado) return;
      if (event === 'INITIAL_SESSION') return;

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
      }
    });

    // Logout automático após 4h sem interação
    let timerInatividade: ReturnType<typeof setTimeout>;
    const TEMPO_INATIVIDADE = 4 * 60 * 60 * 1000;

    const resetTimerInatividade = () => {
      clearTimeout(timerInatividade);
      timerInatividade = setTimeout(() => {
        console.warn('⏱️ [Auth] Logout por inatividade (4h)');
        void supabase.auth.signOut().then(() => {
          setPerfil(null);
          navigate('/login');
        });
      }, TEMPO_INATIVIDADE);
    };

    const eventos = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    eventos.forEach((ev) => window.addEventListener(ev, resetTimerInatividade));
    resetTimerInatividade();

    return () => {
      console.log('🔵 [Auth] cleanup do useEffect inicial');
      cancelado = true;
      clearTimeout(timeoutEmergencia);
      clearTimeout(timerInatividade);
      eventos.forEach((ev) => window.removeEventListener(ev, resetTimerInatividade));
      subscription.unsubscribe();
    };
  }, [carregarPerfil, navigate]);

  // Verificação periódica (a cada 5min): revoga acesso se sair do horário/local
  useEffect(() => {
    if (!perfil) return;

    const interval = setInterval(() => {
      void (async () => {
        const verificacao = await verificarAcesso(perfil.papel);
        if (!verificacao.permitido) {
          console.warn('🚫 [Auth] Acesso revogado durante a sessão:', verificacao.motivo);
          await supabase.auth.signOut();
          setPerfil(null);
          navigate('/login');
        }
      })();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [perfil, navigate]);

  const login = useCallback(
    async (usuario: string, senha: string) => {
      const email = usuarioParaEmail(usuario);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) throw new Error(traduzirErro(error.message));

      // Auditoria fire-and-forget
      if (data.user) {
        const userId = data.user.id;
        (async () => {
          try {
            const { data: p } = await supabase
              .from('perfis')
              .select('id, nome, empresa_id')
              .eq('id', userId)
              .maybeSingle();
            if (p) {
              await supabase.from('auditoria').insert({
                empresa_id: p.empresa_id,
                usuario_id: p.id,
                usuario_nome: p.nome,
                acao: 'LOGIN',
                recurso: 'sistema',
                detalhes: { user_agent: navigator.userAgent },
              });
            }
          } catch (err) {
            console.warn('⚠️ Auditoria de login falhou:', err);
          }
        })();
      }

      // Verifica segurança baseada no papel
      if (data.user) {
        const { data: perfilData } = await supabase
          .from('perfis')
          .select('papel')
          .eq('id', data.user.id)
          .maybeSingle();

        const papel = perfilData?.papel ?? 'OPERADOR';
        const verificacao = await verificarAcesso(papel);

        if (!verificacao.permitido) {
          console.warn('🚫 [Auth] Acesso bloqueado:', verificacao.motivo);
          await supabase.auth.signOut();
          throw new Error('Acesso negado');
        }
      }

      navigate('/dashboard');
    },
    [navigate],
  );

  const logout = useCallback(async () => {
    if (perfil) {
      // fire-and-forget
      supabase
        .from('auditoria')
        .insert({
          empresa_id: perfil.empresa_id,
          usuario_id: perfil.id,
          usuario_nome: perfil.nome,
          acao: 'LOGOUT',
          recurso: 'sistema',
        })
        .then(
          () => {},
          (err) => console.warn('⚠️ Auditoria de logout falhou:', err),
        );
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
        if (
          msgLower.includes('already registered') ||
          msgLower.includes('already exists')
        ) {
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({ email, password: senha });
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