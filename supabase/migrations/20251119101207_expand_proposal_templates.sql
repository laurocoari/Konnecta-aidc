-- Migration: Expandir tabela proposal_templates com sistema de variáveis e campos de empresa
-- Data: 2025-11-19
-- Descrição: Adiciona campos para sistema de variáveis dinâmicas, blocos configuráveis e dados da empresa

-- Adicionar campos para sistema de variáveis
ALTER TABLE public.proposal_templates
ADD COLUMN IF NOT EXISTS variaveis_customizadas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS blocos_configuraveis JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS layout_html TEXT,
ADD COLUMN IF NOT EXISTS css_personalizado TEXT,
ADD COLUMN IF NOT EXISTS secoes_ativas JSONB DEFAULT '{
  "cabecalho": true,
  "apresentacao": true,
  "itens": true,
  "resumo_financeiro": true,
  "condicoes_comerciais": true,
  "rodape": true
}'::jsonb;

-- Adicionar campos de empresa
ALTER TABLE public.proposal_templates
ADD COLUMN IF NOT EXISTS empresa_nome TEXT DEFAULT 'Konnecta Consultoria',
ADD COLUMN IF NOT EXISTS empresa_cnpj TEXT DEFAULT '05.601.700/0001-55',
ADD COLUMN IF NOT EXISTS empresa_endereco TEXT DEFAULT 'Rua Rio Ebro, Nº7, QD12',
ADD COLUMN IF NOT EXISTS empresa_telefone TEXT DEFAULT '(92) 3242-1311',
ADD COLUMN IF NOT EXISTS empresa_email TEXT,
ADD COLUMN IF NOT EXISTS empresa_logo_url TEXT;

-- Comentários para documentação
COMMENT ON COLUMN public.proposal_templates.variaveis_customizadas IS 'Array de variáveis personalizadas do modelo (ex: [{nome: "custom.observacao", tipo: "texto", valor_padrao: ""}])';
COMMENT ON COLUMN public.proposal_templates.blocos_configuraveis IS 'Estrutura de blocos editáveis do modelo';
COMMENT ON COLUMN public.proposal_templates.layout_html IS 'Template HTML completo com placeholders para variáveis';
COMMENT ON COLUMN public.proposal_templates.css_personalizado IS 'CSS customizado específico do modelo';
COMMENT ON COLUMN public.proposal_templates.secoes_ativas IS 'Controle de seções ativas/inativas do modelo';
COMMENT ON COLUMN public.proposal_templates.empresa_nome IS 'Nome da empresa para exibição no cabeçalho';
COMMENT ON COLUMN public.proposal_templates.empresa_cnpj IS 'CNPJ da empresa';
COMMENT ON COLUMN public.proposal_templates.empresa_endereco IS 'Endereço completo da empresa';
COMMENT ON COLUMN public.proposal_templates.empresa_telefone IS 'Telefone de contato da empresa';
COMMENT ON COLUMN public.proposal_templates.empresa_email IS 'E-mail de contato da empresa';
COMMENT ON COLUMN public.proposal_templates.empresa_logo_url IS 'URL do logotipo da empresa';



