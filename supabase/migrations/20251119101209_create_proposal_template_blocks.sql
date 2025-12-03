-- Migration: Criar tabela proposal_template_blocks para blocos configuráveis
-- Data: 2025-11-19
-- Descrição: Tabela para armazenar blocos editáveis de templates de proposta

-- Criar tabela de blocos de template
CREATE TABLE IF NOT EXISTS public.proposal_template_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.proposal_templates(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN (
    'cabecalho',
    'apresentacao',
    'rodape',
    'condicoes_pagamento',
    'observacoes_gerais',
    'obrigacoes_cliente',
    'obrigacoes_konnecta',
    'requisitos_tecnicos',
    'informacoes_instalacao',
    'sla_prazos',
    'politica_devolucao',
    'garantia',
    'equipamentos_incluidos',
    'equipamentos_nao_incluidos',
    'classificacao_fiscal',
    'custom'
  )),
  conteudo_html TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_proposal_template_blocks_template ON public.proposal_template_blocks(template_id);
CREATE INDEX IF NOT EXISTS idx_proposal_template_blocks_tipo ON public.proposal_template_blocks(tipo);
CREATE INDEX IF NOT EXISTS idx_proposal_template_blocks_ordem ON public.proposal_template_blocks(template_id, ordem);

-- Habilitar RLS
ALTER TABLE public.proposal_template_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and comercial can view template blocks"
  ON public.proposal_template_blocks FOR SELECT
  USING (
    template_id IN (
      SELECT id FROM public.proposal_templates
      WHERE has_role(auth.uid(), 'admin'::user_role) 
         OR has_role(auth.uid(), 'comercial'::user_role)
    )
  );

CREATE POLICY "Admins can manage template blocks"
  ON public.proposal_template_blocks FOR ALL
  USING (has_role(auth.uid(), 'admin'::user_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_proposal_template_blocks_updated_at
  BEFORE UPDATE ON public.proposal_template_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.proposal_template_blocks IS 'Blocos configuráveis de templates de proposta';
COMMENT ON COLUMN public.proposal_template_blocks.tipo IS 'Tipo do bloco (cabecalho, apresentacao, rodape, condições, etc.)';
COMMENT ON COLUMN public.proposal_template_blocks.conteudo_html IS 'Conteúdo HTML do bloco com suporte a variáveis dinâmicas';
COMMENT ON COLUMN public.proposal_template_blocks.ordem IS 'Ordem de exibição do bloco no template';
COMMENT ON COLUMN public.proposal_template_blocks.ativo IS 'Se o bloco está ativo ou não no template';



