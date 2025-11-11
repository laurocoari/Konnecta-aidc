-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('admin', 'comercial', 'revendedor', 'financeiro');

-- Create enum for opportunity status
CREATE TYPE opportunity_status AS ENUM ('em_analise', 'aprovada', 'em_negociacao', 'convertida', 'perdida', 'devolvida');

-- Create enum for exclusivity status
CREATE TYPE exclusivity_status AS ENUM ('ativa', 'expirada', 'suspensa');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'revendedor',
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create partners table (revendedores)
CREATE TABLE public.partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  comissao_percentual DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  cnpj TEXT NOT NULL UNIQUE,
  ie TEXT,
  contato_principal TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  endereco TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT NOT NULL,
  cep TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'cliente',
  observacoes TEXT,
  origin_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  exclusive_partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  exclusivity_expires_at TIMESTAMPTZ,
  exclusivity_status exclusivity_status DEFAULT 'expirada',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  tipo_oportunidade TEXT NOT NULL,
  valor_estimado DECIMAL(12,2),
  status opportunity_status NOT NULL DEFAULT 'em_analise',
  observacoes TEXT,
  data_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_validade_exclusividade TIMESTAMPTZ,
  is_exclusive BOOLEAN NOT NULL DEFAULT true,
  anexos JSONB DEFAULT '[]'::jsonb,
  feedback_comercial TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_clients_cnpj ON public.clients(cnpj);
CREATE INDEX idx_clients_exclusive_partner ON public.clients(exclusive_partner_id);
CREATE INDEX idx_opportunities_partner ON public.opportunities(partner_id);
CREATE INDEX idx_opportunities_client ON public.opportunities(client_id);
CREATE INDEX idx_opportunities_status ON public.opportunities(status);
CREATE INDEX idx_partners_cnpj ON public.partners(cnpj);
CREATE INDEX idx_partners_user_id ON public.partners(user_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for partners
CREATE POLICY "Partners can view their own data"
  ON public.partners FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Admins and comercial can view all partners"
  ON public.partners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'comercial')
    )
  );

CREATE POLICY "Partners can update their own data"
  ON public.partners FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for clients
CREATE POLICY "Partners can view their own clients"
  ON public.clients FOR SELECT
  USING (
    origin_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
    OR exclusive_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and comercial can view all clients"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'comercial')
    )
  );

CREATE POLICY "Partners can create clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    origin_partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update clients"
  ON public.clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for opportunities
CREATE POLICY "Partners can view their own opportunities"
  ON public.opportunities FOR SELECT
  USING (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and comercial can view all opportunities"
  ON public.opportunities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'comercial')
    )
  );

CREATE POLICY "Partners can create opportunities"
  ON public.opportunities FOR INSERT
  WITH CHECK (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can update their own opportunities"
  ON public.opportunities FOR UPDATE
  USING (
    partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and comercial can update all opportunities"
  ON public.opportunities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'comercial')
    )
  );

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'revendedor')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to check client exclusivity (renamed "exists" to "client_exists")
CREATE OR REPLACE FUNCTION check_client_exclusivity(p_cnpj TEXT)
RETURNS TABLE (
  client_exists BOOLEAN,
  client_id UUID,
  partner_id UUID,
  partner_name TEXT,
  exclusivity_expires_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update client exclusivity when opportunity is created
CREATE OR REPLACE FUNCTION update_client_exclusivity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update client exclusivity when a new opportunity is created
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update client exclusivity
CREATE TRIGGER update_client_exclusivity_trigger
  AFTER INSERT ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_client_exclusivity();