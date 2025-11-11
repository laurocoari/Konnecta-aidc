-- Create proposal_templates table first
CREATE TABLE IF NOT EXISTS public.proposal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(100) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('venda', 'locacao', 'servico', 'projeto')),
  cabecalho_html TEXT,
  rodape_html TEXT,
  condicoes_comerciais TEXT,
  observacoes_internas TEXT,
  estrutura_tabela JSONB DEFAULT '{}',
  logotipo_secundario TEXT,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposal_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for proposal_templates
CREATE POLICY "Admins and comercial can view all templates"
  ON public.proposal_templates FOR SELECT
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'comercial'));

CREATE POLICY "Admins can create templates"
  ON public.proposal_templates FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update templates"
  ON public.proposal_templates FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete templates"
  ON public.proposal_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_proposal_templates_updated_at
  BEFORE UPDATE ON public.proposal_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Now add modelo_id to proposals table
ALTER TABLE public.proposals ADD COLUMN modelo_id UUID REFERENCES public.proposal_templates(id);

-- Create indexes
CREATE INDEX idx_proposal_templates_tipo ON public.proposal_templates(tipo);
CREATE INDEX idx_proposal_templates_status ON public.proposal_templates(status);
CREATE INDEX idx_proposals_modelo ON public.proposals(modelo_id);