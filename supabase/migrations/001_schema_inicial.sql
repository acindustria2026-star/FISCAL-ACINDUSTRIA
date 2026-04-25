-- ============================================================
-- Schema inicial — Sistema Controle Fiscal (Reciclagem)
-- Fase 1: tabelas + triggers + RLS + policies
-- ============================================================

-- Habilitar extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===== ENUMS =====
CREATE TYPE papel AS ENUM ('ADMIN', 'OPERADOR', 'FINANCEIRO');
CREATE TYPE tipo_frete AS ENUM ('CIF', 'FOB');
CREATE TYPE motivo_complementar AS ENUM ('PESO', 'PRECO', 'IMPOSTO', 'OUTRO');
CREATE TYPE status_pedido AS ENUM ('ATIVO', 'CONCLUIDO');
CREATE TYPE acao_auditoria AS ENUM (
  'CRIAR', 'EDITAR', 'EXCLUIR', 'PAGAR', 'CONCLUIR',
  'LOGIN', 'LOGOUT', 'CONVIDAR_USUARIO', 'REMOVER_USUARIO',
  'MUDAR_PAPEL', 'BACKUP', 'RESTAURAR'
);

-- ===== TABELA: empresas =====
CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social TEXT,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT,
  inscricao_estadual TEXT,
  endereco TEXT,
  cidade TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===== TABELA: perfis =====
-- Cada user no Supabase Auth tem 1 perfil aqui com papel + empresa
CREATE TABLE perfis (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  papel papel NOT NULL DEFAULT 'OPERADOR',
  ativo BOOLEAN DEFAULT TRUE,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_perfis_empresa ON perfis(empresa_id);
CREATE INDEX idx_perfis_email ON perfis(email);

-- ===== TABELA: clientes =====
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_clientes_empresa ON clientes(empresa_id);
CREATE INDEX idx_clientes_nome ON clientes(nome);

-- ===== TABELA: materiais =====
CREATE TABLE materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  icms_padrao DECIMAL(5,2) DEFAULT 18,
  pis_padrao DECIMAL(5,2) DEFAULT 1.65,
  cofins_padrao DECIMAL(5,2) DEFAULT 7.60,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_materiais_empresa ON materiais(empresa_id);

-- ===== TABELA: pedidos =====
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  material TEXT,
  peso_total DECIMAL(12,3) NOT NULL,
  preco_referencia DECIMAL(12,4),
  data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  prazo DATE,
  status status_pedido DEFAULT 'ATIVO',
  observacoes TEXT,
  concluido_em TIMESTAMPTZ,
  criado_por_id UUID REFERENCES perfis(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pedidos_empresa ON pedidos(empresa_id);
CREATE INDEX idx_pedidos_cliente ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_status ON pedidos(status);

-- ===== TABELA: notas_fiscais =====
CREATE TABLE notas_fiscais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  data DATE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL,
  material TEXT,

  peso DECIMAL(12,3) NOT NULL,
  preco_negociado DECIMAL(12,4) NOT NULL,
  valor_negociado DECIMAL(14,2) NOT NULL,

  icms_ativo BOOLEAN DEFAULT TRUE,
  piscofins_ativo BOOLEAN DEFAULT TRUE,
  icms_pct DECIMAL(6,4) DEFAULT 0.18,
  pis_pct DECIMAL(6,4) DEFAULT 0.0165,
  cofins_pct DECIMAL(6,4) DEFAULT 0.076,

  icms DECIMAL(14,2) DEFAULT 0,
  pis DECIMAL(14,2) DEFAULT 0,
  cofins DECIMAL(14,2) DEFAULT 0,
  total_impostos DECIMAL(14,2) DEFAULT 0,
  valor_final DECIMAL(14,2) NOT NULL,
  preco_final_kg DECIMAL(12,4),

  transportadora TEXT,
  placa_veiculo TEXT,
  motorista TEXT,
  tipo_frete tipo_frete,

  nf_pai_id UUID REFERENCES notas_fiscais(id) ON DELETE SET NULL,
  nf_pai_numero TEXT,
  motivo_complementar motivo_complementar,

  substituida_em TIMESTAMPTZ,
  motivo_substituicao motivo_complementar,

  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  pedido_numero TEXT,

  observacoes TEXT,

  criado_por_id UUID REFERENCES perfis(id) ON DELETE SET NULL,
  editado_por_id UUID REFERENCES perfis(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(empresa_id, numero)
);
CREATE INDEX idx_nfs_empresa ON notas_fiscais(empresa_id);
CREATE INDEX idx_nfs_data ON notas_fiscais(data);
CREATE INDEX idx_nfs_cliente ON notas_fiscais(cliente_id);
CREATE INDEX idx_nfs_pai ON notas_fiscais(nf_pai_id);
CREATE INDEX idx_nfs_pedido ON notas_fiscais(pedido_id);

-- ===== TABELA: recebimentos =====
CREATE TABLE recebimentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nf_id UUID NOT NULL UNIQUE REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  data_recebimento DATE NOT NULL,
  peso_bruto DECIMAL(12,3) NOT NULL,
  impureza_kg DECIMAL(12,3) DEFAULT 0,
  impureza_pct DECIMAL(6,4) DEFAULT 0,
  peso_liquido DECIMAL(12,3) NOT NULL,
  valor_pago DECIMAL(14,2) NOT NULL,
  data_pagamento DATE,
  pago BOOLEAN DEFAULT TRUE,
  valor_real_recebido DECIMAL(14,2),
  pago_em TIMESTAMPTZ,
  observacoes TEXT,

  criado_por_id UUID REFERENCES perfis(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_recebimentos_empresa ON recebimentos(empresa_id);
CREATE INDEX idx_recebimentos_data ON recebimentos(data_recebimento);

-- ===== TABELA: auditoria =====
CREATE TABLE auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES perfis(id) ON DELETE SET NULL,
  usuario_nome TEXT NOT NULL,
  acao acao_auditoria NOT NULL,
  recurso TEXT NOT NULL,
  recurso_id UUID,
  detalhes JSONB,
  ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_auditoria_empresa ON auditoria(empresa_id);
CREATE INDEX idx_auditoria_created ON auditoria(created_at);
CREATE INDEX idx_auditoria_acao ON auditoria(acao);

-- ===== TRIGGERS DE updated_at =====
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER empresas_updated_at BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER perfis_updated_at BEFORE UPDATE ON perfis
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pedidos_updated_at BEFORE UPDATE ON pedidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER nfs_updated_at BEFORE UPDATE ON notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER recebimentos_updated_at BEFORE UPDATE ON recebimentos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Helpers
CREATE OR REPLACE FUNCTION auth_empresa_id()
RETURNS UUID AS $$
  SELECT empresa_id FROM perfis WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION auth_papel()
RETURNS papel AS $$
  SELECT papel FROM perfis WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ===== POLICIES: empresas =====
CREATE POLICY empresas_select ON empresas FOR SELECT
  USING (id = auth_empresa_id());
CREATE POLICY empresas_update ON empresas FOR UPDATE
  USING (id = auth_empresa_id() AND auth_papel() = 'ADMIN');

-- ===== POLICIES: perfis =====
CREATE POLICY perfis_select ON perfis FOR SELECT
  USING (empresa_id = auth_empresa_id());
CREATE POLICY perfis_insert ON perfis FOR INSERT
  WITH CHECK (empresa_id = auth_empresa_id() AND auth_papel() = 'ADMIN');
CREATE POLICY perfis_update ON perfis FOR UPDATE
  USING (empresa_id = auth_empresa_id() AND (auth_papel() = 'ADMIN' OR id = auth.uid()));

-- ===== POLICIES: clientes =====
CREATE POLICY clientes_select ON clientes FOR SELECT
  USING (empresa_id = auth_empresa_id());
CREATE POLICY clientes_modify ON clientes FOR ALL
  USING (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'))
  WITH CHECK (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'));

-- ===== POLICIES: materiais =====
CREATE POLICY materiais_select ON materiais FOR SELECT
  USING (empresa_id = auth_empresa_id());
CREATE POLICY materiais_modify ON materiais FOR ALL
  USING (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'))
  WITH CHECK (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'));

-- ===== POLICIES: pedidos =====
CREATE POLICY pedidos_select ON pedidos FOR SELECT
  USING (empresa_id = auth_empresa_id());
CREATE POLICY pedidos_modify ON pedidos FOR ALL
  USING (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'))
  WITH CHECK (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'));

-- ===== POLICIES: notas_fiscais =====
CREATE POLICY nfs_select ON notas_fiscais FOR SELECT
  USING (empresa_id = auth_empresa_id());
CREATE POLICY nfs_modify ON notas_fiscais FOR ALL
  USING (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'))
  WITH CHECK (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'));

-- ===== POLICIES: recebimentos =====
CREATE POLICY recebimentos_select ON recebimentos FOR SELECT
  USING (empresa_id = auth_empresa_id());
CREATE POLICY recebimentos_modify ON recebimentos FOR ALL
  USING (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'))
  WITH CHECK (empresa_id = auth_empresa_id() AND auth_papel() IN ('ADMIN', 'OPERADOR'));

-- Financeiro pode atualizar status de pagamento
CREATE POLICY recebimentos_financeiro_marca_pago ON recebimentos FOR UPDATE
  USING (empresa_id = auth_empresa_id() AND auth_papel() = 'FINANCEIRO')
  WITH CHECK (empresa_id = auth_empresa_id() AND auth_papel() = 'FINANCEIRO');

-- ===== POLICIES: auditoria =====
CREATE POLICY auditoria_select ON auditoria FOR SELECT
  USING (empresa_id = auth_empresa_id() AND auth_papel() = 'ADMIN');
CREATE POLICY auditoria_insert ON auditoria FOR INSERT
  WITH CHECK (empresa_id = auth_empresa_id());
