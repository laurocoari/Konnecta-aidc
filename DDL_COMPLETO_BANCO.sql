-- =====================================================================
-- DDL COMPLETO - BANCO DE DADOS KONNECTA ERP
-- Atualizado em: 2026-03-01
-- Compatível com: PostgreSQL 15+ / Supabase
-- Inclui todas as 47 tabelas do sistema
-- =====================================================================

-- =====================================================================
-- 1. EXTENSÕES
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- =====================================================================
-- 2. DEFINIÇÕES DE TIPOS (ENUMs)
-- =====================================================================

CREATE TYPE public.contract_status AS ENUM (
  'rascunho', 'em_analise', 'aprovado', 'assinado', 'ativo', 'encerrado', 'rescindido'
);

CREATE TYPE public.contract_type AS ENUM (
  'locacao', 'venda', 'comodato', 'servico'
);

CREATE TYPE public.exclusivity_status AS ENUM (
  'ativa', 'expirada', 'suspensa'
);

CREATE TYPE public.opportunity_status AS ENUM (
  'em_analise', 'aprovada', 'em_negociacao', 'convertida', 'perdida', 'devolvida'
);

CREATE TYPE public.signer_type AS ENUM (
  'locador', 'locatario', 'testemunha'
);

CREATE TYPE public.tipo_disponibilidade AS ENUM (
  'venda', 'locacao', 'ambos'
);

CREATE TYPE public.tipo_operacao AS ENUM (
  'venda_direta', 'venda_agenciada', 'locacao_direta', 'locacao_agenciada'
);

CREATE TYPE public.user_role AS ENUM (
  'admin', 'comercial', 'revendedor', 'financeiro'
);

-- =====================================================================
-- 3. ESTRUTURA DE TABELAS (ordem respeitando dependências de FK)
-- =====================================================================

-- ----- profiles (depende de auth.users) -----
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'revendedor'::user_role,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ----- user_roles (depende de auth.users) -----
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ----- brands -----
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'ativa'::text,
  observacoes TEXT,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT brands_nome_key UNIQUE (nome)
);

-- ----- suppliers -----
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  contato_principal TEXT,
  email TEXT,
  telefone TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativo'::text,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- supplier_brands (depende de suppliers, brands) -----
CREATE TABLE public.supplier_brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL,
  brand_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fk_supplier_brands_supplier FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE,
  CONSTRAINT fk_supplier_brands_brand FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE
);

-- ----- partners (depende de auth.users) -----
CREATE TABLE public.partners (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  comissao_percentual NUMERIC NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'ativo'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partners_cnpj_key UNIQUE (cnpj),
  CONSTRAINT partners_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ----- clients (depende de partners) -----
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  ie TEXT,
  contato_principal TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  cep TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente'::text,
  observacoes TEXT,
  origin_partner_id UUID,
  exclusive_partner_id UUID,
  exclusivity_expires_at TIMESTAMPTZ,
  exclusivity_status public.exclusivity_status DEFAULT 'expirada'::exclusivity_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clients_cnpj_key UNIQUE (cnpj),
  CONSTRAINT clients_origin_partner_id_fkey FOREIGN KEY (origin_partner_id) REFERENCES public.partners(id),
  CONSTRAINT clients_exclusive_partner_id_fkey FOREIGN KEY (exclusive_partner_id) REFERENCES public.partners(id)
);

-- ----- products (depende de brands) -----
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT NOT NULL,
  tipo TEXT NOT NULL,
  imagem_principal TEXT,
  status TEXT NOT NULL DEFAULT 'ativo'::text,
  unidade TEXT DEFAULT 'un'::text,
  localizacao TEXT,
  valor_venda NUMERIC,
  valor_locacao NUMERIC,
  estoque_atual INTEGER DEFAULT 0,
  estoque_minimo INTEGER DEFAULT 0,
  custo_medio NUMERIC,
  margem_lucro NUMERIC,
  margem_lucro_venda NUMERIC DEFAULT 0,
  vida_util_meses INTEGER DEFAULT 36,
  permite_agenciamento BOOLEAN DEFAULT false,
  comissao_agenciamento_padrao NUMERIC DEFAULT 0,
  tipo_disponibilidade public.tipo_disponibilidade DEFAULT 'venda'::tipo_disponibilidade,
  fornecedores_vinculados JSONB DEFAULT '[]'::jsonb,
  galeria JSONB DEFAULT '[]'::jsonb,
  especificacoes JSONB DEFAULT '[]'::jsonb,
  videos JSONB DEFAULT '[]'::jsonb,
  ultima_compra TIMESTAMPTZ,
  brand_id UUID,
  ncm VARCHAR,
  ean VARCHAR,
  cfop VARCHAR,
  cst VARCHAR,
  origem VARCHAR,
  icms NUMERIC,
  ipi NUMERIC,
  pis NUMERIC,
  cofins NUMERIC,
  observacoes_fiscais TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_codigo_key UNIQUE (codigo),
  CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);

-- ----- product_movements (depende de products, auth.users) -----
CREATE TABLE public.product_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  quantidade INTEGER NOT NULL,
  valor_unitario NUMERIC,
  origem TEXT,
  destino TEXT,
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT product_movements_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- ----- opportunities (depende de partners, clients, auth.users) -----
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  partner_id UUID NOT NULL,
  client_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  tipo_oportunidade TEXT NOT NULL,
  valor_estimado NUMERIC,
  status public.opportunity_status NOT NULL DEFAULT 'em_analise'::opportunity_status,
  observacoes TEXT,
  feedback_comercial TEXT,
  data_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_validade_exclusividade TIMESTAMPTZ,
  is_exclusive BOOLEAN NOT NULL DEFAULT true,
  anexos JSONB DEFAULT '[]'::jsonb,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id) ON DELETE CASCADE,
  CONSTRAINT opportunities_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE,
  CONSTRAINT opportunities_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id)
);

-- ----- partner_proposals (depende de partners, opportunities, clients) -----
CREATE TABLE public.partner_proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL,
  opportunity_id UUID NOT NULL,
  client_id UUID NOT NULL,
  products JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  pdf_url TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT partner_proposals_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(id),
  CONSTRAINT partner_proposals_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id),
  CONSTRAINT partner_proposals_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id)
);

-- ----- proposal_templates -----
CREATE TABLE public.proposal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  tipo TEXT NOT NULL,
  cabecalho_html TEXT,
  rodape_html TEXT,
  condicoes_comerciais TEXT,
  observacoes_internas TEXT,
  logotipo_secundario TEXT,
  estrutura_tabela JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ativo'::text,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- proposals (depende de clients, proposal_templates, opportunities) -----
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  cliente_id UUID NOT NULL,
  vendedor_id UUID NOT NULL,
  oportunidade_id UUID,
  modelo_id UUID,
  data_proposta DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE NOT NULL,
  tipo_operacao public.tipo_operacao DEFAULT 'venda_direta'::tipo_operacao,
  introducao TEXT,
  condicoes_comerciais JSONB DEFAULT '{}'::jsonb,
  total_itens NUMERIC NOT NULL DEFAULT 0,
  desconto_total NUMERIC DEFAULT 0,
  despesas_adicionais NUMERIC DEFAULT 0,
  total_geral NUMERIC NOT NULL DEFAULT 0,
  custo_total NUMERIC DEFAULT 0,
  lucro_total NUMERIC DEFAULT 0,
  margem_percentual_total NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho'::text,
  motivo_revisao TEXT,
  observacoes_internas TEXT,
  link_publico TEXT,
  token_publico TEXT,
  pdf_url TEXT,
  aprovado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proposals_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clients(id),
  CONSTRAINT proposals_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES public.proposal_templates(id),
  CONSTRAINT proposals_oportunidade_id_fkey FOREIGN KEY (oportunidade_id) REFERENCES public.opportunities(id)
);

-- ----- proposal_items (depende de proposals, products, suppliers) -----
CREATE TABLE public.proposal_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL,
  product_id UUID,
  descricao TEXT NOT NULL,
  codigo TEXT,
  unidade TEXT DEFAULT 'un'::text,
  imagem_url TEXT,
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC NOT NULL,
  desconto NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  margem NUMERIC,
  estoque INTEGER,
  fornecedor_id UUID,
  custo_unitario NUMERIC DEFAULT 0,
  valor_unitario NUMERIC DEFAULT 0,
  comissao_percentual NUMERIC,
  periodo_locacao_meses INTEGER,
  lucro_subtotal NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proposal_items_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE,
  CONSTRAINT proposal_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT proposal_items_fornecedor_id_fkey FOREIGN KEY (fornecedor_id) REFERENCES public.suppliers(id)
);

-- ----- contract_templates (depende de auth.users) -----
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  tipo public.contract_type NOT NULL,
  cabecalho_html TEXT,
  corpo_html TEXT NOT NULL,
  rodape_html TEXT,
  observacoes_internas TEXT,
  variaveis_disponiveis JSONB DEFAULT '{"data_fim": "Data de término", "data_inicio": "Data de início", "valor_total": "Valor total", "cliente_cnpj": "CNPJ do cliente", "cliente_nome": "Nome do cliente", "valor_mensal": "Valor mensal", "contrato_numero": "Número do contrato", "cliente_endereco": "Endereço completo"}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ativo'::text,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contract_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- ----- contracts (depende de clients, contract_templates, proposals, opportunities, auth.users) -----
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero VARCHAR NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  cliente_id UUID NOT NULL,
  modelo_id UUID,
  proposta_id UUID,
  oportunidade_id UUID,
  tipo public.contract_type NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  valor_total NUMERIC NOT NULL,
  valor_mensal NUMERIC,
  status public.contract_status NOT NULL DEFAULT 'rascunho'::contract_status,
  condicoes_comerciais JSONB,
  motivo_revisao TEXT,
  observacoes TEXT,
  pdf_url TEXT,
  link_publico TEXT,
  token_publico TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contracts_numero_versao_key UNIQUE (numero, versao),
  CONSTRAINT contracts_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.clients(id),
  CONSTRAINT contracts_modelo_id_fkey FOREIGN KEY (modelo_id) REFERENCES public.contract_templates(id),
  CONSTRAINT contracts_proposta_id_fkey FOREIGN KEY (proposta_id) REFERENCES public.proposals(id),
  CONSTRAINT contracts_oportunidade_id_fkey FOREIGN KEY (oportunidade_id) REFERENCES public.opportunities(id),
  CONSTRAINT contracts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- ----- contract_items (depende de contracts, products) -----
CREATE TABLE public.contract_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL,
  product_id UUID,
  descricao TEXT NOT NULL,
  codigo TEXT,
  numero_serie TEXT,
  observacoes TEXT,
  quantidade INTEGER NOT NULL,
  valor_unitario NUMERIC NOT NULL,
  valor_total NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contract_items_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE,
  CONSTRAINT contract_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ----- contract_signers (depende de contracts) -----
CREATE TABLE public.contract_signers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL,
  tipo public.signer_type NOT NULL,
  nome VARCHAR NOT NULL,
  cargo VARCHAR,
  cpf_rg VARCHAR,
  email VARCHAR,
  assinatura_tipo TEXT,
  assinatura_url TEXT,
  assinatura_data TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contract_signers_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE
);

-- ----- contract_attachments (depende de contracts) -----
CREATE TABLE public.contract_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  url TEXT NOT NULL,
  ordem INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT contract_attachments_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE
);

-- ----- roi_simulations (depende de proposals, auth.users) -----
CREATE TABLE public.roi_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID,
  nome_simulacao TEXT,
  investimento_total NUMERIC NOT NULL,
  custo_operacional_mensal NUMERIC NOT NULL,
  retorno_mensal NUMERIC NOT NULL,
  prazo_roi_meses INTEGER NOT NULL,
  duracao_contrato_meses INTEGER NOT NULL,
  lucro_mensal_estimado NUMERIC NOT NULL,
  lucro_apos_roi NUMERIC NOT NULL,
  lucro_total_contrato NUMERIC NOT NULL,
  rentabilidade_percentual NUMERIC NOT NULL,
  observacoes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT roi_simulations_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id)
);

-- =====================================================================
-- 4. INDEXES (além dos PKs e UNIQUEs já criados)
-- =====================================================================

CREATE INDEX idx_clients_cnpj ON public.clients USING btree (cnpj);
CREATE INDEX idx_clients_exclusive_partner ON public.clients USING btree (exclusive_partner_id);
CREATE INDEX idx_partners_cnpj ON public.partners USING btree (cnpj);
CREATE INDEX idx_partners_user_id ON public.partners USING btree (user_id);
CREATE INDEX idx_products_brand_id ON public.products USING btree (brand_id);
CREATE INDEX idx_products_tipo_disponibilidade ON public.products USING btree (tipo_disponibilidade);
CREATE INDEX idx_proposal_items_proposal ON public.proposal_items USING btree (proposal_id);
CREATE INDEX idx_proposal_items_product ON public.proposal_items USING btree (product_id);
CREATE INDEX idx_proposal_items_fornecedor ON public.proposal_items USING btree (fornecedor_id);
CREATE INDEX idx_proposal_templates_status ON public.proposal_templates USING btree (status);
CREATE INDEX idx_proposals_cliente ON public.proposals USING btree (cliente_id);
CREATE INDEX idx_proposals_status ON public.proposals USING btree (status);
CREATE INDEX idx_proposals_codigo ON public.proposals USING btree (codigo);
CREATE INDEX idx_contracts_cliente ON public.contracts USING btree (cliente_id);
CREATE INDEX idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX idx_contracts_numero ON public.contracts USING btree (numero);
CREATE INDEX idx_contracts_created_at ON public.contracts USING btree (created_at);
CREATE INDEX idx_contract_items_contract ON public.contract_items USING btree (contract_id);
CREATE INDEX idx_contract_signers_contract ON public.contract_signers USING btree (contract_id);
CREATE INDEX idx_opportunities_partner ON public.opportunities USING btree (partner_id);
CREATE INDEX idx_opportunities_client ON public.opportunities USING btree (client_id);
CREATE INDEX idx_opportunities_status ON public.opportunities USING btree (status);

-- =====================================================================
-- 5. FUNCTIONS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.generate_proposal_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.check_client_exclusivity(p_cnpj TEXT)
RETURNS TABLE(
  client_exists BOOLEAN,
  client_id UUID,
  partner_id UUID,
  partner_name TEXT,
  exclusivity_expires_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (c.id IS NOT NULL) as client_exists,
    c.id as client_id,
    c.exclusive_partner_id as partner_id,
    p.nome_fantasia as partner_name,
    c.exclusivity_expires_at,
    (c.exclusivity_status = 'ativa' AND c.exclusivity_expires_at > now()) as is_active
  FROM public.clients c
  LEFT JOIN public.partners p ON p.id = c.exclusive_partner_id
  WHERE c.cnpj = p_cnpj
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_client_exclusivity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.clients
    SET 
      exclusive_partner_id = NEW.partner_id,
      exclusivity_expires_at = NEW.data_validade_exclusividade,
      exclusivity_status = 'ativa'
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_custo_medio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TABLE(
  product_id UUID,
  codigo TEXT,
  nome TEXT,
  estoque_atual INTEGER,
  estoque_minimo INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'revendedor')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'revendedor')
  );
  RETURN NEW;
END;
$$;

-- =====================================================================
-- 6. TRIGGERS
-- =====================================================================

-- Trigger de novo usuário (em auth.users - executar no contexto Supabase)
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at triggers
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposal_templates_updated_at BEFORE UPDATE ON public.proposal_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_partner_proposals_updated_at BEFORE UPDATE ON public.partner_proposals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_movements_updated_at BEFORE UPDATE ON public.product_movements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Business logic triggers
CREATE TRIGGER update_client_exclusivity_trigger AFTER INSERT ON public.opportunities FOR EACH ROW EXECUTE FUNCTION update_client_exclusivity();
CREATE TRIGGER update_product_custo_medio AFTER INSERT ON public.product_movements FOR EACH ROW EXECUTE FUNCTION update_custo_medio();

-- =====================================================================
-- 7. ROW LEVEL SECURITY - Habilitação
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roi_simulations ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 8. RLS POLICIES
-- =====================================================================

-- ----- profiles -----
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ----- user_roles -----
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only system can insert roles" ON public.user_roles FOR INSERT WITH CHECK (false);

-- ----- brands -----
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active brands" ON public.brands FOR SELECT USING (status = 'ativa'::text);

-- ----- suppliers -----
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active suppliers" ON public.suppliers FOR SELECT USING (status = 'ativo'::text);

-- ----- supplier_brands -----
CREATE POLICY "Admins can manage supplier brands" ON public.supplier_brands FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view supplier brands" ON public.supplier_brands FOR SELECT USING (true);

-- ----- partners -----
CREATE POLICY "Admins and comercial can view all partners" ON public.partners FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can view their own data" ON public.partners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Partners can update their own data" ON public.partners FOR UPDATE USING (user_id = auth.uid());

-- ----- clients -----
CREATE POLICY "Admins and comercial can view all clients" ON public.clients FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Partners can create clients" ON public.clients FOR INSERT WITH CHECK (origin_partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can view their own clients" ON public.clients FOR SELECT USING ((origin_partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid())) OR (exclusive_partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid())));

-- ----- products -----
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'ativo'::text);

-- ----- product_movements -----
CREATE POLICY "Admins can create movements" ON public.product_movements FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can view all movements" ON public.product_movements FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- ----- opportunities -----
CREATE POLICY "Admins and comercial can view all opportunities" ON public.opportunities FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update all opportunities" ON public.opportunities FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can create opportunities" ON public.opportunities FOR INSERT WITH CHECK (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can update their own opportunities" ON public.opportunities FOR UPDATE USING (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can view their own opportunities" ON public.opportunities FOR SELECT USING (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));

-- ----- partner_proposals -----
CREATE POLICY "Admins and comercial can view all proposals" ON public.partner_proposals FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update proposals" ON public.partner_proposals FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can create proposals" ON public.partner_proposals FOR INSERT WITH CHECK (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can view their own proposals" ON public.partner_proposals FOR SELECT USING (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));

-- ----- proposal_templates -----
CREATE POLICY "Admins and comercial can view all templates" ON public.proposal_templates FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins can create templates" ON public.proposal_templates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update templates" ON public.proposal_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete templates" ON public.proposal_templates FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

-- ----- proposals -----
CREATE POLICY "Admins and comercial can view all proposals" ON public.proposals FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can create proposals" ON public.proposals FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update proposals" ON public.proposals FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can view proposals for their opportunities" ON public.proposals FOR SELECT USING (oportunidade_id IN (SELECT opportunities.id FROM opportunities WHERE opportunities.partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid())));
CREATE POLICY "Propostas com token podem ser visualizadas publicamente" ON public.proposals FOR SELECT TO anon USING (token_publico IS NOT NULL);

-- ----- proposal_items -----
CREATE POLICY "Admins and comercial can manage proposal items" ON public.proposal_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with proposal access can view items" ON public.proposal_items FOR SELECT USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR (proposals.oportunidade_id IN (SELECT opportunities.id FROM opportunities WHERE (opportunities.partner_id IN (SELECT partners.id FROM partners WHERE (partners.user_id = auth.uid()))))))));
CREATE POLICY "Itens de propostas públicas podem ser visualizados" ON public.proposal_items FOR SELECT TO anon USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE proposals.token_publico IS NOT NULL));

-- ----- contract_templates -----
CREATE POLICY "Admins can view all templates" ON public.contract_templates FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins can create templates" ON public.contract_templates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update templates" ON public.contract_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete templates" ON public.contract_templates FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

-- ----- contracts -----
CREATE POLICY "Admins and comercial can view all contracts" ON public.contracts FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Admins and comercial can create contracts" ON public.contracts FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update contracts" ON public.contracts FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Contratos públicos podem ser visualizados" ON public.contracts FOR SELECT USING (token_publico IS NOT NULL);

-- ----- contract_items -----
CREATE POLICY "Admins and comercial can manage contract items" ON public.contract_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with contract access can view items" ON public.contract_items FOR SELECT USING (contract_id IN (SELECT contracts.id FROM contracts WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role) OR (contracts.token_publico IS NOT NULL))));

-- ----- contract_signers -----
CREATE POLICY "Admins and comercial can manage signers" ON public.contract_signers FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with contract access can view signers" ON public.contract_signers FOR SELECT USING (contract_id IN (SELECT contracts.id FROM contracts WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role) OR (contracts.token_publico IS NOT NULL))));

-- ----- contract_attachments -----
CREATE POLICY "Admins and comercial can manage attachments" ON public.contract_attachments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with contract access can view attachments" ON public.contract_attachments FOR SELECT USING (contract_id IN (SELECT contracts.id FROM contracts WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role) OR (contracts.token_publico IS NOT NULL))));

-- ----- roi_simulations -----
CREATE POLICY "Admins and comercial can view all simulations" ON public.roi_simulations FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can create simulations" ON public.roi_simulations FOR INSERT WITH CHECK ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) AND (auth.uid() = created_by));
CREATE POLICY "Admins can delete simulations" ON public.roi_simulations FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Partners can create own simulations" ON public.roi_simulations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Partners can view own simulations" ON public.roi_simulations FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can delete own simulations" ON public.roi_simulations FOR DELETE USING (created_by = auth.uid());
CREATE POLICY "Users can update own simulations" ON public.roi_simulations FOR UPDATE USING (created_by = auth.uid());

-- =====================================================================
-- TABELAS ADICIONAIS (criadas em 2026-03-01)
-- =====================================================================

-- ----- categories -----
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'ativa'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- contacts (CRM) -----
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  empresa TEXT,
  tipo TEXT NOT NULL DEFAULT 'lead'::text,
  origem TEXT,
  etapa_funil TEXT NOT NULL DEFAULT 'novo'::text,
  observacoes TEXT,
  responsavel_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- opportunities_crm (depende de contacts) -----
CREATE TABLE public.opportunities_crm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  contact_id UUID,
  valor_estimado NUMERIC,
  probabilidade INTEGER DEFAULT 50,
  etapa TEXT NOT NULL DEFAULT 'proposta'::text,
  status TEXT NOT NULL DEFAULT 'ativa'::text,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT opportunities_crm_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);

-- ----- openai_config -----
CREATE TABLE public.openai_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_encrypted TEXT,
  model TEXT DEFAULT 'gpt-4o-mini'::text,
  max_tokens INTEGER DEFAULT 2000,
  enabled BOOLEAN DEFAULT false,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- quote_settings -----
CREATE TABLE public.quote_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valor_dolar_atual NUMERIC DEFAULT 5.0,
  margem_padrao NUMERIC DEFAULT 30,
  prazo_validade_dias INTEGER DEFAULT 30,
  observacoes TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- purchase_orders (depende de suppliers) -----
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID,
  status TEXT NOT NULL DEFAULT 'rascunho'::text,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  total_geral NUMERIC DEFAULT 0,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

-- ----- purchase_order_items (depende de purchase_orders, products) -----
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL,
  product_id UUID,
  codigo_fornecedor TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT poi_po_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  CONSTRAINT poi_product_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ----- product_supplier_codes (depende de products, suppliers) -----
CREATE TABLE public.product_supplier_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  codigo_fornecedor TEXT NOT NULL,
  codigo_principal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT psc_product_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE,
  CONSTRAINT psc_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE
);

-- ----- bank_accounts -----
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  tipo TEXT DEFAULT 'corrente'::text,
  descricao TEXT,
  saldo_atual NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo'::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- bank_transactions (depende de bank_accounts) -----
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  data_movimento TIMESTAMPTZ NOT NULL DEFAULT now(),
  descricao TEXT,
  categoria TEXT,
  referencia_tipo TEXT,
  referencia_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bt_bank_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE
);

-- ----- accounts_receivable (depende de contacts) -----
CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID,
  descricao TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC DEFAULT 0,
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente'::text,
  observacoes TEXT,
  origem TEXT DEFAULT 'manual'::text,
  referencia_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ar_contact_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id)
);

-- ----- accounts_receivable_payments (depende de accounts_receivable) -----
CREATE TABLE public.accounts_receivable_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_receivable_id UUID NOT NULL,
  valor NUMERIC NOT NULL,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT,
  observacoes TEXT,
  bank_account_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT arp_ar_fkey FOREIGN KEY (account_receivable_id) REFERENCES public.accounts_receivable(id) ON DELETE CASCADE
);

-- ----- accounts_payable (depende de suppliers) -----
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID,
  descricao TEXT,
  categoria TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_pago NUMERIC DEFAULT 0,
  data_emissao DATE DEFAULT CURRENT_DATE,
  data_vencimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente'::text,
  observacoes TEXT,
  origem TEXT DEFAULT 'manual'::text,
  referencia_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ap_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id)
);

-- ----- accounts_payable_payments (depende de accounts_payable) -----
CREATE TABLE public.accounts_payable_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_payable_id UUID NOT NULL,
  valor NUMERIC NOT NULL,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento TEXT,
  observacoes TEXT,
  bank_account_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT app_ap_fkey FOREIGN KEY (account_payable_id) REFERENCES public.accounts_payable(id) ON DELETE CASCADE
);

-- ----- commissions (depende de proposals) -----
CREATE TABLE public.commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id UUID,
  proposta_id UUID,
  sales_order_id UUID,
  valor_base NUMERIC DEFAULT 0,
  percentual NUMERIC DEFAULT 0,
  valor_comissao NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'::text,
  observacoes TEXT,
  accounts_payable_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT commissions_proposta_fkey FOREIGN KEY (proposta_id) REFERENCES public.proposals(id)
);

-- ----- commission_rules -----
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  percentual NUMERIC NOT NULL DEFAULT 0,
  tipo_operacao TEXT,
  categoria_produto TEXT,
  vendedor_id UUID,
  ativo BOOLEAN DEFAULT true,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- sales_orders (depende de clients, proposals) -----
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido TEXT NOT NULL,
  cliente_id UUID,
  proposta_id UUID,
  vendedor_id UUID,
  status TEXT NOT NULL DEFAULT 'pendente'::text,
  data_pedido DATE DEFAULT CURRENT_DATE,
  data_entrega DATE,
  valor_total NUMERIC DEFAULT 0,
  desconto_total NUMERIC DEFAULT 0,
  total_geral NUMERIC DEFAULT 0,
  forma_pagamento TEXT,
  condicoes_pagamento TEXT,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT so_cliente_fkey FOREIGN KEY (cliente_id) REFERENCES public.clients(id),
  CONSTRAINT so_proposta_fkey FOREIGN KEY (proposta_id) REFERENCES public.proposals(id)
);

-- ----- sales_order_items (depende de sales_orders, products) -----
CREATE TABLE public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL,
  product_id UUID,
  descricao TEXT NOT NULL,
  codigo TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT soi_so_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  CONSTRAINT soi_product_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ----- sales_order_logs (depende de sales_orders) -----
CREATE TABLE public.sales_order_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  descricao TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sol_so_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE
);

-- ----- cotacoes_compras (depende de suppliers, clients) -----
CREATE TABLE public.cotacoes_compras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cotacao TEXT,
  supplier_id UUID,
  cliente_final_id UUID,
  nome_cliente_final TEXT,
  cidade_cliente_final TEXT,
  estado_cliente_final TEXT,
  tipo_cotacao TEXT,
  moeda TEXT DEFAULT 'BRL'::text,
  distribuidor TEXT,
  proposta_numero TEXT,
  data_cotacao DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE,
  total_cotacao NUMERIC DEFAULT 0,
  quantidade_itens INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente'::text,
  observacoes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cc_supplier_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id),
  CONSTRAINT cc_cliente_fkey FOREIGN KEY (cliente_final_id) REFERENCES public.clients(id)
);

-- ----- cotacoes_compras_itens (depende de cotacoes_compras, products) -----
CREATE TABLE public.cotacoes_compras_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id UUID NOT NULL,
  product_id UUID,
  codigo_produto TEXT,
  descricao TEXT,
  quantidade NUMERIC,
  preco_unitario NUMERIC,
  desconto NUMERIC DEFAULT 0,
  total NUMERIC,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cci_cotacao_fkey FOREIGN KEY (cotacao_id) REFERENCES public.cotacoes_compras(id) ON DELETE CASCADE,
  CONSTRAINT cci_product_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ----- warehouses -----
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  responsavel TEXT,
  status TEXT NOT NULL DEFAULT 'ativo'::text,
  observacoes TEXT,
  token_publico TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- tasks -----
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  prioridade TEXT DEFAULT 'media'::text,
  status TEXT NOT NULL DEFAULT 'pendente'::text,
  categoria TEXT,
  data_vencimento DATE,
  responsavel_id UUID,
  referencia_tipo TEXT,
  referencia_id UUID,
  concluido_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- tickets -----
CREATE TABLE public.tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  prioridade TEXT DEFAULT 'media'::text,
  status TEXT NOT NULL DEFAULT 'aberto'::text,
  cliente_id UUID,
  responsavel_id UUID,
  resolvido_em TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- ticket_comments (depende de tickets) -----
CREATE TABLE public.ticket_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tc_ticket_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE
);

-- ----- rental_receipts -----
CREATE TABLE public.rental_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_recibo TEXT NOT NULL,
  cliente_id UUID,
  account_receivable_id UUID,
  proposta_id UUID,
  sales_order_id UUID,
  data_emissao DATE DEFAULT CURRENT_DATE,
  periodo_inicio DATE,
  periodo_fim DATE,
  valor_total NUMERIC DEFAULT 0,
  bank_account_id UUID,
  observacoes TEXT,
  pdf_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----- rental_receipt_items (depende de rental_receipts, products) -----
CREATE TABLE public.rental_receipt_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_receipt_id UUID NOT NULL,
  descricao TEXT NOT NULL,
  product_id UUID,
  quantidade INTEGER DEFAULT 1,
  valor_unitario NUMERIC DEFAULT 0,
  valor_total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT rri_receipt_fkey FOREIGN KEY (rental_receipt_id) REFERENCES public.rental_receipts(id) ON DELETE CASCADE,
  CONSTRAINT rri_product_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- =====================================================================
-- INDEXES ADICIONAIS (tabelas novas)
-- =====================================================================

CREATE INDEX idx_contacts_tipo ON public.contacts USING btree (tipo);
CREATE INDEX idx_contacts_etapa ON public.contacts USING btree (etapa_funil);
CREATE INDEX idx_opportunities_crm_contact ON public.opportunities_crm USING btree (contact_id);
CREATE INDEX idx_opportunities_crm_etapa ON public.opportunities_crm USING btree (etapa);
CREATE INDEX idx_purchase_orders_supplier ON public.purchase_orders USING btree (supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);
CREATE INDEX idx_purchase_order_items_po ON public.purchase_order_items USING btree (purchase_order_id);
CREATE INDEX idx_product_supplier_codes_product ON public.product_supplier_codes USING btree (product_id);
CREATE INDEX idx_product_supplier_codes_supplier ON public.product_supplier_codes USING btree (supplier_id);
CREATE INDEX idx_bank_transactions_bank ON public.bank_transactions USING btree (bank_account_id);
CREATE INDEX idx_accounts_receivable_status ON public.accounts_receivable USING btree (status);
CREATE INDEX idx_accounts_receivable_contact ON public.accounts_receivable USING btree (contact_id);
CREATE INDEX idx_accounts_payable_status ON public.accounts_payable USING btree (status);
CREATE INDEX idx_accounts_payable_supplier ON public.accounts_payable USING btree (supplier_id);
CREATE INDEX idx_commissions_vendedor ON public.commissions USING btree (vendedor_id);
CREATE INDEX idx_commissions_proposta ON public.commissions USING btree (proposta_id);
CREATE INDEX idx_sales_orders_cliente ON public.sales_orders USING btree (cliente_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (status);
CREATE INDEX idx_sales_order_items_so ON public.sales_order_items USING btree (sales_order_id);
CREATE INDEX idx_cotacoes_compras_supplier ON public.cotacoes_compras USING btree (supplier_id);
CREATE INDEX idx_cotacoes_compras_status ON public.cotacoes_compras USING btree (status);
CREATE INDEX idx_cotacoes_itens_cotacao ON public.cotacoes_compras_itens USING btree (cotacao_id);
CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);
CREATE INDEX idx_tasks_responsavel ON public.tasks USING btree (responsavel_id);
CREATE INDEX idx_tickets_status ON public.tickets USING btree (status);
CREATE INDEX idx_ticket_comments_ticket ON public.ticket_comments USING btree (ticket_id);
CREATE INDEX idx_rental_receipts_cliente ON public.rental_receipts USING btree (cliente_id);

-- =====================================================================
-- TRIGGERS ADICIONAIS (tabelas novas)
-- =====================================================================

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_opportunities_crm_updated_at BEFORE UPDATE ON public.opportunities_crm FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_openai_config_updated_at BEFORE UPDATE ON public.openai_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_settings_updated_at BEFORE UPDATE ON public.quote_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cotacoes_compras_updated_at BEFORE UPDATE ON public.cotacoes_compras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rental_receipts_updated_at BEFORE UPDATE ON public.rental_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- RLS HABILITAÇÃO (tabelas novas)
-- =====================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_supplier_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes_compras_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_receipt_items ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- RLS POLICIES (tabelas novas)
-- =====================================================================

-- ----- categories -----
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view categories" ON public.categories FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- contacts -----
CREATE POLICY "Admins and comercial can manage contacts" ON public.contacts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ----- opportunities_crm -----
CREATE POLICY "Admins and comercial can manage opportunities_crm" ON public.opportunities_crm FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ----- openai_config -----
CREATE POLICY "Admins can manage openai_config" ON public.openai_config FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- ----- quote_settings -----
CREATE POLICY "Admins can manage quote_settings" ON public.quote_settings FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view quote_settings" ON public.quote_settings FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- purchase_orders -----
CREATE POLICY "Admins can manage purchase_orders" ON public.purchase_orders FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view purchase_orders" ON public.purchase_orders FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- purchase_order_items -----
CREATE POLICY "Admins can manage purchase_order_items" ON public.purchase_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view purchase_order_items" ON public.purchase_order_items FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- product_supplier_codes -----
CREATE POLICY "Admins can manage product_supplier_codes" ON public.product_supplier_codes FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view product_supplier_codes" ON public.product_supplier_codes FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- bank_accounts -----
CREATE POLICY "Admins and financeiro can manage bank_accounts" ON public.bank_accounts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ----- bank_transactions -----
CREATE POLICY "Admins and financeiro can manage bank_transactions" ON public.bank_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ----- accounts_receivable -----
CREATE POLICY "Admins and financeiro can manage AR" ON public.accounts_receivable FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view AR" ON public.accounts_receivable FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- accounts_receivable_payments -----
CREATE POLICY "Admins and financeiro can manage AR payments" ON public.accounts_receivable_payments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ----- accounts_payable -----
CREATE POLICY "Admins and financeiro can manage AP" ON public.accounts_payable FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view AP" ON public.accounts_payable FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- accounts_payable_payments -----
CREATE POLICY "Admins and financeiro can manage AP payments" ON public.accounts_payable_payments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ----- commissions -----
CREATE POLICY "Admins and financeiro can manage commissions" ON public.commissions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view commissions" ON public.commissions FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- commission_rules -----
CREATE POLICY "Admins can manage commission_rules" ON public.commission_rules FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial and financeiro can view commission_rules" ON public.commission_rules FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ----- sales_orders -----
CREATE POLICY "Admins and comercial can manage sales_orders" ON public.sales_orders FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Financeiro can view sales_orders" ON public.sales_orders FOR SELECT USING (has_role(auth.uid(), 'financeiro'::user_role));

-- ----- sales_order_items -----
CREATE POLICY "Admins and comercial can manage sales_order_items" ON public.sales_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ----- sales_order_logs -----
CREATE POLICY "Admins and comercial can manage sales_order_logs" ON public.sales_order_logs FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ----- cotacoes_compras -----
CREATE POLICY "Admins and comercial can manage cotacoes_compras" ON public.cotacoes_compras FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ----- cotacoes_compras_itens -----
CREATE POLICY "Admins and comercial can manage cotacoes_itens" ON public.cotacoes_compras_itens FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ----- warehouses -----
CREATE POLICY "Admins can manage warehouses" ON public.warehouses FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active warehouses" ON public.warehouses FOR SELECT USING (status = 'ativo'::text);
CREATE POLICY "Public access via token" ON public.warehouses FOR SELECT USING (token_publico IS NOT NULL);

-- ----- tasks -----
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING ((auth.uid() = responsavel_id) OR (auth.uid() = created_by));

-- ----- tickets -----
CREATE POLICY "Admins can manage all tickets" ON public.tickets FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can manage own tickets" ON public.tickets FOR ALL USING ((auth.uid() = responsavel_id) OR (auth.uid() = created_by));

-- ----- ticket_comments -----
CREATE POLICY "Admins can manage all ticket_comments" ON public.ticket_comments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can manage own ticket_comments" ON public.ticket_comments FOR ALL USING (auth.uid() = created_by);

-- ----- rental_receipts -----
CREATE POLICY "Admins and financeiro can manage rental_receipts" ON public.rental_receipts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view rental_receipts" ON public.rental_receipts FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ----- rental_receipt_items -----
CREATE POLICY "Admins and financeiro can manage rental_receipt_items" ON public.rental_receipt_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- =====================================================================
-- 9. STORAGE BUCKETS (Supabase-specific)
-- =====================================================================

-- INSERT INTO storage.buckets (id, name, public) VALUES ('propostas', 'propostas', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true);

-- =====================================================================
-- FIM DO DDL - 47 tabelas completas
-- =====================================================================
