-- ============================================================================
-- BACKUP COMPLETO DA ESTRUTURA DO BANCO DE DADOS
-- Sistema ERP/CRM Bling - Gerado em 2026-03-01
-- PostgreSQL 15+ compatível
-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute este script em um banco PostgreSQL 15+ limpo
-- 2. Certifique-se de ter a extensão pgcrypto e uuid-ossp habilitadas
-- 3. Crie o schema auth com tabela auth.users se não usar Supabase
-- 4. Ajuste as policies RLS conforme necessidade do ambiente
-- ============================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TIPOS ENUM CUSTOMIZADOS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin', 'comercial', 'revendedor', 'financeiro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_status AS ENUM ('rascunho', 'em_analise', 'aprovado', 'assinado', 'ativo', 'encerrado', 'rescindido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.contract_type AS ENUM ('locacao', 'venda', 'comodato', 'servico');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.exclusivity_status AS ENUM ('ativa', 'expirada', 'suspensa');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.opportunity_status AS ENUM ('em_analise', 'aprovada', 'em_negociacao', 'convertida', 'perdida', 'devolvida');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.signer_type AS ENUM ('locador', 'locatario', 'testemunha');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_disponibilidade AS ENUM ('venda', 'locacao', 'ambos');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.tipo_operacao AS ENUM ('venda_direta', 'venda_agenciada', 'locacao_direta', 'locacao_agenciada');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.generate_proposal_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_client_exclusivity(p_cnpj text)
RETURNS TABLE(client_exists boolean, client_id uuid, partner_id uuid, partner_name text, exclusivity_expires_at timestamp with time zone, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_client_exclusivity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.update_custo_medio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS TABLE(product_id uuid, codigo text, nome text, estoque_atual integer, estoque_minimo integer, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
$function$;

-- ============================================================================
-- TABELAS
-- ============================================================================

-- ==================== PROFILES ====================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  full_name text NOT NULL,
  phone text,
  role public.user_role NOT NULL DEFAULT 'revendedor'::user_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== USER_ROLES ====================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.user_role NOT NULL DEFAULT 'revendedor'::user_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- ==================== PARTNERS ====================
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome_fantasia text NOT NULL,
  razao_social text NOT NULL,
  cnpj text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  cidade text NOT NULL,
  estado text NOT NULL,
  comissao_percentual numeric NOT NULL DEFAULT 10.00,
  status text NOT NULL DEFAULT 'ativo'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== CLIENTS ====================
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  nome text NOT NULL,
  cnpj text NOT NULL UNIQUE,
  ie text,
  contato_principal text NOT NULL,
  email text NOT NULL,
  telefone text NOT NULL,
  endereco text NOT NULL,
  cidade text NOT NULL,
  estado text NOT NULL,
  cep text NOT NULL,
  tipo text NOT NULL DEFAULT 'cliente'::text,
  observacoes text,
  origin_partner_id uuid REFERENCES public.partners(id),
  exclusive_partner_id uuid REFERENCES public.partners(id),
  exclusivity_expires_at timestamptz,
  exclusivity_status public.exclusivity_status DEFAULT 'expirada'::exclusivity_status,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== BRANDS ====================
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome varchar NOT NULL UNIQUE,
  descricao text,
  logo_url text,
  status text NOT NULL DEFAULT 'ativa'::text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== CATEGORIES ====================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'ativa'::text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== SUPPLIERS ====================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cnpj text NOT NULL,
  contato_principal text,
  email text,
  telefone text,
  endereco text,
  cidade text,
  estado text,
  cep text,
  categoria text,
  status text NOT NULL DEFAULT 'ativo'::text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== SUPPLIER_BRANDS ====================
CREATE TABLE IF NOT EXISTS public.supplier_brands (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  brand_id uuid NOT NULL REFERENCES public.brands(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(supplier_id, brand_id)
);

-- ==================== PRODUCTS ====================
CREATE TABLE IF NOT EXISTS public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  codigo text NOT NULL,
  categoria text NOT NULL,
  tipo text NOT NULL,
  descricao text,
  brand_id uuid REFERENCES public.brands(id),
  valor_venda numeric,
  valor_locacao numeric,
  custo_medio numeric,
  margem_lucro numeric,
  margem_lucro_venda numeric,
  estoque_atual integer DEFAULT 0,
  estoque_minimo integer DEFAULT 0,
  localizacao text,
  unidade text,
  ean text,
  ncm text,
  cfop text,
  cst text,
  origem text,
  icms numeric,
  ipi numeric,
  pis numeric,
  cofins numeric,
  observacoes_fiscais text,
  imagem_principal text,
  galeria jsonb,
  videos jsonb,
  especificacoes jsonb,
  fornecedores_vinculados jsonb,
  ultima_compra text,
  vida_util_meses integer,
  permite_agenciamento boolean DEFAULT false,
  comissao_agenciamento_padrao numeric,
  tipo_disponibilidade public.tipo_disponibilidade,
  status text NOT NULL DEFAULT 'ativo'::text,
  sku_interno text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PRODUCT_SUPPLIER_CODES ====================
CREATE TABLE IF NOT EXISTS public.product_supplier_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id),
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
  codigo_fornecedor text NOT NULL,
  codigo_principal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PRODUCT_MOVEMENTS ====================
CREATE TABLE IF NOT EXISTS public.product_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id),
  tipo text NOT NULL,
  quantidade integer NOT NULL,
  valor_unitario numeric,
  origem text,
  destino text,
  observacao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== WAREHOUSES ====================
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  endereco text,
  cidade text,
  estado text,
  cep text,
  responsavel text,
  status text NOT NULL DEFAULT 'ativo'::text,
  observacoes text,
  token_publico text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== CONTACTS ====================
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  tipo text NOT NULL DEFAULT 'lead'::text,
  origem text,
  etapa_funil text NOT NULL DEFAULT 'novo'::text,
  observacoes text,
  responsavel_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== OPPORTUNITIES ====================
CREATE TABLE IF NOT EXISTS public.opportunities (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  product_name text NOT NULL,
  tipo_oportunidade text NOT NULL,
  valor_estimado numeric,
  status public.opportunity_status NOT NULL DEFAULT 'em_analise'::opportunity_status,
  observacoes text,
  feedback_comercial text,
  is_exclusive boolean NOT NULL DEFAULT true,
  data_registro timestamptz NOT NULL DEFAULT now(),
  data_validade_exclusividade timestamptz,
  anexos jsonb DEFAULT '[]'::jsonb,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== OPPORTUNITIES_CRM ====================
CREATE TABLE IF NOT EXISTS public.opportunities_crm (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  contact_id uuid REFERENCES public.contacts(id),
  etapa text NOT NULL DEFAULT 'proposta'::text,
  valor_estimado numeric,
  probabilidade integer DEFAULT 50,
  status text NOT NULL DEFAULT 'ativa'::text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PROPOSAL_TEMPLATES ====================
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo text NOT NULL,
  cabecalho_html text,
  rodape_html text,
  condicoes_comerciais text,
  estrutura_tabela jsonb,
  logotipo_secundario text,
  observacoes_internas text,
  status text NOT NULL DEFAULT 'ativo'::text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PROPOSALS ====================
CREATE TABLE IF NOT EXISTS public.proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clients(id),
  vendedor_id uuid NOT NULL,
  oportunidade_id uuid REFERENCES public.opportunities(id),
  modelo_id uuid REFERENCES public.proposal_templates(id),
  tipo_operacao public.tipo_operacao,
  data_proposta date NOT NULL DEFAULT CURRENT_DATE,
  validade text NOT NULL,
  total_itens numeric NOT NULL DEFAULT 0,
  total_geral numeric NOT NULL DEFAULT 0,
  custo_total numeric DEFAULT 0,
  lucro_total numeric DEFAULT 0,
  desconto_total numeric DEFAULT 0,
  margem_percentual_total numeric DEFAULT 0,
  despesas_adicionais numeric DEFAULT 0,
  introducao text,
  condicoes_comerciais jsonb,
  observacoes_internas text,
  status text NOT NULL DEFAULT 'rascunho'::text,
  versao integer NOT NULL DEFAULT 1,
  motivo_revisao text,
  token_publico text,
  link_publico text,
  pdf_url text,
  aprovado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PROPOSAL_ITEMS ====================
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id),
  product_id uuid REFERENCES public.products(id),
  fornecedor_id uuid REFERENCES public.suppliers(id),
  descricao text NOT NULL,
  codigo text,
  quantidade integer NOT NULL,
  preco_unitario numeric NOT NULL,
  custo_unitario numeric DEFAULT 0,
  valor_unitario numeric DEFAULT 0,
  desconto numeric DEFAULT 0,
  total numeric NOT NULL,
  margem numeric,
  estoque integer,
  comissao_percentual numeric,
  periodo_locacao_meses integer,
  lucro_subtotal numeric DEFAULT 0,
  unidade text DEFAULT 'un'::text,
  imagem_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PARTNER_PROPOSALS ====================
CREATE TABLE IF NOT EXISTS public.partner_proposals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.partners(id),
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id),
  client_id uuid NOT NULL REFERENCES public.clients(id),
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  pdf_url text,
  status text NOT NULL DEFAULT 'aguardando'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== CONTRACT_TEMPLATES ====================
CREATE TABLE IF NOT EXISTS public.contract_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo public.contract_type NOT NULL,
  cabecalho_html text,
  corpo_html text NOT NULL,
  rodape_html text,
  observacoes_internas text,
  variaveis_disponiveis jsonb,
  status text NOT NULL DEFAULT 'ativo'::text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== CONTRACTS ====================
CREATE TABLE IF NOT EXISTS public.contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero varchar NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clients(id),
  modelo_id uuid REFERENCES public.contract_templates(id),
  proposta_id uuid REFERENCES public.proposals(id),
  oportunidade_id uuid REFERENCES public.opportunities(id),
  tipo public.contract_type NOT NULL,
  data_inicio date NOT NULL,
  data_fim date,
  valor_total numeric NOT NULL,
  valor_mensal numeric,
  status public.contract_status NOT NULL DEFAULT 'rascunho'::contract_status,
  versao integer NOT NULL DEFAULT 1,
  condicoes_comerciais jsonb,
  motivo_revisao text,
  observacoes text,
  pdf_url text,
  link_publico text,
  token_publico text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(numero, versao)
);

-- ==================== CONTRACT_ITEMS ====================
CREATE TABLE IF NOT EXISTS public.contract_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  product_id uuid REFERENCES public.products(id),
  descricao text NOT NULL,
  codigo text,
  numero_serie text,
  quantidade integer NOT NULL,
  valor_unitario numeric NOT NULL,
  valor_total numeric NOT NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== CONTRACT_SIGNERS ====================
CREATE TABLE IF NOT EXISTS public.contract_signers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  nome varchar NOT NULL,
  tipo public.signer_type NOT NULL,
  cargo varchar,
  cpf_rg varchar,
  email varchar,
  assinatura_tipo text,
  assinatura_url text,
  assinatura_data timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== CONTRACT_ATTACHMENTS ====================
CREATE TABLE IF NOT EXISTS public.contract_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id uuid NOT NULL REFERENCES public.contracts(id),
  nome varchar NOT NULL,
  tipo text NOT NULL,
  url text NOT NULL,
  descricao text,
  ordem integer DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== SALES_ORDERS ====================
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido text NOT NULL,
  cliente_id uuid REFERENCES public.clients(id),
  proposta_id uuid REFERENCES public.proposals(id),
  vendedor_id uuid,
  data_pedido date DEFAULT CURRENT_DATE,
  data_entrega date,
  valor_total numeric DEFAULT 0,
  desconto_total numeric DEFAULT 0,
  total_geral numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'::text,
  forma_pagamento text,
  condicoes_pagamento text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== SALES_ORDER_ITEMS ====================
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id),
  product_id uuid REFERENCES public.products(id),
  descricao text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  desconto numeric DEFAULT 0,
  total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== SALES_ORDER_LOGS ====================
CREATE TABLE IF NOT EXISTS public.sales_order_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id),
  tipo text NOT NULL,
  descricao text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PURCHASE_ORDERS ====================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES public.suppliers(id),
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista date,
  status text NOT NULL DEFAULT 'rascunho'::text,
  total_geral numeric DEFAULT 0,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== PURCHASE_ORDER_ITEMS ====================
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id),
  product_id uuid REFERENCES public.products(id),
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  desconto_percentual numeric DEFAULT 0,
  codigo_fornecedor text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== COTACOES_COMPRAS ====================
CREATE TABLE IF NOT EXISTS public.cotacoes_compras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES public.suppliers(id),
  cliente_final_id uuid REFERENCES public.clients(id),
  numero_cotacao text,
  data_cotacao date NOT NULL DEFAULT CURRENT_DATE,
  validade text,
  status text NOT NULL DEFAULT 'pendente'::text,
  moeda text DEFAULT 'BRL'::text,
  distribuidor text,
  proposta_numero text,
  tipo_cotacao text,
  nome_cliente_final text,
  cidade_cliente_final text,
  estado_cliente_final text,
  total_cotacao numeric DEFAULT 0,
  quantidade_itens integer DEFAULT 0,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== COTACOES_COMPRAS_ITENS ====================
CREATE TABLE IF NOT EXISTS public.cotacoes_compras_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes_compras(id),
  product_id uuid REFERENCES public.products(id),
  codigo_produto text,
  descricao text,
  quantidade numeric,
  preco_unitario numeric,
  desconto numeric DEFAULT 0,
  total numeric,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== BANK_ACCOUNTS ====================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_banco text NOT NULL,
  agencia text,
  conta text,
  tipo text DEFAULT 'corrente'::text,
  descricao text,
  saldo_atual numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo'::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== BANK_TRANSACTIONS ====================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  tipo text NOT NULL,
  valor numeric NOT NULL,
  descricao text,
  categoria text,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  referencia_tipo text,
  referencia_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== ACCOUNTS_PAYABLE ====================
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES public.suppliers(id),
  descricao text,
  categoria text,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_pago numeric DEFAULT 0,
  data_emissao date DEFAULT CURRENT_DATE,
  data_vencimento date,
  status text NOT NULL DEFAULT 'pendente'::text,
  observacoes text,
  origem text DEFAULT 'manual'::text,
  referencia_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== ACCOUNTS_PAYABLE_PAYMENTS ====================
CREATE TABLE IF NOT EXISTS public.accounts_payable_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_payable_id uuid NOT NULL REFERENCES public.accounts_payable(id),
  valor numeric NOT NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento text,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== ACCOUNTS_RECEIVABLE ====================
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id),
  descricao text,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_pago numeric DEFAULT 0,
  data_emissao date DEFAULT CURRENT_DATE,
  data_vencimento date,
  status text NOT NULL DEFAULT 'pendente'::text,
  observacoes text,
  origem text DEFAULT 'manual'::text,
  referencia_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== ACCOUNTS_RECEIVABLE_PAYMENTS ====================
CREATE TABLE IF NOT EXISTS public.accounts_receivable_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_receivable_id uuid NOT NULL REFERENCES public.accounts_receivable(id),
  valor numeric NOT NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento text,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== COMMISSIONS ====================
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id uuid,
  proposta_id uuid REFERENCES public.proposals(id),
  sales_order_id uuid REFERENCES public.sales_orders(id),
  valor_base numeric DEFAULT 0,
  percentual numeric DEFAULT 0,
  valor_comissao numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente'::text,
  observacoes text,
  accounts_payable_id uuid REFERENCES public.accounts_payable(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== COMMISSION_RULES ====================
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  percentual numeric NOT NULL DEFAULT 0,
  tipo_operacao text,
  categoria_produto text,
  vendedor_id uuid,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== RENTAL_RECEIPTS ====================
CREATE TABLE IF NOT EXISTS public.rental_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_recibo text NOT NULL,
  cliente_id uuid,
  account_receivable_id uuid,
  proposta_id uuid,
  sales_order_id uuid,
  data_emissao date DEFAULT CURRENT_DATE,
  periodo_inicio date,
  periodo_fim date,
  valor_total numeric DEFAULT 0,
  bank_account_id uuid,
  observacoes text,
  pdf_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== RENTAL_RECEIPT_ITEMS ====================
CREATE TABLE IF NOT EXISTS public.rental_receipt_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_receipt_id uuid NOT NULL REFERENCES public.rental_receipts(id),
  descricao text NOT NULL,
  product_id uuid REFERENCES public.products(id),
  quantidade integer DEFAULT 1,
  valor_unitario numeric DEFAULT 0,
  valor_total numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== ROI_SIMULATIONS ====================
CREATE TABLE IF NOT EXISTS public.roi_simulations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid REFERENCES public.proposals(id),
  nome_simulacao text,
  investimento_total numeric NOT NULL,
  custo_operacional_mensal numeric NOT NULL,
  prazo_roi_meses integer NOT NULL,
  duracao_contrato_meses integer NOT NULL,
  lucro_mensal_estimado numeric NOT NULL,
  retorno_mensal numeric NOT NULL,
  lucro_apos_roi numeric NOT NULL,
  lucro_total_contrato numeric NOT NULL,
  rentabilidade_percentual numeric NOT NULL,
  observacoes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== TASKS ====================
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  prioridade text DEFAULT 'media'::text,
  status text NOT NULL DEFAULT 'pendente'::text,
  categoria text,
  data_vencimento date,
  responsavel_id uuid,
  referencia_tipo text,
  referencia_id uuid,
  concluido_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== TICKETS ====================
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  categoria text,
  prioridade text DEFAULT 'media'::text,
  status text NOT NULL DEFAULT 'aberto'::text,
  cliente_id uuid,
  responsavel_id uuid,
  resolvido_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== TICKET_COMMENTS ====================
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id),
  conteudo text NOT NULL,
  autor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== QUOTE_SETTINGS ====================
CREATE TABLE IF NOT EXISTS public.quote_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valor_dolar_atual numeric DEFAULT 5.0,
  margem_padrao numeric DEFAULT 30,
  prazo_validade_dias integer DEFAULT 30,
  observacoes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ==================== OPENAI_CONFIG ====================
CREATE TABLE IF NOT EXISTS public.openai_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_encrypted text,
  model text DEFAULT 'gpt-4o-mini'::text,
  max_tokens integer DEFAULT 2000,
  enabled boolean DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- ÍNDICES DE PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_cnpj ON public.clients USING btree (cnpj);
CREATE INDEX IF NOT EXISTS idx_clients_exclusive_partner ON public.clients USING btree (exclusive_partner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_client ON public.opportunities USING btree (client_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_partner ON public.opportunities USING btree (partner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON public.opportunities USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contracts_cliente ON public.contracts USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_contracts_numero ON public.contracts USING btree (numero);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON public.contracts USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_contract_items_contract ON public.contract_items USING btree (contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_signers_contract ON public.contract_signers USING btree (contract_id);
CREATE INDEX IF NOT EXISTS idx_proposals_cliente ON public.proposals USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_proposals_codigo ON public.proposals USING btree (codigo);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals USING btree (status);
CREATE INDEX IF NOT EXISTS idx_proposal_items_proposal ON public.proposal_items USING btree (proposal_id);
CREATE INDEX IF NOT EXISTS idx_products_codigo ON public.products USING btree (codigo);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products USING btree (status);
CREATE INDEX IF NOT EXISTS idx_product_movements_product ON public.product_movements USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_cliente ON public.sales_orders USING btree (cliente_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items USING btree (sales_order_id);

-- ============================================================================
-- TRIGGERS: updated_at AUTOMÁTICO
-- ============================================================================

CREATE OR REPLACE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_partners_updated_at BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_opportunities_crm_updated_at BEFORE UPDATE ON public.opportunities_crm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_proposal_templates_updated_at BEFORE UPDATE ON public.proposal_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_partner_proposals_updated_at BEFORE UPDATE ON public.partner_proposals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_contract_templates_updated_at BEFORE UPDATE ON public.contract_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_cotacoes_compras_updated_at BEFORE UPDATE ON public.cotacoes_compras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_rental_receipts_updated_at BEFORE UPDATE ON public.rental_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_quote_settings_updated_at BEFORE UPDATE ON public.quote_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_openai_config_updated_at BEFORE UPDATE ON public.openai_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: custo médio automático ao movimentar estoque
CREATE OR REPLACE TRIGGER trigger_update_custo_medio AFTER INSERT ON public.product_movements FOR EACH ROW EXECUTE FUNCTION public.update_custo_medio();

-- Trigger: exclusividade de cliente ao criar oportunidade
CREATE OR REPLACE TRIGGER trigger_update_client_exclusivity AFTER INSERT ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_client_exclusivity();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_supplier_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities_crm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cotacoes_compras_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roi_simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.openai_config ENABLE ROW LEVEL SECURITY;

-- ==================== POLICIES: profiles ====================
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ==================== POLICIES: user_roles ====================
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Only system can insert roles" ON public.user_roles FOR INSERT WITH CHECK (false);

-- ==================== POLICIES: partners ====================
CREATE POLICY "Admins and comercial can view all partners" ON public.partners FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can view their own data" ON public.partners FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Partners can update their own data" ON public.partners FOR UPDATE USING (user_id = auth.uid());

-- ==================== POLICIES: clients ====================
CREATE POLICY "Admins and comercial can view all clients" ON public.clients FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins can update clients" ON public.clients FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Partners can create clients" ON public.clients FOR INSERT WITH CHECK (origin_partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can view their own clients" ON public.clients FOR SELECT USING ((origin_partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid())) OR (exclusive_partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid())));

-- ==================== POLICIES: brands ====================
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active brands" ON public.brands FOR SELECT USING (status = 'ativa'::text);

-- ==================== POLICIES: categories ====================
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (status = 'ativa'::text);

-- ==================== POLICIES: suppliers ====================
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active suppliers" ON public.suppliers FOR SELECT USING (status = 'ativo'::text);

-- ==================== POLICIES: supplier_brands ====================
CREATE POLICY "Admins can manage supplier brands" ON public.supplier_brands FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view supplier brands" ON public.supplier_brands FOR SELECT USING (true);

-- ==================== POLICIES: products ====================
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active products" ON public.products FOR SELECT USING (status = 'ativo'::text);

-- ==================== POLICIES: product_supplier_codes ====================
CREATE POLICY "Admins can manage product_supplier_codes" ON public.product_supplier_codes FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view product_supplier_codes" ON public.product_supplier_codes FOR SELECT USING (true);

-- ==================== POLICIES: product_movements ====================
CREATE POLICY "Admins can create movements" ON public.product_movements FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can view all movements" ON public.product_movements FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role));

-- ==================== POLICIES: warehouses ====================
CREATE POLICY "Admins can manage warehouses" ON public.warehouses FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active warehouses" ON public.warehouses FOR SELECT USING (status = 'ativo'::text);
CREATE POLICY "Public access via token" ON public.warehouses FOR SELECT USING (token_publico IS NOT NULL);

-- ==================== POLICIES: contacts ====================
CREATE POLICY "Admins and comercial can manage contacts" ON public.contacts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: opportunities ====================
CREATE POLICY "Admins and comercial can view all opportunities" ON public.opportunities FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update all opportunities" ON public.opportunities FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can create opportunities" ON public.opportunities FOR INSERT WITH CHECK (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can view their own opportunities" ON public.opportunities FOR SELECT USING (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can update their own opportunities" ON public.opportunities FOR UPDATE USING (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));

-- ==================== POLICIES: opportunities_crm ====================
CREATE POLICY "Admins and comercial can manage opportunities_crm" ON public.opportunities_crm FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: proposal_templates ====================
CREATE POLICY "Admins and comercial can view all templates" ON public.proposal_templates FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins can create templates" ON public.proposal_templates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update templates" ON public.proposal_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete templates" ON public.proposal_templates FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

-- ==================== POLICIES: proposals ====================
CREATE POLICY "Admins and comercial can view all proposals" ON public.proposals FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can create proposals" ON public.proposals FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update proposals" ON public.proposals FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can view proposals for their opportunities" ON public.proposals FOR SELECT USING (oportunidade_id IN (SELECT opportunities.id FROM opportunities WHERE opportunities.partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid())));
CREATE POLICY "Propostas com token podem ser visualizadas publicamente" ON public.proposals FOR SELECT TO anon USING (token_publico IS NOT NULL);

-- ==================== POLICIES: proposal_items ====================
CREATE POLICY "Admins and comercial can manage proposal items" ON public.proposal_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with proposal access can view items" ON public.proposal_items FOR SELECT USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR (proposals.oportunidade_id IN (SELECT opportunities.id FROM opportunities WHERE opportunities.partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()))))));
CREATE POLICY "Itens de propostas públicas podem ser visualizados" ON public.proposal_items FOR SELECT TO anon USING (proposal_id IN (SELECT proposals.id FROM proposals WHERE proposals.token_publico IS NOT NULL));

-- ==================== POLICIES: partner_proposals ====================
CREATE POLICY "Admins and comercial can view all proposals" ON public.partner_proposals FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update proposals" ON public.partner_proposals FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Partners can create proposals" ON public.partner_proposals FOR INSERT WITH CHECK (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));
CREATE POLICY "Partners can view their own proposals" ON public.partner_proposals FOR SELECT USING (partner_id IN (SELECT partners.id FROM partners WHERE partners.user_id = auth.uid()));

-- ==================== POLICIES: contract_templates ====================
CREATE POLICY "Admins can view all templates" ON public.contract_templates FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins can create templates" ON public.contract_templates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can update templates" ON public.contract_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Admins can delete templates" ON public.contract_templates FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));

-- ==================== POLICIES: contracts ====================
CREATE POLICY "Admins and comercial can view all contracts" ON public.contracts FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Admins and comercial can create contracts" ON public.contracts FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can update contracts" ON public.contracts FOR UPDATE USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Contratos públicos podem ser visualizados" ON public.contracts FOR SELECT USING (token_publico IS NOT NULL);

-- ==================== POLICIES: contract_items ====================
CREATE POLICY "Admins and comercial can manage contract items" ON public.contract_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with contract access can view items" ON public.contract_items FOR SELECT USING (contract_id IN (SELECT contracts.id FROM contracts WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role) OR contracts.token_publico IS NOT NULL)));

-- ==================== POLICIES: contract_signers ====================
CREATE POLICY "Admins and comercial can manage signers" ON public.contract_signers FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with contract access can view signers" ON public.contract_signers FOR SELECT USING (contract_id IN (SELECT contracts.id FROM contracts WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role) OR contracts.token_publico IS NOT NULL)));

-- ==================== POLICIES: contract_attachments ====================
CREATE POLICY "Admins and comercial can manage attachments" ON public.contract_attachments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Users with contract access can view attachments" ON public.contract_attachments FOR SELECT USING (contract_id IN (SELECT contracts.id FROM contracts WHERE (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role) OR contracts.token_publico IS NOT NULL)));

-- ==================== POLICIES: sales_orders ====================
CREATE POLICY "Admins and comercial can manage sales_orders" ON public.sales_orders FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Financeiro can view sales_orders" ON public.sales_orders FOR SELECT USING (has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: sales_order_items ====================
CREATE POLICY "Admins and comercial can manage sales_order_items" ON public.sales_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Financeiro can view sales_order_items" ON public.sales_order_items FOR SELECT USING (has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: sales_order_logs ====================
CREATE POLICY "Admins and comercial can manage sales_order_logs" ON public.sales_order_logs FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: purchase_orders ====================
CREATE POLICY "Admins can manage purchase_orders" ON public.purchase_orders FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view purchase_orders" ON public.purchase_orders FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: purchase_order_items ====================
CREATE POLICY "Admins can manage purchase_order_items" ON public.purchase_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view purchase_order_items" ON public.purchase_order_items FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: cotacoes_compras ====================
CREATE POLICY "Admins and comercial can manage cotacoes_compras" ON public.cotacoes_compras FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: cotacoes_compras_itens ====================
CREATE POLICY "Admins and comercial can manage cotacoes_compras_itens" ON public.cotacoes_compras_itens FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: bank_accounts ====================
CREATE POLICY "Admins and financeiro can manage bank_accounts" ON public.bank_accounts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: bank_transactions ====================
CREATE POLICY "Admins and financeiro can manage bank_transactions" ON public.bank_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: accounts_payable ====================
CREATE POLICY "Admins and financeiro can manage AP" ON public.accounts_payable FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view AP" ON public.accounts_payable FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: accounts_payable_payments ====================
CREATE POLICY "Admins and financeiro can manage AP payments" ON public.accounts_payable_payments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: accounts_receivable ====================
CREATE POLICY "Admins and financeiro can manage AR" ON public.accounts_receivable FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view AR" ON public.accounts_receivable FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: accounts_receivable_payments ====================
CREATE POLICY "Admins and financeiro can manage AR payments" ON public.accounts_receivable_payments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: commissions ====================
CREATE POLICY "Admins and financeiro can manage commissions" ON public.commissions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view commissions" ON public.commissions FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: commission_rules ====================
CREATE POLICY "Admins can manage commission_rules" ON public.commission_rules FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial and financeiro can view commission_rules" ON public.commission_rules FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: rental_receipts ====================
CREATE POLICY "Admins and financeiro can manage rental_receipts" ON public.rental_receipts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view rental_receipts" ON public.rental_receipts FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: rental_receipt_items ====================
CREATE POLICY "Admins and financeiro can manage rental_receipt_items" ON public.rental_receipt_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- ==================== POLICIES: roi_simulations ====================
CREATE POLICY "Admins and comercial can view all simulations" ON public.roi_simulations FOR SELECT USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Admins and comercial can create simulations" ON public.roi_simulations FOR INSERT WITH CHECK ((has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role)) AND auth.uid() = created_by);
CREATE POLICY "Admins can delete simulations" ON public.roi_simulations FOR DELETE USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Partners can create own simulations" ON public.roi_simulations FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Partners can view own simulations" ON public.roi_simulations FOR SELECT USING (created_by = auth.uid());
CREATE POLICY "Users can update own simulations" ON public.roi_simulations FOR UPDATE USING (created_by = auth.uid());
CREATE POLICY "Users can delete own simulations" ON public.roi_simulations FOR DELETE USING (created_by = auth.uid());

-- ==================== POLICIES: tasks ====================
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = responsavel_id OR auth.uid() = created_by);

-- ==================== POLICIES: tickets ====================
CREATE POLICY "Admins can manage all tickets" ON public.tickets FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can manage own tickets" ON public.tickets FOR ALL USING (auth.uid() = responsavel_id OR auth.uid() = created_by);

-- ==================== POLICIES: ticket_comments ====================
CREATE POLICY "Users with ticket access can manage comments" ON public.ticket_comments FOR ALL USING (true);

-- ==================== POLICIES: quote_settings ====================
CREATE POLICY "Admins can manage quote_settings" ON public.quote_settings FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view quote_settings" ON public.quote_settings FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- ==================== POLICIES: openai_config ====================
CREATE POLICY "Admins can manage openai_config" ON public.openai_config FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- ============================================================================
-- STORAGE BUCKETS (Supabase-específico)
-- ============================================================================
-- Se estiver usando Supabase, execute:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('propostas', 'propostas', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true);

-- ============================================================================
-- NOTA: Para ambientes Supabase, o trigger handle_new_user deve ser 
-- associado à tabela auth.users:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- ============================================================================

-- FIM DO BACKUP COMPLETO
-- Total de tabelas: 37
-- Total de funções: 10
-- Total de triggers: 31
-- Total de policies RLS: 80+
-- Total de tipos enum: 8
-- Total de índices customizados: 20+
