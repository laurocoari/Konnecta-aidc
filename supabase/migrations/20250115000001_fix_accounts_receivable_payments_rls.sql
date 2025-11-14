-- Verificar se RLS está habilitado na tabela
ALTER TABLE public.accounts_receivable_payments ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver (para evitar conflitos)
DROP POLICY IF EXISTS "Admins and financeiro can view payments" ON public.accounts_receivable_payments;
DROP POLICY IF EXISTS "Admins and financeiro can create payments" ON public.accounts_receivable_payments;
DROP POLICY IF EXISTS "Admins and financeiro can update payments" ON public.accounts_receivable_payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.accounts_receivable_payments;

-- Política para visualizar pagamentos
CREATE POLICY "Admins and financeiro can view payments"
  ON public.accounts_receivable_payments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role)
  );

-- Política para criar pagamentos
CREATE POLICY "Admins and financeiro can create payments"
  ON public.accounts_receivable_payments
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role) OR
    has_role(auth.uid(), 'comercial'::user_role)
  );

-- Política para atualizar pagamentos
CREATE POLICY "Admins and financeiro can update payments"
  ON public.accounts_receivable_payments
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role)
  );

-- Política para deletar pagamentos (apenas admin)
CREATE POLICY "Admins can delete payments"
  ON public.accounts_receivable_payments
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Verificar e corrigir políticas para accounts_payable_payments também
ALTER TABLE public.accounts_payable_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and financeiro can view payable payments" ON public.accounts_payable_payments;
DROP POLICY IF EXISTS "Admins and financeiro can create payable payments" ON public.accounts_payable_payments;
DROP POLICY IF EXISTS "Admins and financeiro can update payable payments" ON public.accounts_payable_payments;
DROP POLICY IF EXISTS "Admins can delete payable payments" ON public.accounts_payable_payments;

CREATE POLICY "Admins and financeiro can view payable payments"
  ON public.accounts_payable_payments
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role)
  );

CREATE POLICY "Admins and financeiro can create payable payments"
  ON public.accounts_payable_payments
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role)
  );

CREATE POLICY "Admins and financeiro can update payable payments"
  ON public.accounts_payable_payments
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::user_role) OR 
    has_role(auth.uid(), 'financeiro'::user_role)
  );

CREATE POLICY "Admins can delete payable payments"
  ON public.accounts_payable_payments
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

