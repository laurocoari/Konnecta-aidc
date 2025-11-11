-- Update products table with complete structure
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS unidade TEXT DEFAULT 'un',
ADD COLUMN IF NOT EXISTS localizacao TEXT,
ADD COLUMN IF NOT EXISTS ncm VARCHAR(20),
ADD COLUMN IF NOT EXISTS ean VARCHAR(20),
ADD COLUMN IF NOT EXISTS cfop VARCHAR(10),
ADD COLUMN IF NOT EXISTS cst VARCHAR(10),
ADD COLUMN IF NOT EXISTS origem VARCHAR(10),
ADD COLUMN IF NOT EXISTS icms DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS ipi DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS pis DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS cofins DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS observacoes_fiscais TEXT,
ADD COLUMN IF NOT EXISTS fornecedores_vinculados JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS custo_medio DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS margem_lucro DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS galeria JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ultima_compra TIMESTAMP WITH TIME ZONE;

-- Rename imagem_url to imagem_principal for clarity
ALTER TABLE public.products 
RENAME COLUMN imagem_url TO imagem_principal;

-- Create product_movements table for inventory tracking
CREATE TABLE IF NOT EXISTS public.product_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia')),
  quantidade INTEGER NOT NULL,
  origem TEXT,
  destino TEXT,
  observacao TEXT,
  valor_unitario DECIMAL(12,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for product_movements
ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_movements
CREATE POLICY "Admins can view all movements"
  ON public.product_movements
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Admins can create movements"
  ON public.product_movements
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Function to update custo_medio automatically
CREATE OR REPLACE FUNCTION update_custo_medio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tipo = 'entrada' AND NEW.valor_unitario IS NOT NULL THEN
    UPDATE public.products
    SET custo_medio = (
      COALESCE(custo_medio, 0) * COALESCE(estoque_atual, 0) + NEW.valor_unitario * NEW.quantidade
    ) / (COALESCE(estoque_atual, 0) + NEW.quantidade)
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to update custo_medio on movement
CREATE TRIGGER update_product_custo_medio
  AFTER INSERT ON public.product_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_custo_medio();

-- Function to check low stock and send alerts
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TABLE(
  product_id UUID,
  codigo TEXT,
  nome TEXT,
  estoque_atual INTEGER,
  estoque_minimo INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.codigo,
    p.nome,
    p.estoque_atual,
    p.estoque_minimo,
    CASE
      WHEN p.estoque_atual = 0 THEN 'em_falta'
      WHEN p.estoque_atual <= p.estoque_minimo THEN 'baixo'
      ELSE 'ok'
    END as status
  FROM public.products p
  WHERE p.status = 'ativo'
    AND (p.estoque_atual = 0 OR p.estoque_atual <= p.estoque_minimo)
  ORDER BY p.estoque_atual ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger for updated_at on product_movements
CREATE TRIGGER update_product_movements_updated_at
  BEFORE UPDATE ON public.product_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();