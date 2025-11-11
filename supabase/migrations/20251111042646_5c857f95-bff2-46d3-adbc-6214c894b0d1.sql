-- Fix security warnings by setting search_path on all functions

-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'revendedor')
  );
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Update check_client_exclusivity function with proper search_path
CREATE OR REPLACE FUNCTION check_client_exclusivity(p_cnpj TEXT)
RETURNS TABLE (
  client_exists BOOLEAN,
  client_id UUID,
  partner_id UUID,
  partner_name TEXT,
  exclusivity_expires_at TIMESTAMPTZ,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Update update_client_exclusivity function with proper search_path
CREATE OR REPLACE FUNCTION update_client_exclusivity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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