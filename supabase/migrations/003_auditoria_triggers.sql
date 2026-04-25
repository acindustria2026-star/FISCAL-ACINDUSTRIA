-- ============================================================
-- Auditoria — triggers automáticos
-- Fase 7: registra CRIAR/EDITAR/EXCLUIR sem precisar lembrar no código
-- ============================================================

-- Helper: retorna o jsonb com diff campo a campo, ignorando colunas meta
CREATE OR REPLACE FUNCTION audit_diff_campos(p_old JSONB, p_new JSONB, p_ignorar TEXT[] DEFAULT ARRAY['updated_at', 'created_at'])
RETURNS JSONB AS $$
  SELECT jsonb_object_agg(
    key,
    jsonb_build_object('antes', p_old->key, 'depois', p_new->key)
  )
  FROM jsonb_each(p_new)
  WHERE p_new->key IS DISTINCT FROM p_old->key
    AND NOT (key = ANY(p_ignorar));
$$ LANGUAGE SQL IMMUTABLE;

-- Função genérica de auditoria
CREATE OR REPLACE FUNCTION fn_auditoria()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID := auth.uid();
  v_usuario_nome TEXT;
  v_usuario_empresa UUID;
  v_acao acao_auditoria;
  v_recurso_id UUID;
  v_empresa_id UUID;
  v_detalhes JSONB;
  v_campos JSONB;
  v_old JSONB;
  v_new JSONB;
BEGIN
  -- Sem usuário autenticado (ex: SQL direto, bootstrap antes do perfil) → ignora
  IF v_usuario_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT nome, empresa_id INTO v_usuario_nome, v_usuario_empresa
  FROM perfis WHERE id = v_usuario_id;

  -- Sem perfil correspondente → ignora (caso bootstrap onde a empresa é inserida antes do perfil)
  IF v_usuario_nome IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_old := to_jsonb(OLD);
  v_new := to_jsonb(NEW);

  -- empresa_id do registro: tabela `empresas` usa id; outras usam empresa_id
  IF TG_TABLE_NAME = 'empresas' THEN
    v_empresa_id := COALESCE(
      (v_new->>'id')::uuid,
      (v_old->>'id')::uuid
    );
  ELSE
    v_empresa_id := COALESCE(
      (v_new->>'empresa_id')::uuid,
      (v_old->>'empresa_id')::uuid
    );
  END IF;
  v_empresa_id := COALESCE(v_empresa_id, v_usuario_empresa);

  IF TG_OP = 'INSERT' THEN
    v_acao := 'CRIAR';
    v_recurso_id := (v_new->>'id')::uuid;
    v_detalhes := jsonb_build_object('depois', v_new);

  ELSIF TG_OP = 'UPDATE' THEN
    v_recurso_id := (v_new->>'id')::uuid;
    v_campos := audit_diff_campos(v_old, v_new);

    -- Se nada relevante mudou (só updated_at por ex), pula
    IF v_campos IS NULL OR v_campos = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    v_acao := 'EDITAR';
    v_detalhes := jsonb_build_object(
      'antes', v_old,
      'depois', v_new,
      'campos', v_campos
    );

  ELSIF TG_OP = 'DELETE' THEN
    v_acao := 'EXCLUIR';
    v_recurso_id := (v_old->>'id')::uuid;
    v_detalhes := jsonb_build_object('snapshot', v_old);
  END IF;

  INSERT INTO auditoria (
    empresa_id, usuario_id, usuario_nome,
    acao, recurso, recurso_id, detalhes
  ) VALUES (
    v_empresa_id, v_usuario_id, v_usuario_nome,
    v_acao, TG_TABLE_NAME, v_recurso_id, v_detalhes
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger especial pra perfis: detecta MUDAR_PAPEL, REMOVER_USUARIO, CONVIDAR_USUARIO
CREATE OR REPLACE FUNCTION fn_auditoria_perfis()
RETURNS TRIGGER AS $$
DECLARE
  v_usuario_id UUID := auth.uid();
  v_usuario_nome TEXT;
  v_acao acao_auditoria;
  v_detalhes JSONB;
  v_campos JSONB;
BEGIN
  IF v_usuario_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT nome INTO v_usuario_nome FROM perfis WHERE id = v_usuario_id;

  IF v_usuario_nome IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_acao := 'CONVIDAR_USUARIO';
    v_detalhes := jsonb_build_object(
      'nome', NEW.nome,
      'email', NEW.email,
      'papel', NEW.papel
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.papel IS DISTINCT FROM NEW.papel THEN
    v_acao := 'MUDAR_PAPEL';
    v_detalhes := jsonb_build_object(
      'nome', NEW.nome,
      'papel_anterior', OLD.papel,
      'papel_novo', NEW.papel
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.ativo IS DISTINCT FROM NEW.ativo AND NEW.ativo = false THEN
    v_acao := 'REMOVER_USUARIO';
    v_detalhes := jsonb_build_object('nome', NEW.nome, 'email', NEW.email);
  ELSE
    -- Edição normal — usa diff genérico, ignorando ultimo_acesso (atualiza a cada login)
    v_campos := audit_diff_campos(
      to_jsonb(OLD),
      to_jsonb(NEW),
      ARRAY['updated_at', 'created_at', 'ultimo_acesso']
    );
    IF v_campos IS NULL OR v_campos = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
    v_acao := 'EDITAR';
    v_detalhes := jsonb_build_object(
      'antes', to_jsonb(OLD),
      'depois', to_jsonb(NEW),
      'campos', v_campos
    );
  END IF;

  INSERT INTO auditoria (empresa_id, usuario_id, usuario_nome, acao, recurso, recurso_id, detalhes)
  VALUES (NEW.empresa_id, v_usuario_id, v_usuario_nome, v_acao, 'perfis', NEW.id, v_detalhes);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplica triggers
CREATE TRIGGER auditoria_clientes
  AFTER INSERT OR UPDATE OR DELETE ON clientes
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER auditoria_materiais
  AFTER INSERT OR UPDATE OR DELETE ON materiais
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER auditoria_pedidos
  AFTER INSERT OR UPDATE OR DELETE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER auditoria_nfs
  AFTER INSERT OR UPDATE OR DELETE ON notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER auditoria_recebimentos
  AFTER INSERT OR UPDATE OR DELETE ON recebimentos
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER auditoria_empresas
  AFTER INSERT OR UPDATE OR DELETE ON empresas
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria();

CREATE TRIGGER auditoria_perfis
  AFTER INSERT OR UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION fn_auditoria_perfis();
