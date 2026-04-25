-- ============================================================
-- Helpers — Fase 2: setup wizard + bootstrap
-- ============================================================

-- Função: verifica se ainda precisa rodar o setup inicial
-- Retorna TRUE se nenhuma empresa cadastrada
CREATE OR REPLACE FUNCTION precisa_setup()
RETURNS BOOLEAN AS $$
  SELECT NOT EXISTS (SELECT 1 FROM empresas LIMIT 1);
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION precisa_setup() TO anon;
GRANT EXECUTE ON FUNCTION precisa_setup() TO authenticated;

-- Função: bootstrap inicial (cria empresa + perfil ADMIN atomicamente)
--
-- Por que SECURITY DEFINER:
--   * tabela `empresas` não tem policy de INSERT (single-tenant, ninguém cria empresa após setup)
--   * policy de INSERT em `perfis` exige usuário já ser ADMIN — no setup ele não é nada
--   * essa função roda com permissões do owner do banco, contornando RLS
--
-- Por que é seguro mesmo com SECURITY DEFINER:
--   * só roda se NÃO existe empresa ainda (idempotência: tentar rodar 2x falha)
--   * exige usuário autenticado (auth.uid() não pode ser NULL)
--   * cria perfil ADMIN apenas pro próprio auth.uid() do chamador, nunca pra outro
CREATE OR REPLACE FUNCTION setup_inicial_bootstrap(
  p_nome_fantasia TEXT,
  p_nome_admin TEXT,
  p_razao_social TEXT DEFAULT NULL,
  p_cnpj TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_empresa_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM empresas LIMIT 1) THEN
    RAISE EXCEPTION 'Setup já realizado' USING ERRCODE = '23505';
  END IF;

  -- Pega email do usuário autenticado direto do auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Usuário sem email no auth.users';
  END IF;

  -- Cria empresa
  INSERT INTO empresas (nome_fantasia, razao_social, cnpj)
  VALUES (
    NULLIF(TRIM(p_nome_fantasia), ''),
    NULLIF(TRIM(p_razao_social), ''),
    NULLIF(TRIM(p_cnpj), '')
  )
  RETURNING id INTO v_empresa_id;

  -- Cria perfil ADMIN do chamador
  INSERT INTO perfis (id, empresa_id, nome, email, papel, ativo)
  VALUES (v_user_id, v_empresa_id, TRIM(p_nome_admin), v_email, 'ADMIN', TRUE);

  RETURN json_build_object(
    'empresa_id', v_empresa_id,
    'perfil_id', v_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION setup_inicial_bootstrap(TEXT, TEXT, TEXT, TEXT) TO authenticated;
