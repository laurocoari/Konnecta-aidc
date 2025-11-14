-- Migration: Numerar SKUs internos dos produtos existentes
-- Data: 2025-11-12

-- 1. Garantir que a sequência existe
CREATE SEQUENCE IF NOT EXISTS sku_sequence;

-- 2. Resetar sequência para começar do 1
SELECT setval('sku_sequence', 1, false);

-- 3. Numerar todos os produtos existentes que não têm SKU interno
-- Ordenar por created_at para manter ordem cronológica
DO $$
DECLARE
  prod RECORD;
  counter INTEGER := 1;
  total_products INTEGER;
BEGIN
  -- Contar produtos sem SKU
  SELECT COUNT(*) INTO total_products
  FROM public.products
  WHERE sku_interno IS NULL OR sku_interno = '';
  
  -- Se não houver produtos sem SKU, verificar se há produtos sem SKU válido
  IF total_products = 0 THEN
    SELECT COUNT(*) INTO total_products
    FROM public.products
    WHERE sku_interno IS NULL OR sku_interno = '' OR sku_interno NOT LIKE 'KONN-%';
  END IF;
  
  -- Se ainda não houver, numerar todos os produtos para garantir consistência
  IF total_products = 0 THEN
    -- Verificar qual é o maior número já usado
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku_interno FROM 'KONN-(\d+)') AS INTEGER)), 0) INTO counter
    FROM public.products
    WHERE sku_interno LIKE 'KONN-%';
    
    counter := counter + 1;
    
    -- Numerar todos os produtos que não têm SKU válido
    FOR prod IN 
      SELECT id, created_at 
      FROM public.products 
      WHERE sku_interno IS NULL 
         OR sku_interno = '' 
         OR sku_interno NOT LIKE 'KONN-%'
      ORDER BY created_at ASC
    LOOP
      UPDATE public.products 
      SET sku_interno = 'KONN-' || LPAD(counter::TEXT, 6, '0')
      WHERE id = prod.id;
      counter := counter + 1;
    END LOOP;
  ELSE
    -- Numerar produtos sem SKU
    FOR prod IN 
      SELECT id, created_at 
      FROM public.products 
      WHERE sku_interno IS NULL OR sku_interno = ''
      ORDER BY created_at ASC
    LOOP
      UPDATE public.products 
      SET sku_interno = 'KONN-' || LPAD(counter::TEXT, 6, '0')
      WHERE id = prod.id;
      counter := counter + 1;
    END LOOP;
  END IF;
  
  -- Ajustar sequência para continuar a partir do próximo número
  IF counter > 1 THEN
    PERFORM setval('sku_sequence', counter, false);
  END IF;
  
  RAISE NOTICE 'SKUs numerados: % produtos processados', counter - 1;
END $$;

-- 4. Verificar se há duplicatas e corrigir se necessário
DO $$
DECLARE
  dup RECORD;
  counter INTEGER;
BEGIN
  -- Encontrar duplicatas
  FOR dup IN
    SELECT sku_interno, COUNT(*) as count, array_agg(id ORDER BY created_at) as ids
    FROM public.products
    WHERE sku_interno IS NOT NULL AND sku_interno != ''
    GROUP BY sku_interno
    HAVING COUNT(*) > 1
  LOOP
    -- Pegar o próximo número disponível
    SELECT COALESCE(MAX(CAST(SUBSTRING(sku_interno FROM 'KONN-(\d+)') AS INTEGER)), 0) + 1 INTO counter
    FROM public.products
    WHERE sku_interno LIKE 'KONN-%';
    
    -- Renumerar produtos duplicados (manter o primeiro, renumerar os outros)
    FOR i IN 2..array_length(dup.ids, 1) LOOP
      UPDATE public.products
      SET sku_interno = 'KONN-' || LPAD(counter::TEXT, 6, '0')
      WHERE id = dup.ids[i];
      counter := counter + 1;
    END LOOP;
  END LOOP;
  
  -- Ajustar sequência após corrigir duplicatas
  IF counter IS NOT NULL THEN
    PERFORM setval('sku_sequence', counter, false);
  END IF;
END $$;

-- 5. Garantir que todos os produtos têm SKU válido
UPDATE public.products
SET sku_interno = 'KONN-' || LPAD(nextval('sku_sequence')::TEXT, 6, '0')
WHERE sku_interno IS NULL OR sku_interno = '' OR sku_interno NOT LIKE 'KONN-%';

-- 6. Verificar resultado final
DO $$
DECLARE
  total INTEGER;
  sem_sku INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM public.products;
  SELECT COUNT(*) INTO sem_sku FROM public.products WHERE sku_interno IS NULL OR sku_interno = '';
  
  RAISE NOTICE 'Total de produtos: %', total;
  RAISE NOTICE 'Produtos sem SKU: %', sem_sku;
  
  IF sem_sku > 0 THEN
    RAISE WARNING 'Ainda existem % produtos sem SKU!', sem_sku;
  ELSE
    RAISE NOTICE 'Todos os produtos têm SKU interno!';
  END IF;
END $$;


