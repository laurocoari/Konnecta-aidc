-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'locacao', 'ambos')),
  imagem_url TEXT,
  valor_venda NUMERIC,
  valor_locacao NUMERIC,
  estoque INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create partner_proposals table
CREATE TABLE IF NOT EXISTS public.partner_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partners(id),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id),
  client_id UUID NOT NULL REFERENCES public.clients(id),
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'cotada', 'enviada', 'convertida')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_proposals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for products
CREATE POLICY "Anyone can view active products"
  ON public.products
  FOR SELECT
  USING (status = 'ativo');

CREATE POLICY "Admins can manage products"
  ON public.products
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

-- RLS Policies for partner_proposals
CREATE POLICY "Partners can view their own proposals"
  ON public.partner_proposals
  FOR SELECT
  USING (partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Partners can create proposals"
  ON public.partner_proposals
  FOR INSERT
  WITH CHECK (partner_id IN (
    SELECT id FROM public.partners WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins and comercial can view all proposals"
  ON public.partner_proposals
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

CREATE POLICY "Admins and comercial can update proposals"
  ON public.partner_proposals
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_partner_proposals_updated_at
  BEFORE UPDATE ON public.partner_proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample products
INSERT INTO public.products (codigo, nome, descricao, categoria, tipo, imagem_url, valor_venda, valor_locacao, estoque) VALUES
  ('PROD-001', 'Computador Dell Optiplex', 'Computador desktop empresarial Dell Optiplex com processador Intel Core i5, 8GB RAM, 256GB SSD', 'Hardware', 'ambos', 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400', 2500.00, 150.00, 50),
  ('PROD-002', 'Monitor LG 24"', 'Monitor LED Full HD 24 polegadas LG com entrada HDMI e VGA', 'Hardware', 'ambos', 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', 800.00, 50.00, 100),
  ('PROD-003', 'Impressora HP LaserJet', 'Impressora multifuncional HP LaserJet Pro com scanner e copiadora', 'Hardware', 'ambos', 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', 1200.00, 80.00, 30),
  ('PROD-004', 'Notebook Lenovo ThinkPad', 'Notebook empresarial Lenovo ThinkPad Intel Core i7, 16GB RAM, 512GB SSD', 'Hardware', 'ambos', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 4500.00, 250.00, 25),
  ('PROD-005', 'Sistema ERP Konnecta', 'Sistema de gestão empresarial integrado com módulos financeiro, estoque e vendas', 'Software', 'venda', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400', 15000.00, NULL, 999)
ON CONFLICT (codigo) DO NOTHING;