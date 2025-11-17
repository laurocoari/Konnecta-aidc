-- Migration: Criar módulo completo de Pedidos de Venda
-- Data: 2025-11-13
-- Descrição: Cria tabelas, funções, triggers e RLS para módulo de vendas

-- 1. Criar ENUM para status de pedido de venda
CREATE TYPE sales_order_status AS ENUM (
  'rascunho',
  'em_aprovacao',
  'aprovado',
  'faturado',
  'finalizado',
  'cancelado'
);

-- 2. Criar sequência para números de pedido
CREATE SEQUENCE IF NOT EXISTS sales_order_sequence START 1;

-- 3. Criar tabela sales_orders (Pedidos de Venda)
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_pedido TEXT NOT NULL UNIQUE,
  cliente_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  proposta_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  vendedor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status sales_order_status NOT NULL DEFAULT 'rascunho',
  data_pedido DATE NOT NULL DEFAULT CURRENT_DATE,
  data_entrega_prevista DATE,
  data_entrega_real DATE,
  tipo_pagamento TEXT DEFAULT 'avista',
  condicoes_pagamento JSONB DEFAULT '{}'::jsonb,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_geral NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Criar tabela sales_order_items (Itens do Pedido)
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  codigo_produto TEXT,
  quantidade INTEGER NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_percentual NUMERIC(5,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Criar tabela sales_order_logs (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS public.sales_order_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  descricao TEXT,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Criar tabela sales_invoices (Faturas de Venda)
CREATE TABLE IF NOT EXISTS public.sales_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE RESTRICT,
  numero_fatura TEXT NOT NULL UNIQUE,
  account_receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL,
  valor_total NUMERIC(12,2) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_cliente ON public.sales_orders(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_proposta ON public.sales_orders(proposta_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_vendedor ON public.sales_orders(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_numero ON public.sales_orders(numero_pedido);
CREATE INDEX IF NOT EXISTS idx_sales_orders_data ON public.sales_orders(data_pedido);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON public.sales_order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_logs_order ON public.sales_order_logs(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_order ON public.sales_invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_ar ON public.sales_invoices(account_receivable_id);

-- 8. Função para gerar número de pedido sequencial
CREATE OR REPLACE FUNCTION generate_sales_order_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  order_num TEXT;
BEGIN
  next_num := nextval('sales_order_sequence');
  order_num := 'PED-' || LPAD(next_num::TEXT, 6, '0');
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- 9. Função para recalcular total do pedido
CREATE OR REPLACE FUNCTION recalculate_sales_order_total(order_id UUID)
RETURNS VOID AS $$
DECLARE
  v_subtotal NUMERIC(12,2);
  v_desconto_total NUMERIC(12,2);
  v_total_geral NUMERIC(12,2);
BEGIN
  -- Calcular subtotal e desconto total dos itens
  SELECT 
    COALESCE(SUM(total), 0),
    COALESCE(SUM(total * desconto_percentual / 100), 0)
  INTO v_subtotal, v_desconto_total
  FROM public.sales_order_items
  WHERE sales_order_id = order_id;

  -- Calcular total geral
  v_total_geral := v_subtotal - v_desconto_total;

  -- Atualizar pedido
  UPDATE public.sales_orders
  SET 
    subtotal = v_subtotal,
    desconto_total = v_desconto_total,
    total_geral = v_total_geral,
    updated_at = now()
  WHERE id = order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger para recalcular total quando itens mudarem
CREATE OR REPLACE FUNCTION trigger_recalculate_order_total()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_sales_order_total(COALESCE(NEW.sales_order_id, OLD.sales_order_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalculate_on_items_change ON public.sales_order_items;
CREATE TRIGGER trigger_recalculate_on_items_change
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_order_total();

-- 11. Trigger para atualizar updated_at
CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_invoices_updated_at
  BEFORE UPDATE ON public.sales_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Função para criar pedido a partir de proposta aprovada
CREATE OR REPLACE FUNCTION create_sales_order_from_proposal()
RETURNS TRIGGER AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_item RECORD;
BEGIN
  -- Só criar se status mudou para 'aprovada'
  IF NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status != 'aprovada') THEN
    -- Gerar número do pedido
    v_order_number := generate_sales_order_number();

    -- Criar pedido de venda
    INSERT INTO public.sales_orders (
      numero_pedido,
      cliente_id,
      proposta_id,
      vendedor_id,
      status,
      data_pedido,
      subtotal,
      desconto_total,
      total_geral,
      created_by
    )
    VALUES (
      v_order_number,
      NEW.cliente_id,
      NEW.id,
      NEW.vendedor_id,
      'aprovado',
      CURRENT_DATE,
      NEW.total_itens,
      NEW.desconto_total,
      NEW.total_geral,
      NEW.vendedor_id
    )
    RETURNING id INTO v_order_id;

    -- Copiar itens da proposta para o pedido
    FOR v_item IN 
      SELECT * FROM public.proposal_items WHERE proposal_id = NEW.id
    LOOP
      INSERT INTO public.sales_order_items (
        sales_order_id,
        product_id,
        descricao,
        codigo_produto,
        quantidade,
        preco_unitario,
        desconto_percentual,
        total
      )
      VALUES (
        v_order_id,
        v_item.product_id,
        v_item.descricao,
        v_item.codigo,
        v_item.quantidade,
        v_item.preco_unitario,
        v_item.desconto,
        v_item.total
      );
    END LOOP;

    -- Criar log de criação automática
    INSERT INTO public.sales_order_logs (
      sales_order_id,
      acao,
      descricao,
      usuario_id,
      dados_novos
    )
    VALUES (
      v_order_id,
      'criado',
      'Pedido criado automaticamente a partir da proposta ' || NEW.codigo,
      NEW.vendedor_id,
      jsonb_build_object(
        'proposta_id', NEW.id,
        'proposta_codigo', NEW.codigo,
        'status', 'aprovado'
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Trigger para criar pedido quando proposta for aprovada
DROP TRIGGER IF EXISTS trigger_create_order_on_proposal_approval ON public.proposals;
CREATE TRIGGER trigger_create_order_on_proposal_approval
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  WHEN (NEW.status = 'aprovada' AND (OLD.status IS NULL OR OLD.status != 'aprovada'))
  EXECUTE FUNCTION create_sales_order_from_proposal();

-- 14. Habilitar RLS
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies para sales_orders
CREATE POLICY "Admins and comercial can view all sales orders"
  ON public.sales_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

CREATE POLICY "Admins and comercial can create sales orders"
  ON public.sales_orders FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

CREATE POLICY "Admins and comercial can update sales orders"
  ON public.sales_orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

CREATE POLICY "Financeiro can view and update sales orders"
  ON public.sales_orders FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 16. RLS Policies para sales_order_items
CREATE POLICY "Users with order access can view items"
  ON public.sales_order_items FOR SELECT
  USING (
    sales_order_id IN (
      SELECT id FROM public.sales_orders
      WHERE has_role(auth.uid(), 'admin'::user_role) 
         OR has_role(auth.uid(), 'comercial'::user_role)
         OR has_role(auth.uid(), 'financeiro'::user_role)
    )
  );

CREATE POLICY "Admins and comercial can manage items"
  ON public.sales_order_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- 17. RLS Policies para sales_order_logs
CREATE POLICY "Users with order access can view logs"
  ON public.sales_order_logs FOR SELECT
  USING (
    sales_order_id IN (
      SELECT id FROM public.sales_orders
      WHERE has_role(auth.uid(), 'admin'::user_role) 
         OR has_role(auth.uid(), 'comercial'::user_role)
         OR has_role(auth.uid(), 'financeiro'::user_role)
    )
  );

CREATE POLICY "System can create logs"
  ON public.sales_order_logs FOR INSERT
  WITH CHECK (true);

-- 18. RLS Policies para sales_invoices
CREATE POLICY "Admins and financeiro can view invoices"
  ON public.sales_invoices FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

CREATE POLICY "Admins and financeiro can create invoices"
  ON public.sales_invoices FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'financeiro'::user_role));

-- 19. Comentários
COMMENT ON TABLE public.sales_orders IS 'Pedidos de venda do sistema';
COMMENT ON TABLE public.sales_order_items IS 'Itens dos pedidos de venda';
COMMENT ON TABLE public.sales_order_logs IS 'Logs de auditoria dos pedidos de venda';
COMMENT ON TABLE public.sales_invoices IS 'Faturas geradas a partir dos pedidos de venda';
COMMENT ON COLUMN public.sales_orders.numero_pedido IS 'Número sequencial único do pedido (PED-000001)';
COMMENT ON COLUMN public.sales_orders.proposta_id IS 'ID da proposta que originou este pedido (se aplicável)';
COMMENT ON FUNCTION create_sales_order_from_proposal() IS 'Cria automaticamente um pedido de venda quando uma proposta é aprovada';



