-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  contato_principal TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index on CNPJ for faster lookups
CREATE INDEX idx_suppliers_cnpj ON public.suppliers(cnpj);

-- Create index on status
CREATE INDEX idx_suppliers_status ON public.suppliers(status);

-- Add foreign key constraint to supplier_brands table
ALTER TABLE public.supplier_brands
ADD CONSTRAINT fk_supplier_brands_supplier
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;

ALTER TABLE public.supplier_brands
ADD CONSTRAINT fk_supplier_brands_brand
FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers
CREATE POLICY "Admins can manage suppliers"
  ON public.suppliers
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Anyone can view active suppliers"
  ON public.suppliers
  FOR SELECT
  USING (status = 'ativo');