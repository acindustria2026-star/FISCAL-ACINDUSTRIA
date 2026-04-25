-- ============================================================
-- Dashboard — função agregadora
-- Fase 9: retorna métricas + listas em uma única chamada
-- ============================================================

-- p_mes é 0-indexado (igual JS: 0=Jan, 11=Dez) pra casar com PeriodoContext
-- Se p_ano é NULL → todo o histórico
-- Se p_mes é NULL → ano cheio
-- Caso contrário → mês específico

CREATE OR REPLACE FUNCTION dashboard_resumo(p_mes INT, p_ano INT)
RETURNS JSON AS $$
DECLARE
  v_empresa_id UUID;
  v_data_inicio DATE;
  v_data_fim DATE;
  v_resultado JSON;
BEGIN
  v_empresa_id := auth_empresa_id();

  IF v_empresa_id IS NULL THEN
    RETURN json_build_object('erro', 'Não autenticado');
  END IF;

  IF p_ano IS NULL THEN
    v_data_inicio := DATE '1900-01-01';
    v_data_fim := DATE '2999-12-31';
  ELSIF p_mes IS NULL THEN
    v_data_inicio := MAKE_DATE(p_ano, 1, 1);
    v_data_fim := MAKE_DATE(p_ano, 12, 31);
  ELSE
    v_data_inicio := MAKE_DATE(p_ano, p_mes + 1, 1);
    v_data_fim := (v_data_inicio + INTERVAL '1 month')::DATE - 1;
  END IF;

  WITH
    nfs_periodo AS (
      SELECT
        n.id,
        n.numero,
        n.data,
        n.cliente_nome,
        n.material,
        n.peso,
        n.valor_final,
        n.total_impostos,
        n.pedido_id,
        r.peso_liquido,
        r.peso_bruto,
        r.pago,
        r.id AS recebimento_id
      FROM notas_fiscais n
      LEFT JOIN recebimentos r ON r.nf_id = n.id
      WHERE n.empresa_id = v_empresa_id
        AND n.data BETWEEN v_data_inicio AND v_data_fim
        AND n.substituida_em IS NULL
    ),
    metricas AS (
      SELECT
        COUNT(*)::INT AS total_emitidas,
        COUNT(*) FILTER (WHERE peso_liquido IS NOT NULL)::INT AS total_recebimentos,
        COUNT(*) FILTER (
          WHERE peso_liquido IS NOT NULL
            AND peso > 0
            AND ABS((peso_liquido - peso) / peso) <= 0.02
        )::INT AS total_conferidas,
        COUNT(*) FILTER (
          WHERE peso_liquido IS NOT NULL
            AND peso > 0
            AND ABS((peso_liquido - peso) / peso) > 0.02
        )::INT AS total_divergentes,
        COUNT(*) FILTER (WHERE peso_liquido IS NULL)::INT AS total_em_aberto,
        COALESCE(SUM(valor_final) FILTER (WHERE peso_liquido IS NULL), 0) AS valor_em_aberto,
        COALESCE(SUM(peso) FILTER (WHERE peso_liquido IS NULL), 0) AS peso_em_aberto,
        COALESCE(SUM(valor_final), 0) AS valor_total_emitidas,
        COALESCE(SUM(total_impostos), 0) AS total_impostos
      FROM nfs_periodo
    ),
    pendentes AS (
      SELECT
        n.id, n.numero, n.data, n.peso, n.valor_final,
        n.cliente_nome, n.material,
        EXTRACT(DAY FROM NOW() - n.data::TIMESTAMP)::INT AS dias
      FROM notas_fiscais n
      LEFT JOIN recebimentos r ON r.nf_id = n.id
      WHERE n.empresa_id = v_empresa_id
        AND r.id IS NULL
        AND n.substituida_em IS NULL
      ORDER BY n.data ASC
      LIMIT 5
    ),
    pendentes_total AS (
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (
          WHERE EXTRACT(DAY FROM NOW() - n.data::TIMESTAMP) > 7
        )::INT AS atrasadas
      FROM notas_fiscais n
      LEFT JOIN recebimentos r ON r.nf_id = n.id
      WHERE n.empresa_id = v_empresa_id
        AND r.id IS NULL
        AND n.substituida_em IS NULL
    ),
    pedidos_ativos AS (
      SELECT
        p.id, p.numero, p.cliente_nome, p.material,
        p.peso_total, p.prazo,
        COALESCE((SELECT SUM(n2.peso) FROM notas_fiscais n2 WHERE n2.pedido_id = p.id AND n2.substituida_em IS NULL), 0) AS entregue
      FROM pedidos p
      WHERE p.empresa_id = v_empresa_id AND p.status = 'ATIVO'
      ORDER BY
        CASE WHEN p.prazo IS NOT NULL AND p.prazo < CURRENT_DATE THEN 0 ELSE 1 END,
        p.prazo ASC NULLS LAST
      LIMIT 5
    ),
    pedidos_metricas AS (
      SELECT
        COUNT(*)::INT AS total,
        COUNT(*) FILTER (WHERE prazo < CURRENT_DATE)::INT AS atrasados,
        COUNT(*) FILTER (
          WHERE peso_total > 0
            AND COALESCE((SELECT SUM(n3.peso) FROM notas_fiscais n3 WHERE n3.pedido_id = p.id AND n3.substituida_em IS NULL), 0) / peso_total > 0.8
        )::INT AS quase_fechando
      FROM pedidos p
      WHERE p.empresa_id = v_empresa_id AND p.status = 'ATIVO'
    )
  SELECT json_build_object(
    'periodo', json_build_object(
      'inicio', v_data_inicio,
      'fim', v_data_fim
    ),
    'metricas', (SELECT row_to_json(m) FROM metricas m),
    'pendentes', COALESCE((SELECT json_agg(row_to_json(p)) FROM pendentes p), '[]'::json),
    'pendentes_total', (SELECT row_to_json(pt) FROM pendentes_total pt),
    'pedidos', COALESCE((SELECT json_agg(row_to_json(pa)) FROM pedidos_ativos pa), '[]'::json),
    'pedidos_metricas', (SELECT row_to_json(pm) FROM pedidos_metricas pm)
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION dashboard_resumo(INT, INT) TO authenticated;
