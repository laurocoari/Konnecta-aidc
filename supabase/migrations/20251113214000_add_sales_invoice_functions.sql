-- Migration: Funções para faturamento e integração com accounts_receivable
-- Data: 2025-11-13

-- 1. Criar sequência para números de fatura
CREATE SEQUENCE IF NOT EXISTS sales_invoice_sequence START 1;

-- 2. Função para gerar número de fatura sequencial
CREATE OR REPLACE FUNCTION generate_sales_invoice_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  next_num := nextval('sales_invoice_sequence');
  invoice_num := 'FAT-' || LPAD(next_num::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- 3. Função para criar fatura e conta a receber a partir de pedido
CREATE OR REPLACE FUNCTION create_invoice_from_sales_order(
  p_order_id UUID,
  p_data_vencimento DATE,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_order RECORD;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_ar_id UUID;
  v_client_contact_id UUID;
BEGIN
  -- Buscar dados do pedido
  SELECT 
    so.*,
    c.id as client_id,
    c.nome as client_nome,
    c.email as client_email
  INTO v_order
  FROM public.sales_orders so
  JOIN public.clients c ON c.id = so.cliente_id
  WHERE so.id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pedido não encontrado';
  END IF;

  -- Validar que pedido não está cancelado
  IF v_order.status = 'cancelado' THEN
    RAISE EXCEPTION 'Não é possível faturar um pedido cancelado';
  END IF;

  -- Gerar número da fatura
  v_invoice_number := generate_sales_invoice_number();

  -- Buscar ou criar contact_id do cliente
  -- Primeiro tenta encontrar contact existente pelo cliente
  SELECT id INTO v_client_contact_id
  FROM public.contacts
  WHERE tipo = 'cliente'
    AND (
      (empresa IS NOT NULL AND empresa = v_order.client_nome)
      OR (nome IS NOT NULL AND nome = v_order.client_nome)
    )
  LIMIT 1;

  -- Se não encontrou, criar contact
  IF v_client_contact_id IS NULL THEN
    INSERT INTO public.contacts (
      tipo,
      nome,
      empresa,
      email,
      telefone
    )
    VALUES (
      'cliente',
      v_order.client_nome,
      v_order.client_nome,
      v_order.client_email,
      ''
    )
    RETURNING id INTO v_client_contact_id;
  END IF;

  -- Criar conta a receber
  INSERT INTO public.accounts_receivable (
    contact_id,
    origem,
    referencia_id,
    valor_total,
    valor_pago,
    data_emissao,
    data_vencimento,
    status,
    observacoes,
    created_by
  )
  VALUES (
    v_client_contact_id,
    'pedido_venda',
    p_order_id::TEXT,
    v_order.total_geral,
    0,
    CURRENT_DATE,
    p_data_vencimento,
    'pendente',
    'Fatura gerada do pedido ' || v_order.numero_pedido,
    p_user_id
  )
  RETURNING id INTO v_ar_id;

  -- Criar fatura
  INSERT INTO public.sales_invoices (
    sales_order_id,
    numero_fatura,
    account_receivable_id,
    valor_total,
    data_emissao,
    data_vencimento,
    status,
    created_by
  )
  VALUES (
    p_order_id,
    v_invoice_number,
    v_ar_id,
    v_order.total_geral,
    CURRENT_DATE,
    p_data_vencimento,
    'pendente',
    p_user_id
  )
  RETURNING id INTO v_invoice_id;

  -- Atualizar status do pedido para 'faturado'
  UPDATE public.sales_orders
  SET 
    status = 'faturado',
    updated_by = p_user_id,
    updated_at = now()
  WHERE id = p_order_id;

  -- Criar log
  INSERT INTO public.sales_order_logs (
    sales_order_id,
    acao,
    descricao,
    usuario_id,
    dados_novos
  )
  VALUES (
    p_order_id,
    'faturado',
    'Fatura ' || v_invoice_number || ' gerada. Conta a receber criada.',
    p_user_id,
    jsonb_build_object(
      'invoice_id', v_invoice_id,
      'invoice_number', v_invoice_number,
      'account_receivable_id', v_ar_id,
      'status', 'faturado'
    )
  );

  RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função para registrar log de mudanças no pedido
CREATE OR REPLACE FUNCTION log_sales_order_change()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_description TEXT;
BEGIN
  -- Determinar ação baseada no tipo de operação
  IF TG_OP = 'INSERT' THEN
    v_action := 'criado';
    v_description := 'Pedido criado';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Verificar mudanças específicas
    IF NEW.status != OLD.status THEN
      v_action := 'status_alterado';
      v_description := 'Status alterado de ' || OLD.status || ' para ' || NEW.status;
    ELSE
      v_action := 'atualizado';
      v_description := 'Pedido atualizado';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'deletado';
    v_description := 'Pedido deletado';
  END IF;

  -- Registrar log apenas para INSERT e UPDATE (DELETE já tem CASCADE)
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    INSERT INTO public.sales_order_logs (
      sales_order_id,
      acao,
      descricao,
      usuario_id,
      dados_anteriores,
      dados_novos
    )
    VALUES (
      NEW.id,
      v_action,
      v_description,
      COALESCE(NEW.updated_by, NEW.created_by),
      CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb ELSE NULL END,
      row_to_json(NEW)::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger para registrar logs automáticos
DROP TRIGGER IF EXISTS trigger_log_sales_order_changes ON public.sales_orders;
CREATE TRIGGER trigger_log_sales_order_changes
  AFTER INSERT OR UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION log_sales_order_change();

-- 6. Comentários
COMMENT ON FUNCTION create_invoice_from_sales_order IS 'Cria fatura e conta a receber a partir de um pedido de venda';
COMMENT ON FUNCTION log_sales_order_change IS 'Registra logs automáticos de mudanças nos pedidos';



