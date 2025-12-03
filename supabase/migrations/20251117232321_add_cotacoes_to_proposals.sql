-- Migration: Adicionar campos de rastreamento de cotações em propostas
-- Data: 2025-11-17
-- Descrição: Adiciona campos para rastrear origem dos itens de propostas vindos de cotações de compras

-- Adicionar campo cotacoes_ids na tabela proposals (array de IDs das cotações utilizadas)
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS cotacoes_ids JSONB DEFAULT '[]'::jsonb;

-- Adicionar campos de rastreamento na tabela proposal_items
ALTER TABLE public.proposal_items
ADD COLUMN IF NOT EXISTS cotacao_id UUID REFERENCES public.cotacoes_compras(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cotacao_item_id UUID REFERENCES public.cotacoes_compras_itens(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cotacao_numero TEXT,
ADD COLUMN IF NOT EXISTS custo_origem NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS moeda_origem TEXT CHECK (moeda_origem IN ('BRL', 'USD')),
ADD COLUMN IF NOT EXISTS taxa_cambio_origem NUMERIC(10,4),
ADD COLUMN IF NOT EXISTS fornecedor_origem_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_proposals_cotacoes_ids ON public.proposals USING GIN (cotacoes_ids);
CREATE INDEX IF NOT EXISTS idx_proposal_items_cotacao_id ON public.proposal_items(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_cotacao_item_id ON public.proposal_items(cotacao_item_id);
CREATE INDEX IF NOT EXISTS idx_proposal_items_fornecedor_origem ON public.proposal_items(fornecedor_origem_id);

-- Comentários para documentação
COMMENT ON COLUMN public.proposals.cotacoes_ids IS 'Array de IDs das cotações de compras utilizadas nesta proposta';
COMMENT ON COLUMN public.proposal_items.cotacao_id IS 'ID da cotação de compras de onde este item foi importado';
COMMENT ON COLUMN public.proposal_items.cotacao_item_id IS 'ID do item específico da cotação de compras';
COMMENT ON COLUMN public.proposal_items.cotacao_numero IS 'Número da cotação para exibição (ex: COT-2025-000002)';
COMMENT ON COLUMN public.proposal_items.custo_origem IS 'Custo unitário original da cotação';
COMMENT ON COLUMN public.proposal_items.moeda_origem IS 'Moeda original da cotação (BRL ou USD)';
COMMENT ON COLUMN public.proposal_items.taxa_cambio_origem IS 'Taxa de câmbio usada na conversão (se aplicável)';
COMMENT ON COLUMN public.proposal_items.fornecedor_origem_id IS 'ID do fornecedor da cotação de origem';





