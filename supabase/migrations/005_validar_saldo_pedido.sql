-- ============================================================
-- Validação de saldo de pedido — Fase 13
-- ============================================================
-- Garante que NFs com pedido_id não ultrapassem o peso_total combinado.
-- BEFORE INSERT OR UPDATE em notas_fiscais.
-- Excluí a própria NF do somatório (pra UPDATE funcionar) e ignora
-- substituídas (substituida_em IS NOT NULL) — apenas dados ativos contam.

CREATE OR REPLACE FUNCTION fn_validar_saldo_pedido()
RETURNS TRIGGER AS $$
DECLARE
  v_peso_total DECIMAL;
  v_entregue DECIMAL;
  v_saldo DECIMAL;
  v_status status_pedido;
BEGIN
  IF NEW.pedido_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT peso_total, status INTO v_peso_total, v_status
  FROM pedidos WHERE id = NEW.pedido_id;

  IF v_peso_total IS NULL THEN
    RAISE EXCEPTION 'Pedido vinculado não encontrado';
  END IF;

  IF v_status = 'CONCLUIDO' THEN
    RAISE EXCEPTION 'Pedido já concluído — não aceita novas NFs';
  END IF;

  SELECT COALESCE(SUM(peso), 0) INTO v_entregue
  FROM notas_fiscais
  WHERE pedido_id = NEW.pedido_id
    AND id != NEW.id
    AND substituida_em IS NULL;

  v_saldo := v_peso_total - v_entregue;

  IF NEW.peso > v_saldo THEN
    RAISE EXCEPTION 'Peso (% kg) ultrapassa saldo do pedido (% kg disponíveis)',
      NEW.peso, v_saldo
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validar_saldo_pedido
  BEFORE INSERT OR UPDATE ON notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION fn_validar_saldo_pedido();
