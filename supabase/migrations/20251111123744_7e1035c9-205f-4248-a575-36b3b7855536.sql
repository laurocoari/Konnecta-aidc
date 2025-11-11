-- Create proposals table
CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  versao INTEGER NOT NULL DEFAULT 1,
  cliente_id UUID NOT NULL REFERENCES public.clients(id),
  vendedor_id UUID NOT NULL,
  oportunidade_id UUID REFERENCES public.opportunities(id),
  data_proposta DATE NOT NULL DEFAULT CURRENT_DATE,
  validade DATE NOT NULL,
  introducao TEXT,
  condicoes_comerciais JSONB DEFAULT '{}',
  observacoes_internas TEXT,
  total_itens NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto_total NUMERIC(12,2) DEFAULT 0,
  despesas_adicionais NUMERIC(12,2) DEFAULT 0,
  total_geral NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviada', 'aprovada', 'recusada', 'substituida')),
  motivo_revisao TEXT,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposal_items table
CREATE TABLE IF NOT EXISTS public.proposal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  descricao TEXT NOT NULL,
  codigo TEXT,
  unidade TEXT DEFAULT 'un',
  quantidade INTEGER NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL,
  desconto NUMERIC(5,2) DEFAULT 0,
  total NUMERIC(12,2) NOT NULL,
  margem NUMERIC(5,2),
  estoque INTEGER,
  imagem_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposals
CREATE POLICY "Admins and comercial can view all proposals"
  ON public.proposals FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

CREATE POLICY "Admins and comercial can create proposals"
  ON public.proposals FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

CREATE POLICY "Admins and comercial can update proposals"
  ON public.proposals FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

CREATE POLICY "Partners can view proposals for their opportunities"
  ON public.proposals FOR SELECT
  USING (oportunidade_id IN (
    SELECT id FROM public.opportunities 
    WHERE partner_id IN (
      SELECT id FROM public.partners WHERE user_id = auth.uid()
    )
  ));

-- RLS Policies for proposal_items
CREATE POLICY "Users with proposal access can view items"
  ON public.proposal_items FOR SELECT
  USING (
    proposal_id IN (
      SELECT id FROM public.proposals 
      WHERE has_role(auth.uid(), 'admin') 
         OR has_role(auth.uid(), 'comercial')
         OR oportunidade_id IN (
           SELECT id FROM public.opportunities 
           WHERE partner_id IN (
             SELECT id FROM public.partners WHERE user_id = auth.uid()
           )
         )
    )
  );

CREATE POLICY "Admins and comercial can manage proposal items"
  ON public.proposal_items FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

-- Create trigger for updated_at
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes
CREATE INDEX idx_proposals_cliente ON public.proposals(cliente_id);
CREATE INDEX idx_proposals_vendedor ON public.proposals(vendedor_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);
CREATE INDEX idx_proposals_codigo ON public.proposals(codigo);
CREATE INDEX idx_proposal_items_proposal ON public.proposal_items(proposal_id);
CREATE INDEX idx_proposal_items_product ON public.proposal_items(product_id);