-- Migration: Atualizar estoque automaticamente nas movimentações
-- Data: 2025-11-12

-- 1. Adicionar campo updated_at em inventory se não existir
ALTER TABLE public.inventory
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_inventory_updated_at ON public.inventory;
CREATE TRIGGER trigger_update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- 3. Garantir constraint UNIQUE em inventory (product_id, warehouse_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'inventory_product_warehouse_unique'
  ) THEN
    ALTER TABLE public.inventory
    ADD CONSTRAINT inventory_product_warehouse_unique 
    UNIQUE (product_id, warehouse_id);
  END IF;
END $$;

-- 4. Função para atualizar estoque na tabela inventory
CREATE OR REPLACE FUNCTION update_inventory_on_movement()
RETURNS TRIGGER AS $$
DECLARE
  inv_product_id UUID;
  inv_warehouse_id UUID;
  current_qty INTEGER;
  origem_qty INTEGER;
BEGIN
  -- Buscar product_id e warehouse_id do inventory relacionado
  SELECT product_id, warehouse_id INTO inv_product_id, inv_warehouse_id
  FROM public.inventory
  WHERE id = NEW.inventory_id;

  -- Buscar quantidade atual
  SELECT quantidade INTO current_qty
  FROM public.inventory
  WHERE id = NEW.inventory_id;

  -- Atualizar estoque conforme tipo de movimentação
  IF NEW.tipo = 'entrada' THEN
    -- Entrada: adiciona quantidade
    UPDATE public.inventory
    SET quantidade = COALESCE(current_qty, 0) + NEW.quantidade,
        updated_at = now()
    WHERE id = NEW.inventory_id;

  ELSIF NEW.tipo = 'saida' THEN
    -- Saída: subtrai quantidade (não permite negativo)
    UPDATE public.inventory
    SET quantidade = GREATEST(COALESCE(current_qty, 0) - NEW.quantidade, 0),
        updated_at = now()
    WHERE id = NEW.inventory_id;

  ELSIF NEW.tipo = 'ajuste' THEN
    -- Ajuste: define quantidade diretamente (pode ser positivo ou negativo)
    -- Se quantidade for negativa, subtrai; se positiva, adiciona
    IF NEW.quantidade < 0 THEN
      UPDATE public.inventory
      SET quantidade = GREATEST(COALESCE(current_qty, 0) + NEW.quantidade, 0),
          updated_at = now()
      WHERE id = NEW.inventory_id;
    ELSE
      UPDATE public.inventory
      SET quantidade = COALESCE(current_qty, 0) + NEW.quantidade,
          updated_at = now()
      WHERE id = NEW.inventory_id;
    END IF;

  ELSIF NEW.tipo = 'transferencia' THEN
    -- Transferência: subtrai do depósito origem e adiciona no destino
    -- Buscar quantidade no depósito origem
    SELECT quantidade INTO origem_qty
    FROM public.inventory
    WHERE product_id = inv_product_id
      AND warehouse_id = NEW.origem_warehouse_id;

    -- Subtrair do depósito origem
    UPDATE public.inventory
    SET quantidade = GREATEST(COALESCE(origem_qty, 0) - NEW.quantidade, 0),
        updated_at = now()
    WHERE product_id = inv_product_id
      AND warehouse_id = NEW.origem_warehouse_id;

    -- Adicionar no depósito destino (criar se não existir)
    INSERT INTO public.inventory (product_id, warehouse_id, quantidade)
    VALUES (inv_product_id, NEW.destino_warehouse_id, NEW.quantidade)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET
      quantidade = inventory.quantidade + NEW.quantidade,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Criar trigger para atualizar inventory quando houver movimentação
DROP TRIGGER IF EXISTS trigger_update_inventory_on_movement ON public.stock_movements;
CREATE TRIGGER trigger_update_inventory_on_movement
  AFTER INSERT ON public.stock_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_on_movement();

-- 6. Função para atualizar estoque_atual na tabela products (soma de todos os depósitos)
CREATE OR REPLACE FUNCTION update_product_stock_total()
RETURNS TRIGGER AS $$
DECLARE
  total_stock INTEGER;
BEGIN
  -- Calcular estoque total do produto (soma de todos os depósitos)
  SELECT COALESCE(SUM(quantidade), 0) INTO total_stock
  FROM public.inventory
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id);

  -- Atualizar estoque_atual no produto
  UPDATE public.products
  SET estoque_atual = total_stock,
      updated_at = now()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Criar trigger para atualizar estoque total do produto quando inventory mudar
DROP TRIGGER IF EXISTS trigger_update_product_stock_total ON public.inventory;
CREATE TRIGGER trigger_update_product_stock_total
  AFTER INSERT OR UPDATE OR DELETE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_product_stock_total();

-- 8. Função para recalcular estoque total de todos os produtos (para produtos existentes)
CREATE OR REPLACE FUNCTION recalculate_all_product_stock()
RETURNS void AS $$
BEGIN
  UPDATE public.products p
  SET estoque_atual = COALESCE((
    SELECT SUM(quantidade)
    FROM public.inventory i
    WHERE i.product_id = p.id
  ), 0),
  updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Recalcular estoque de todos os produtos existentes
SELECT recalculate_all_product_stock();

-- Comentários
COMMENT ON FUNCTION update_inventory_on_movement() IS 'Atualiza automaticamente o estoque na tabela inventory quando há movimentação';
COMMENT ON FUNCTION update_product_stock_total() IS 'Atualiza estoque_atual do produto somando quantidades de todos os depósitos';
COMMENT ON FUNCTION recalculate_all_product_stock() IS 'Recalcula estoque total de todos os produtos';


