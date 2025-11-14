-- Criar tabela para dados da empresa (locador)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL UNIQUE,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  cep TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  inscricao_estadual TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para recibos de locação
CREATE TABLE IF NOT EXISTS public.rental_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_recibo TEXT NOT NULL UNIQUE,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  periodo_locacao_inicio DATE,
  periodo_locacao_fim DATE,
  numero_contrato TEXT,
  
  -- Relacionamentos
  cliente_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  proposta_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  
  -- Valores
  total_geral NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_extenso TEXT,
  observacoes TEXT,
  
  -- Dados bancários (opcional - referência à conta bancária)
  bank_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  
  -- PDF e links
  pdf_url TEXT,
  link_publico TEXT,
  token_publico TEXT,
  
  -- Metadados
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para itens do recibo de locação
CREATE TABLE IF NOT EXISTS public.rental_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_receipt_id UUID NOT NULL REFERENCES public.rental_receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  item TEXT NOT NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL DEFAULT 1,
  valor_unitario NUMERIC(12,2) NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar campos faltantes em bank_accounts
ALTER TABLE public.bank_accounts
ADD COLUMN IF NOT EXISTS razao_social_favorecido TEXT,
ADD COLUMN IF NOT EXISTS cnpj_favorecido TEXT,
ADD COLUMN IF NOT EXISTS chave_pix TEXT;

-- Criar índices
CREATE INDEX idx_rental_receipts_cliente ON public.rental_receipts(cliente_id);
CREATE INDEX idx_rental_receipts_numero ON public.rental_receipts(numero_recibo);
CREATE INDEX idx_rental_receipts_data_emissao ON public.rental_receipts(data_emissao);
CREATE INDEX idx_rental_receipt_items_receipt ON public.rental_receipt_items(rental_receipt_id);

-- Função para gerar número de recibo sequencial
CREATE OR REPLACE FUNCTION public.generate_rental_receipt_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_part TEXT;
  seq_num INTEGER;
  new_number TEXT;
BEGIN
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero_recibo FROM 'REC-' || year_part || '-(\d+)') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.rental_receipts
  WHERE numero_recibo LIKE 'REC-' || year_part || '-%';
  
  new_number := 'REC-' || year_part || '-' || LPAD(seq_num::TEXT, 6, '0');
  
  RETURN new_number;
END;
$$;

-- Trigger para updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rental_receipts_updated_at
  BEFORE UPDATE ON public.rental_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_receipt_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para company_settings
CREATE POLICY "Admins can manage company settings"
  ON public.company_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Anyone can view company settings"
  ON public.company_settings
  FOR SELECT
  USING (true);

-- Políticas RLS para rental_receipts
CREATE POLICY "Admins and financeiro can view all receipts"
  ON public.rental_receipts
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role)
  );

CREATE POLICY "Admins and financeiro can create receipts"
  ON public.rental_receipts
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role)
  );

CREATE POLICY "Admins and financeiro can update receipts"
  ON public.rental_receipts
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role)
  );

CREATE POLICY "Public receipts can be viewed with token"
  ON public.rental_receipts
  FOR SELECT
  USING (token_publico IS NOT NULL);

-- Políticas RLS para rental_receipt_items
CREATE POLICY "Users with receipt access can view items"
  ON public.rental_receipt_items
  FOR SELECT
  USING (
    rental_receipt_id IN (
      SELECT id FROM public.rental_receipts 
      WHERE has_role(auth.uid(), 'admin'::user_role) 
        OR has_role(auth.uid(), 'financeiro'::user_role)
        OR has_role(auth.uid(), 'comercial'::user_role)
        OR token_publico IS NOT NULL
    )
  );

CREATE POLICY "Admins and financeiro can manage receipt items"
  ON public.rental_receipt_items
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role)
  );

