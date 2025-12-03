-- Migration: Expandir tabela proposals com campos de rastreamento e variáveis
-- Data: 2025-11-19
-- Descrição: Adiciona campos para responsável comercial, link público, variáveis preenchidas e histórico

-- Adicionar campos de rastreamento
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS responsavel_comercial_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS link_publico TEXT,
ADD COLUMN IF NOT EXISTS token_publico TEXT,
ADD COLUMN IF NOT EXISTS variaveis_preenchidas JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS historico_alteracoes JSONB DEFAULT '[]'::jsonb;

-- Criar índice para token público (usado para acesso público)
CREATE INDEX IF NOT EXISTS idx_proposals_token_publico ON public.proposals(token_publico) WHERE token_publico IS NOT NULL;

-- Criar índice para responsável comercial
CREATE INDEX IF NOT EXISTS idx_proposals_responsavel_comercial ON public.proposals(responsavel_comercial_id) WHERE responsavel_comercial_id IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.proposals.responsavel_comercial_id IS 'ID do vendedor/responsável comercial pela proposta';
COMMENT ON COLUMN public.proposals.link_publico IS 'Link público para visualização da proposta (com token)';
COMMENT ON COLUMN public.proposals.token_publico IS 'Token de acesso público para visualização sem autenticação';
COMMENT ON COLUMN public.proposals.variaveis_preenchidas IS 'Valores das variáveis customizadas preenchidas na proposta';
COMMENT ON COLUMN public.proposals.historico_alteracoes IS 'Array com histórico de alterações por versão';



