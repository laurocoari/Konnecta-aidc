-- Migration: Adicionar SKU interno Konnecta e códigos de fornecedor por produto
-- Data: 2025-11-12

-- 1. Criar sequência para gerar SKUs automáticos (iniciar no próximo número disponível)
CREATE SEQUENCE IF NOT EXISTS sku_sequence;

-- 2. Função para gerar SKU interno automático
CREATE OR REPLACE FUNCTION generate_sku_interno()
RETURNS TEXT AS $$
DECLARE
  next_sku TEXT;
BEGIN
  SELECT 'KONN-' || LPAD(nextval('sku_sequence')::TEXT, 6, '0') INTO next_sku;
  RETURN next_sku;
END;
$$ LANGUAGE plpgsql;

-- 3. Gerar SKUs para produtos existentes que não têm SKU (numerar sequencialmente)
DO $$
DECLARE
  prod RECORD;
  counter INTEGER := 1;
BEGIN
  -- Resetar sequência para começar do 1
  PERFORM setval('sku_sequence', 1, false);
  
  -- Gerar SKUs para todos os produtos existentes sem SKU
  FOR prod IN SELECT id FROM public.products WHERE sku_interno IS NULL ORDER BY created_at
  LOOP
    UPDATE public.products 
    SET sku_interno = 'KONN-' || LPAD(counter::TEXT, 6, '0')
    WHERE id = prod.id;
    counter := counter + 1;
  END LOOP;
  
  -- Ajustar sequência para continuar a partir do próximo número
  IF counter > 1 THEN
    PERFORM setval('sku_sequence', counter, false);
  END IF;
END $$;

-- 4. Adicionar campo sku_interno (sem DEFAULT ainda, será adicionado depois)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sku_interno TEXT;

-- 5. Criar função DEFAULT para gerar SKU automaticamente ao inserir
CREATE OR REPLACE FUNCTION get_next_sku()
RETURNS TEXT AS $$
BEGIN
  RETURN 'KONN-' || LPAD(nextval('sku_sequence')::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 6. Definir DEFAULT na coluna para gerar automaticamente
ALTER TABLE public.products
ALTER COLUMN sku_interno SET DEFAULT get_next_sku();

-- 7. Adicionar constraint UNIQUE após popular os dados (se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_sku_interno_unique'
  ) THEN
    ALTER TABLE public.products
    ADD CONSTRAINT products_sku_interno_unique UNIQUE (sku_interno);
  END IF;
END $$;

-- 8. Criar trigger para garantir SKU mesmo se não for fornecido
CREATE OR REPLACE FUNCTION ensure_sku_interno()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sku_interno IS NULL OR NEW.sku_interno = '' THEN
    NEW.sku_interno := get_next_sku();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_sku_interno ON public.products;
CREATE TRIGGER trigger_ensure_sku_interno
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION ensure_sku_interno();

-- 5. Criar tabela de códigos de fornecedor por produto
CREATE TABLE IF NOT EXISTS public.product_supplier_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  codigo_fornecedor TEXT NOT NULL,
  codigo_principal BOOLEAN DEFAULT false, -- Código do último fornecedor usado
  ultima_compra_id UUID, -- Referência ao purchase_order (será criada depois)
  ultima_compra_data TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, supplier_id, codigo_fornecedor)
);

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_product_supplier_codes_product ON public.product_supplier_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier_codes_supplier ON public.product_supplier_codes(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_supplier_codes_principal ON public.product_supplier_codes(product_id, codigo_principal) WHERE codigo_principal = true;

-- 7. Trigger para atualizar updated_at
CREATE TRIGGER update_product_supplier_codes_updated_at
  BEFORE UPDATE ON public.product_supplier_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Migrar códigos existentes para códigos de fornecedor
-- Criar entrada genérica para produtos existentes (se houver fornecedor padrão)
DO $$
DECLARE
  prod RECORD;
  default_supplier_id UUID;
BEGIN
  -- Pegar primeiro fornecedor ativo como padrão (ou NULL se não houver)
  SELECT id INTO default_supplier_id FROM public.suppliers WHERE status = 'ativo' LIMIT 1;
  
  -- Para cada produto, criar entrada de código de fornecedor
  IF default_supplier_id IS NOT NULL THEN
    FOR prod IN SELECT id, codigo FROM public.products WHERE codigo IS NOT NULL AND codigo != ''
    LOOP
      INSERT INTO public.product_supplier_codes (product_id, supplier_id, codigo_fornecedor, codigo_principal)
      VALUES (prod.id, default_supplier_id, prod.codigo, true)
      ON CONFLICT (product_id, supplier_id, codigo_fornecedor) DO NOTHING;
    END LOOP;
  END IF;
END $$;

-- 9. Adicionar campo codigo_fornecedor em purchase_order_items (se a tabela existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_order_items') THEN
    ALTER TABLE public.purchase_order_items
    ADD COLUMN IF NOT EXISTS codigo_fornecedor TEXT;
  END IF;
END $$;

-- 10. Criar função para atualizar código do fornecedor quando houver compra
-- Esta função será chamada quando um pedido de compra for recebido
CREATE OR REPLACE FUNCTION update_supplier_code_on_purchase()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando um pedido de compra é recebido (status = 'recebido')
  IF NEW.status = 'recebido' AND (OLD.status IS NULL OR OLD.status != 'recebido') THEN
    -- Primeiro, desmarcar todos os códigos principais dos produtos deste pedido
    UPDATE public.product_supplier_codes psc
    SET codigo_principal = false
    WHERE psc.product_id IN (
      SELECT product_id 
      FROM public.purchase_order_items 
      WHERE purchase_order_id = NEW.id
    );
    
    -- Criar/atualizar código do fornecedor do pedido
    INSERT INTO public.product_supplier_codes (
      product_id, 
      supplier_id, 
      codigo_fornecedor, 
      codigo_principal,
      ultima_compra_id,
      ultima_compra_data
    )
    SELECT 
      poi.product_id,
      NEW.supplier_id,
      COALESCE(poi.codigo_fornecedor, (SELECT codigo FROM public.products WHERE id = poi.product_id)),
      true,
      NEW.id,
      COALESCE(NEW.data_recebimento, now())
    FROM public.purchase_order_items poi
    WHERE poi.purchase_order_id = NEW.id
    ON CONFLICT (product_id, supplier_id, codigo_fornecedor) 
    DO UPDATE SET
      codigo_principal = true,
      ultima_compra_id = NEW.id,
      ultima_compra_data = COALESCE(NEW.data_recebimento, now()),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Criar trigger para atualizar códigos ao receber pedido (se purchase_orders existir)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') THEN
    -- Remover trigger se já existir
    DROP TRIGGER IF EXISTS trigger_update_supplier_code_on_purchase ON public.purchase_orders;
    
    -- Criar trigger
    CREATE TRIGGER trigger_update_supplier_code_on_purchase
      AFTER UPDATE ON public.purchase_orders
      FOR EACH ROW
      EXECUTE FUNCTION update_supplier_code_on_purchase();
  END IF;
END $$;

-- 12. Habilitar RLS na tabela product_supplier_codes
ALTER TABLE public.product_supplier_codes ENABLE ROW LEVEL SECURITY;

-- 13. Políticas RLS
DROP POLICY IF EXISTS "Admins and comercial can manage supplier codes" ON public.product_supplier_codes;
CREATE POLICY "Admins and comercial can manage supplier codes"
  ON public.product_supplier_codes FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

DROP POLICY IF EXISTS "Anyone can view supplier codes" ON public.product_supplier_codes;
CREATE POLICY "Anyone can view supplier codes"
  ON public.product_supplier_codes FOR SELECT
  USING (true);

-- 14. Criar view para facilitar consulta de código principal do fornecedor
CREATE OR REPLACE VIEW product_supplier_codes_principal AS
SELECT DISTINCT ON (product_id)
  product_id,
  supplier_id,
  codigo_fornecedor,
  ultima_compra_data
FROM public.product_supplier_codes
WHERE codigo_principal = true
ORDER BY product_id, ultima_compra_data DESC NULLS LAST;

-- Comentários
COMMENT ON COLUMN public.products.sku_interno IS 'SKU interno único da Konnecta (ex: KONN-000001)';
COMMENT ON COLUMN public.products.codigo IS 'Código do fornecedor (pode variar por fornecedor e ser atualizado conforme última compra)';
COMMENT ON TABLE public.product_supplier_codes IS 'Relaciona produtos com códigos de fornecedor, permitindo múltiplos códigos por produto';
COMMENT ON COLUMN public.product_supplier_codes.codigo_principal IS 'Indica o código do último fornecedor usado na compra';
COMMENT ON COLUMN public.product_supplier_codes.ultima_compra_id IS 'ID do pedido de compra que atualizou este código';
COMMENT ON COLUMN public.product_supplier_codes.ultima_compra_data IS 'Data da última compra que atualizou este código';

