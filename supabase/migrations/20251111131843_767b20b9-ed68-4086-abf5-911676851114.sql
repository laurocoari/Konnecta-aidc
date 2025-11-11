-- Criar enum para tipos de contrato
CREATE TYPE contract_type AS ENUM ('locacao', 'venda', 'comodato', 'servico');

-- Criar enum para status de contrato
CREATE TYPE contract_status AS ENUM ('rascunho', 'em_analise', 'aprovado', 'assinado', 'ativo', 'encerrado', 'rescindido');

-- Criar enum para tipos de assinante
CREATE TYPE signer_type AS ENUM ('locador', 'locatario', 'testemunha');

-- Tabela de modelos de contrato
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  tipo contract_type NOT NULL,
  cabecalho_html TEXT,
  corpo_html TEXT NOT NULL,
  rodape_html TEXT,
  variaveis_disponiveis JSONB DEFAULT '{"cliente_nome": "Nome do cliente", "cliente_cnpj": "CNPJ do cliente", "cliente_endereco": "Endereço completo", "contrato_numero": "Número do contrato", "data_inicio": "Data de início", "data_fim": "Data de término", "valor_total": "Valor total", "valor_mensal": "Valor mensal"}'::jsonb,
  observacoes_internas TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de contratos gerados
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR(30) NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clients(id),
  modelo_id UUID REFERENCES public.contract_templates(id),
  proposta_id UUID REFERENCES public.proposals(id),
  oportunidade_id UUID REFERENCES public.opportunities(id),
  tipo contract_type NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_total NUMERIC(12,2) NOT NULL,
  valor_mensal NUMERIC(12,2),
  status contract_status NOT NULL DEFAULT 'rascunho',
  versao INTEGER NOT NULL DEFAULT 1,
  motivo_revisao TEXT,
  condicoes_comerciais JSONB,
  observacoes TEXT,
  pdf_url TEXT,
  link_publico TEXT,
  token_publico TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT contracts_numero_versao_key UNIQUE (numero, versao)
);

-- Tabela de itens do contrato (equipamentos/produtos)
CREATE TABLE public.contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  codigo TEXT,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  numero_serie TEXT,
  valor_unitario NUMERIC(12,2) NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de assinantes do contrato
CREATE TABLE public.contract_signers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  nome VARCHAR(120) NOT NULL,
  cargo VARCHAR(80),
  cpf_rg VARCHAR(40),
  email VARCHAR(120),
  tipo signer_type NOT NULL,
  assinatura_tipo TEXT CHECK (assinatura_tipo IN ('manual', 'digital', 'link')),
  assinatura_url TEXT,
  assinatura_data TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de anexos do contrato
CREATE TABLE public.contract_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  nome VARCHAR(100) NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  url TEXT NOT NULL,
  ordem INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para melhor performance
CREATE INDEX idx_contracts_cliente ON public.contracts(cliente_id);
CREATE INDEX idx_contracts_numero ON public.contracts(numero);
CREATE INDEX idx_contracts_status ON public.contracts(status);
CREATE INDEX idx_contracts_created_at ON public.contracts(created_at);
CREATE INDEX idx_contract_items_contract ON public.contract_items(contract_id);
CREATE INDEX idx_contract_signers_contract ON public.contract_signers(contract_id);

-- Trigger para updated_at em contract_templates
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para updated_at em contracts
CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para contract_templates
CREATE POLICY "Admins can view all templates"
  ON public.contract_templates FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

CREATE POLICY "Admins can create templates"
  ON public.contract_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update templates"
  ON public.contract_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete templates"
  ON public.contract_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Políticas RLS para contracts
CREATE POLICY "Admins and comercial can view all contracts"
  ON public.contracts FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial') OR has_role(auth.uid(), 'financeiro'));

CREATE POLICY "Admins and comercial can create contracts"
  ON public.contracts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

CREATE POLICY "Admins and comercial can update contracts"
  ON public.contracts FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

CREATE POLICY "Contratos públicos podem ser visualizados"
  ON public.contracts FOR SELECT
  USING (token_publico IS NOT NULL);

-- Políticas RLS para contract_items
CREATE POLICY "Users with contract access can view items"
  ON public.contract_items FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM public.contracts 
      WHERE has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'comercial')
        OR has_role(auth.uid(), 'financeiro')
        OR token_publico IS NOT NULL
    )
  );

CREATE POLICY "Admins and comercial can manage contract items"
  ON public.contract_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

-- Políticas RLS para contract_signers
CREATE POLICY "Users with contract access can view signers"
  ON public.contract_signers FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM public.contracts 
      WHERE has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'comercial')
        OR has_role(auth.uid(), 'financeiro')
        OR token_publico IS NOT NULL
    )
  );

CREATE POLICY "Admins and comercial can manage signers"
  ON public.contract_signers FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

-- Políticas RLS para contract_attachments
CREATE POLICY "Users with contract access can view attachments"
  ON public.contract_attachments FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM public.contracts 
      WHERE has_role(auth.uid(), 'admin') 
        OR has_role(auth.uid(), 'comercial')
        OR has_role(auth.uid(), 'financeiro')
        OR token_publico IS NOT NULL
    )
  );

CREATE POLICY "Admins and comercial can manage attachments"
  ON public.contract_attachments FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

-- Função para gerar número de contrato automaticamente
CREATE OR REPLACE FUNCTION public.generate_contract_number()
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
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 'KCON-\d{4}-(\d+)') AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.contracts
  WHERE numero LIKE 'KCON-' || year_part || '-%';
  
  new_number := 'KCON-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$;