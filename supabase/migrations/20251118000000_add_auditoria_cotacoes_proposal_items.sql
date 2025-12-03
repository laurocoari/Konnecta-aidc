-- Migration: Adicionar campos de auditoria completa de cotações em proposal_items
-- Data: 2025-11-18
-- Descrição: Adiciona campos para rastrear todos os valores (original, convertidos, escolhido) dos itens importados de cotações

-- Adicionar novos campos de auditoria na tabela proposal_items
ALTER TABLE public.proposal_items
ADD COLUMN IF NOT EXISTS valor_original_unitario NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS valor_convertido_brl NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS valor_convertido_usd NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS valor_escolhido_para_proposta NUMERIC(12,2),
ADD COLUMN IF NOT EXISTS moeda_escolhida TEXT CHECK (moeda_escolhida IN ('BRL', 'USD'));

-- Comentários para documentação
COMMENT ON COLUMN public.proposal_items.valor_original_unitario IS 'Valor unitário original da cotação na moeda de origem (nunca alterado)';
COMMENT ON COLUMN public.proposal_items.valor_convertido_brl IS 'Valor convertido para BRL usando taxa de câmbio da cotação';
COMMENT ON COLUMN public.proposal_items.valor_convertido_usd IS 'Valor convertido para USD usando taxa de câmbio da cotação';
COMMENT ON COLUMN public.proposal_items.valor_escolhido_para_proposta IS 'Valor escolhido pelo usuário para usar na proposta (exatamente o "Custo a usar")';
COMMENT ON COLUMN public.proposal_items.moeda_escolhida IS 'Moeda do valor escolhido para a proposta (BRL ou USD)';





