-- Adicionar campos para PDF e compartilhamento na tabela proposals
ALTER TABLE public.proposals 
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS link_publico TEXT,
ADD COLUMN IF NOT EXISTS token_publico TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS aprovado_em TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca por token
CREATE INDEX IF NOT EXISTS idx_proposals_token_publico ON public.proposals(token_publico);

-- Função para gerar token único
CREATE OR REPLACE FUNCTION public.generate_proposal_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$;

-- Criar bucket de storage para propostas (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('propostas', 'propostas', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para propostas
CREATE POLICY "Admins e comercial podem fazer upload de propostas"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'propostas' AND
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
);

CREATE POLICY "Admins e comercial podem atualizar propostas"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'propostas' AND
  (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
);

CREATE POLICY "Propostas são publicamente acessíveis para visualização"
ON storage.objects
FOR SELECT
USING (bucket_id = 'propostas');

-- Política para permitir visualização pública de propostas com token válido
CREATE POLICY "Propostas com token podem ser visualizadas publicamente"
ON public.proposals
FOR SELECT
TO anon
USING (token_publico IS NOT NULL);

-- Política para permitir visualização dos itens da proposta pública
CREATE POLICY "Itens de propostas públicas podem ser visualizados"
ON public.proposal_items
FOR SELECT
TO anon
USING (
  proposal_id IN (
    SELECT id FROM public.proposals WHERE token_publico IS NOT NULL
  )
);