-- Criar tabela de marcas
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'inativa')),
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar coluna brand_id em products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL;

-- Criar tabela de relacionamento fornecedor-marca
CREATE TABLE IF NOT EXISTS public.supplier_brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, brand_id)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_products_brand_id ON public.products(brand_id);
CREATE INDEX IF NOT EXISTS idx_supplier_brands_supplier_id ON public.supplier_brands(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_brands_brand_id ON public.supplier_brands(brand_id);

-- Trigger para atualizar updated_at em brands
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para brands
CREATE POLICY "Anyone can view active brands"
  ON public.brands FOR SELECT
  USING (status = 'ativa');

CREATE POLICY "Admins can manage brands"
  ON public.brands FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Políticas RLS para supplier_brands
CREATE POLICY "Anyone can view supplier brands"
  ON public.supplier_brands FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage supplier brands"
  ON public.supplier_brands FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));