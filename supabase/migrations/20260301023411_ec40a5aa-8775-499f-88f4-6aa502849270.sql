
-- =====================================================
-- MIGRATION: Criar todas as tabelas faltantes
-- =====================================================

-- 1. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'ativa',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active categories" ON public.categories FOR SELECT USING (status = 'ativa');

-- 2. CONTACTS (CRM)
CREATE TABLE IF NOT EXISTS public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  email text,
  telefone text,
  empresa text,
  tipo text NOT NULL DEFAULT 'lead',
  origem text,
  etapa_funil text NOT NULL DEFAULT 'novo',
  responsavel_id uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and comercial can manage contacts" ON public.contacts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- 3. OPPORTUNITIES_CRM
CREATE TABLE IF NOT EXISTS public.opportunities_crm (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  nome text NOT NULL,
  valor_estimado numeric,
  probabilidade integer DEFAULT 50,
  etapa text NOT NULL DEFAULT 'proposta',
  status text NOT NULL DEFAULT 'ativa',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.opportunities_crm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and comercial can manage opportunities_crm" ON public.opportunities_crm FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- 4. OPENAI_CONFIG
CREATE TABLE IF NOT EXISTS public.openai_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_encrypted text,
  model text DEFAULT 'gpt-4o-mini',
  max_tokens integer DEFAULT 2000,
  enabled boolean DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.openai_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage openai_config" ON public.openai_config FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));

-- 5. PURCHASE_ORDERS
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES public.suppliers(id),
  data_emissao date NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista date,
  status text NOT NULL DEFAULT 'rascunho',
  observacoes text,
  total_geral numeric DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage purchase_orders" ON public.purchase_orders FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view purchase_orders" ON public.purchase_orders FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- 6. PURCHASE_ORDER_ITEMS
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  desconto_percentual numeric DEFAULT 0,
  codigo_fornecedor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage purchase_order_items" ON public.purchase_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view purchase_order_items" ON public.purchase_order_items FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- 7. PRODUCT_SUPPLIER_CODES
CREATE TABLE IF NOT EXISTS public.product_supplier_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  codigo_fornecedor text NOT NULL,
  codigo_principal boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_supplier_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage product_supplier_codes" ON public.product_supplier_codes FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view product_supplier_codes" ON public.product_supplier_codes FOR SELECT USING (true);

-- 8. ACCOUNTS_RECEIVABLE
CREATE TABLE IF NOT EXISTS public.accounts_receivable (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id uuid REFERENCES public.contacts(id),
  origem text DEFAULT 'manual',
  referencia_id uuid,
  descricao text,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_pago numeric DEFAULT 0,
  data_emissao date DEFAULT CURRENT_DATE,
  data_vencimento date,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage AR" ON public.accounts_receivable FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view AR" ON public.accounts_receivable FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- 9. ACCOUNTS_RECEIVABLE_PAYMENTS
CREATE TABLE IF NOT EXISTS public.accounts_receivable_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_receivable_id uuid NOT NULL REFERENCES public.accounts_receivable(id) ON DELETE CASCADE,
  valor numeric NOT NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento text,
  bank_account_id uuid,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_receivable_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage AR payments" ON public.accounts_receivable_payments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 10. ACCOUNTS_PAYABLE
CREATE TABLE IF NOT EXISTS public.accounts_payable (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid REFERENCES public.suppliers(id),
  descricao text,
  categoria text,
  valor_total numeric NOT NULL DEFAULT 0,
  valor_pago numeric DEFAULT 0,
  data_emissao date DEFAULT CURRENT_DATE,
  data_vencimento date,
  status text NOT NULL DEFAULT 'pendente',
  observacoes text,
  referencia_id uuid,
  origem text DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage AP" ON public.accounts_payable FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view AP" ON public.accounts_payable FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- 11. ACCOUNTS_PAYABLE_PAYMENTS
CREATE TABLE IF NOT EXISTS public.accounts_payable_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_payable_id uuid NOT NULL REFERENCES public.accounts_payable(id) ON DELETE CASCADE,
  valor numeric NOT NULL,
  data_pagamento date NOT NULL DEFAULT CURRENT_DATE,
  forma_pagamento text,
  bank_account_id uuid,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_payable_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage AP payments" ON public.accounts_payable_payments FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 12. BANK_ACCOUNTS
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_banco text NOT NULL,
  agencia text,
  conta text,
  tipo text DEFAULT 'corrente',
  descricao text,
  saldo_atual numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'ativo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage bank_accounts" ON public.bank_accounts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 13. BANK_TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  valor numeric NOT NULL,
  data_movimento timestamptz NOT NULL DEFAULT now(),
  descricao text,
  categoria text,
  referencia_id uuid,
  referencia_tipo text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage bank_transactions" ON public.bank_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 14. COTACOES_COMPRAS
CREATE TABLE IF NOT EXISTS public.cotacoes_compras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_cotacao text,
  supplier_id uuid REFERENCES public.suppliers(id),
  cliente_final_id uuid REFERENCES public.clients(id),
  nome_cliente_final text,
  cidade_cliente_final text,
  estado_cliente_final text,
  proposta_numero text,
  tipo_cotacao text,
  moeda text DEFAULT 'BRL',
  data_cotacao date NOT NULL DEFAULT CURRENT_DATE,
  validade date,
  total_cotacao numeric DEFAULT 0,
  quantidade_itens integer DEFAULT 0,
  distribuidor text,
  status text NOT NULL DEFAULT 'ativo',
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cotacoes_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and comercial can manage cotacoes_compras" ON public.cotacoes_compras FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- 15. COTACOES_COMPRAS_ITENS
CREATE TABLE IF NOT EXISTS public.cotacoes_compras_itens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cotacao_id uuid NOT NULL REFERENCES public.cotacoes_compras(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  descricao text,
  codigo_produto text,
  quantidade integer DEFAULT 1,
  preco_unitario numeric DEFAULT 0,
  desconto numeric DEFAULT 0,
  total numeric DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cotacoes_compras_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and comercial can manage cotacoes_compras_itens" ON public.cotacoes_compras_itens FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- 16. SALES_ORDERS
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_pedido text NOT NULL,
  cliente_id uuid REFERENCES public.clients(id),
  proposta_id uuid REFERENCES public.proposals(id),
  vendedor_id uuid,
  data_pedido date DEFAULT CURRENT_DATE,
  data_entrega date,
  status text NOT NULL DEFAULT 'pendente',
  valor_total numeric DEFAULT 0,
  desconto_total numeric DEFAULT 0,
  total_geral numeric DEFAULT 0,
  forma_pagamento text,
  condicoes_pagamento text,
  observacoes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and comercial can manage sales_orders" ON public.sales_orders FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Financeiro can view sales_orders" ON public.sales_orders FOR SELECT USING (has_role(auth.uid(), 'financeiro'::user_role));

-- 17. SALES_ORDER_ITEMS
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  descricao text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  preco_unitario numeric NOT NULL DEFAULT 0,
  desconto numeric DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and comercial can manage sales_order_items" ON public.sales_order_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));
CREATE POLICY "Financeiro can view sales_order_items" ON public.sales_order_items FOR SELECT USING (has_role(auth.uid(), 'financeiro'::user_role));

-- 18. SALES_ORDER_LOGS
CREATE TABLE IF NOT EXISTS public.sales_order_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text,
  dados_anteriores jsonb,
  dados_novos jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sales_order_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and comercial can manage sales_order_logs" ON public.sales_order_logs FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- 19. COMMISSIONS
CREATE TABLE IF NOT EXISTS public.commissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_id uuid,
  proposta_id uuid REFERENCES public.proposals(id),
  sales_order_id uuid,
  valor_base numeric DEFAULT 0,
  percentual numeric DEFAULT 0,
  valor_comissao numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'pendente',
  accounts_payable_id uuid,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage commissions" ON public.commissions FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view commissions" ON public.commissions FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- 20. COMMISSION_RULES
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  tipo_operacao text,
  percentual numeric NOT NULL DEFAULT 0,
  vendedor_id uuid,
  categoria_produto text,
  ativo boolean DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage commission_rules" ON public.commission_rules FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial and financeiro can view commission_rules" ON public.commission_rules FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 21. WAREHOUSES
CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  endereco text,
  cidade text,
  estado text,
  cep text,
  responsavel text,
  status text NOT NULL DEFAULT 'ativo',
  token_publico text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage warehouses" ON public.warehouses FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Anyone can view active warehouses" ON public.warehouses FOR SELECT USING (status = 'ativo');
CREATE POLICY "Public access via token" ON public.warehouses FOR SELECT USING (token_publico IS NOT NULL);

-- 22. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  prioridade text DEFAULT 'media',
  status text NOT NULL DEFAULT 'pendente',
  data_vencimento date,
  responsavel_id uuid,
  categoria text,
  referencia_id uuid,
  referencia_tipo text,
  concluido_em timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all tasks" ON public.tasks FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can manage own tasks" ON public.tasks FOR ALL USING (auth.uid() = responsavel_id OR auth.uid() = created_by);

-- 23. TICKETS
CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descricao text,
  categoria text,
  prioridade text DEFAULT 'media',
  status text NOT NULL DEFAULT 'aberto',
  cliente_id uuid REFERENCES public.clients(id),
  responsavel_id uuid,
  created_by uuid,
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage all tickets" ON public.tickets FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Users can manage own tickets" ON public.tickets FOR ALL USING (auth.uid() = responsavel_id OR auth.uid() = created_by);

-- 24. TICKET_COMMENTS
CREATE TABLE IF NOT EXISTS public.ticket_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  conteudo text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users with ticket access can manage comments" ON public.ticket_comments FOR ALL USING (true);

-- 25. RENTAL_RECEIPTS
CREATE TABLE IF NOT EXISTS public.rental_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_recibo text NOT NULL,
  cliente_id uuid REFERENCES public.clients(id),
  account_receivable_id uuid REFERENCES public.accounts_receivable(id),
  proposta_id uuid REFERENCES public.proposals(id),
  sales_order_id uuid,
  data_emissao date DEFAULT CURRENT_DATE,
  periodo_inicio date,
  periodo_fim date,
  valor_total numeric DEFAULT 0,
  bank_account_id uuid REFERENCES public.bank_accounts(id),
  observacoes text,
  pdf_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rental_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage rental_receipts" ON public.rental_receipts FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));
CREATE POLICY "Comercial can view rental_receipts" ON public.rental_receipts FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- 26. RENTAL_RECEIPT_ITEMS
CREATE TABLE IF NOT EXISTS public.rental_receipt_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_receipt_id uuid NOT NULL REFERENCES public.rental_receipts(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  quantidade integer DEFAULT 1,
  valor_unitario numeric DEFAULT 0,
  valor_total numeric DEFAULT 0,
  product_id uuid REFERENCES public.products(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rental_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins and financeiro can manage rental_receipt_items" ON public.rental_receipt_items FOR ALL USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 27. QUOTE_SETTINGS
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
ALTER TABLE public.quote_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage quote_settings" ON public.quote_settings FOR ALL USING (has_role(auth.uid(), 'admin'::user_role));
CREATE POLICY "Comercial can view quote_settings" ON public.quote_settings FOR SELECT USING (has_role(auth.uid(), 'comercial'::user_role));

-- Add updated_at triggers to all new tables
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_opportunities_crm_updated_at BEFORE UPDATE ON public.opportunities_crm FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_openai_config_updated_at BEFORE UPDATE ON public.openai_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cotacoes_compras_updated_at BEFORE UPDATE ON public.cotacoes_compras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commissions_updated_at BEFORE UPDATE ON public.commissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rental_receipts_updated_at BEFORE UPDATE ON public.rental_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quote_settings_updated_at BEFORE UPDATE ON public.quote_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
