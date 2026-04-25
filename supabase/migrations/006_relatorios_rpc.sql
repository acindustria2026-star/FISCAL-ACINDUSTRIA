-- ============================================================
-- Relatórios — Fase 14
-- ============================================================
-- Agregação por material com cliente principal (subquery ranqueada).

CREATE OR REPLACE FUNCTION relatorio_impureza(p_mes INT, p_ano INT)
RETURNS JSON AS $$
DECLARE
  v_empresa_id UUID := auth_empresa_id();
  v_data_inicio DATE;
  v_data_fim DATE;
  v_resultado JSON;
BEGIN
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
    recebs AS (
      SELECT
        r.peso_liquido,
        r.peso_bruto,
        r.impureza_kg,
        r.impureza_pct,
        COALESCE(NULLIF(TRIM(n.material), ''), 'Sem material') AS material,
        n.cliente_nome
      FROM recebimentos r
      JOIN notas_fiscais n ON n.id = r.nf_id
      WHERE r.empresa_id = v_empresa_id
        AND r.data_recebimento BETWEEN v_data_inicio AND v_data_fim
    ),
    agg_material AS (
      SELECT
        material,
        COALESCE(SUM(peso_liquido), 0) AS peso_total,
        COALESCE(SUM(impureza_kg), 0) AS impureza_total,
        COALESCE(AVG(impureza_pct), 0) AS impureza_media,
        COUNT(*)::INT AS qtd_recebimentos
      FROM recebs
      GROUP BY material
    ),
    cliente_top AS (
      SELECT material, cliente_nome AS cliente_principal
      FROM (
        SELECT
          material,
          cliente_nome,
          ROW_NUMBER() OVER (
            PARTITION BY material
            ORDER BY SUM(peso_liquido) DESC, COUNT(*) DESC
          ) AS rn
        FROM recebs
        GROUP BY material, cliente_nome
      ) t
      WHERE rn = 1
    ),
    itens AS (
      SELECT a.material, a.peso_total, a.impureza_total, a.impureza_media,
             a.qtd_recebimentos, c.cliente_principal
      FROM agg_material a
      LEFT JOIN cliente_top c ON c.material = a.material
      ORDER BY a.peso_total DESC
    )
  SELECT json_build_object(
    'periodo', json_build_object('inicio', v_data_inicio, 'fim', v_data_fim),
    'itens', COALESCE((SELECT json_agg(row_to_json(i)) FROM itens i), '[]'::json),
    'metricas', json_build_object(
      'total_impureza', COALESCE((SELECT SUM(impureza_kg) FROM recebs), 0),
      'total_peso', COALESCE((SELECT SUM(peso_liquido) FROM recebs), 0),
      'pct_medio', COALESCE((SELECT AVG(impureza_pct) FROM recebs), 0),
      'materiais_afetados', (SELECT COUNT(*) FROM agg_material),
      'qtd_recebimentos', (SELECT COUNT(*) FROM recebs)
    )
  ) INTO v_resultado;

  RETURN v_resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION relatorio_impureza(INT, INT) TO authenticated;
