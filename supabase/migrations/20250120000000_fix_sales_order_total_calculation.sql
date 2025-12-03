-- Migration: Corrigir cálculo de totais do pedido de venda
-- Data: 2025-01-20
-- Descrição: Corrige a função recalculate_sales_order_total para calcular corretamente
--            subtotal, desconto_total e total_geral baseado nos valores brutos dos itens

-- Corrigir função para recalcular total do pedido
CREATE OR REPLACE FUNCTION recalculate_sales_order_total(order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_subtotal NUMERIC(12,2);
  v_desconto_total NUMERIC(12,2);
  v_total_geral NUMERIC(12,2);
BEGIN
  -- Calcular subtotal bruto (sem desconto) e desconto total dos itens
  -- Subtotal = soma de (quantidade * preco_unitario)
  -- Desconto = soma de (quantidade * preco_unitario * desconto_percentual / 100)
  SELECT 
    COALESCE(SUM(quantidade * preco_unitario), 0),
    COALESCE(SUM(quantidade * preco_unitario * desconto_percentual / 100), 0)
  INTO v_subtotal, v_desconto_total
  FROM public.sales_order_items
  WHERE sales_order_id = order_id;

  -- Calcular total geral (subtotal - desconto)
  v_total_geral := v_subtotal - v_desconto_total;

  -- Atualizar pedido
  UPDATE public.sales_orders
  SET 
    subtotal = v_subtotal,
    desconto_total = v_desconto_total,
    total_geral = v_total_geral,
    updated_at = now()
  WHERE id = order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalcular todos os pedidos existentes para corrigir valores incorretos
DO $$
DECLARE
  v_order RECORD;
BEGIN
  FOR v_order IN 
    SELECT id FROM public.sales_orders
  LOOP
    PERFORM recalculate_sales_order_total(v_order.id);
  END LOOP;
END $$;

-- Comentário de documentação
COMMENT ON FUNCTION recalculate_sales_order_total(UUID) IS 
  'Recalcula os totais do pedido de venda baseado nos valores brutos dos itens (quantidade * preco_unitario) e desconto percentual aplicado';

