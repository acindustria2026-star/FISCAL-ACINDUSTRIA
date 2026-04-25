export type Papel = 'ADMIN' | 'OPERADOR' | 'FINANCEIRO';
export type TipoFrete = 'CIF' | 'FOB';
export type MotivoComplementar = 'PESO' | 'PRECO' | 'IMPOSTO' | 'OUTRO';
export type StatusPedido = 'ATIVO' | 'CONCLUIDO';
export type AcaoAuditoria =
  | 'CRIAR'
  | 'EDITAR'
  | 'EXCLUIR'
  | 'PAGAR'
  | 'CONCLUIR'
  | 'LOGIN'
  | 'LOGOUT'
  | 'CONVIDAR_USUARIO'
  | 'REMOVER_USUARIO'
  | 'MUDAR_PAPEL'
  | 'BACKUP'
  | 'RESTAURAR';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type EmpresaRow = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string;
  cnpj: string | null;
  inscricao_estadual: string | null;
  endereco: string | null;
  cidade: string | null;
  uf: string | null;
  cep: string | null;
  telefone: string | null;
  email: string | null;
  site: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export type PerfilRow = {
  id: string;
  empresa_id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  updated_at: string;
}

export type ClienteRow = {
  id: string;
  empresa_id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  endereco: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export type MaterialRow = {
  id: string;
  empresa_id: string;
  nome: string;
  icms_padrao: number;
  pis_padrao: number;
  cofins_padrao: number;
  created_at: string;
}

export type PedidoRow = {
  id: string;
  empresa_id: string;
  numero: string;
  cliente_id: string | null;
  cliente_nome: string;
  material: string | null;
  peso_total: number;
  preco_referencia: number | null;
  data_inicio: string;
  prazo: string | null;
  status: StatusPedido;
  observacoes: string | null;
  concluido_em: string | null;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NotaFiscalRow = {
  id: string;
  empresa_id: string;
  numero: string;
  data: string;
  cliente_id: string | null;
  cliente_nome: string;
  material: string | null;

  peso: number;
  preco_negociado: number;
  valor_negociado: number;

  icms_ativo: boolean;
  piscofins_ativo: boolean;
  icms_pct: number;
  pis_pct: number;
  cofins_pct: number;

  icms: number;
  pis: number;
  cofins: number;
  total_impostos: number;
  valor_final: number;
  preco_final_kg: number | null;

  transportadora: string | null;
  placa_veiculo: string | null;
  motorista: string | null;
  tipo_frete: TipoFrete | null;

  nf_pai_id: string | null;
  nf_pai_numero: string | null;
  motivo_complementar: MotivoComplementar | null;

  substituida_em: string | null;
  motivo_substituicao: MotivoComplementar | null;

  pedido_id: string | null;
  pedido_numero: string | null;

  observacoes: string | null;

  criado_por_id: string | null;
  editado_por_id: string | null;

  created_at: string;
  updated_at: string;
}

export type RecebimentoRow = {
  id: string;
  empresa_id: string;
  nf_id: string;
  data_recebimento: string;
  peso_bruto: number;
  impureza_kg: number;
  impureza_pct: number;
  peso_liquido: number;
  valor_pago: number;
  data_pagamento: string | null;
  pago: boolean;
  valor_real_recebido: number | null;
  pago_em: string | null;
  observacoes: string | null;
  criado_por_id: string | null;
  created_at: string;
  updated_at: string;
}

export type AuditoriaRow = {
  id: string;
  empresa_id: string;
  usuario_id: string | null;
  usuario_nome: string;
  acao: AcaoAuditoria;
  recurso: string;
  recurso_id: string | null;
  detalhes: Json | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

type WithDefaults<T, Required extends keyof T> = Partial<T> & Pick<T, Required>;

export type Database = {
  public: {
    Tables: {
      empresas: {
        Row: EmpresaRow;
        Insert: WithDefaults<EmpresaRow, 'nome_fantasia'>;
        Update: Partial<EmpresaRow>;
        Relationships: [];
      };
      perfis: {
        Row: PerfilRow;
        Insert: WithDefaults<PerfilRow, 'id' | 'empresa_id' | 'nome' | 'email'>;
        Update: Partial<PerfilRow>;
        Relationships: [];
      };
      clientes: {
        Row: ClienteRow;
        Insert: WithDefaults<ClienteRow, 'empresa_id' | 'nome'>;
        Update: Partial<ClienteRow>;
        Relationships: [];
      };
      materiais: {
        Row: MaterialRow;
        Insert: WithDefaults<MaterialRow, 'empresa_id' | 'nome'>;
        Update: Partial<MaterialRow>;
        Relationships: [];
      };
      pedidos: {
        Row: PedidoRow;
        Insert: WithDefaults<PedidoRow, 'empresa_id' | 'numero' | 'cliente_nome' | 'peso_total'>;
        Update: Partial<PedidoRow>;
        Relationships: [];
      };
      notas_fiscais: {
        Row: NotaFiscalRow;
        Insert: WithDefaults<
          NotaFiscalRow,
          | 'empresa_id'
          | 'numero'
          | 'data'
          | 'cliente_nome'
          | 'peso'
          | 'preco_negociado'
          | 'valor_negociado'
          | 'valor_final'
        >;
        Update: Partial<NotaFiscalRow>;
        Relationships: [];
      };
      recebimentos: {
        Row: RecebimentoRow;
        Insert: WithDefaults<
          RecebimentoRow,
          | 'empresa_id'
          | 'nf_id'
          | 'data_recebimento'
          | 'peso_bruto'
          | 'peso_liquido'
          | 'valor_pago'
        >;
        Update: Partial<RecebimentoRow>;
        Relationships: [];
      };
      auditoria: {
        Row: AuditoriaRow;
        Insert: WithDefaults<AuditoriaRow, 'empresa_id' | 'usuario_nome' | 'acao' | 'recurso'>;
        Update: Partial<AuditoriaRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Enums: {
      papel: Papel;
      tipo_frete: TipoFrete;
      motivo_complementar: MotivoComplementar;
      status_pedido: StatusPedido;
      acao_auditoria: AcaoAuditoria;
    };
    Functions: {
      precisa_setup: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      setup_inicial_bootstrap: {
        Args: {
          p_nome_fantasia: string;
          p_nome_admin: string;
          p_razao_social?: string | null;
          p_cnpj?: string | null;
        };
        Returns: Json;
      };
      auth_empresa_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      auth_papel: {
        Args: Record<string, never>;
        Returns: Papel | null;
      };
      dashboard_resumo: {
        Args: { p_mes: number | null; p_ano: number | null };
        Returns: Json;
      };
      relatorio_impureza: {
        Args: { p_mes: number | null; p_ano: number | null };
        Returns: Json;
      };
    };
  };
};
