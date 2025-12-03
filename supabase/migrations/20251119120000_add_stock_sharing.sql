-- Migration: Adicionar campos para compartilhamento público de estoque
-- Data: 2025-11-19
-- Descrição: Permite compartilhar estoque de um depósito via link público com autenticação simples

-- Adicionar campos de compartilhamento na tabela warehouses
ALTER TABLE public.warehouses
ADD COLUMN IF NOT EXISTS token_publico TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS link_publico TEXT,
ADD COLUMN IF NOT EXISTS usuario_publico TEXT,
ADD COLUMN IF NOT EXISTS senha_publica TEXT,
ADD COLUMN IF NOT EXISTS compartilhamento_ativo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS compartilhamento_expira_em TIMESTAMP WITH TIME ZONE;

-- Criar índice para busca por token
CREATE INDEX IF NOT EXISTS idx_warehouses_token_publico ON public.warehouses(token_publico) WHERE token_publico IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN public.warehouses.token_publico IS 'Token único para acesso público ao estoque do depósito';
COMMENT ON COLUMN public.warehouses.link_publico IS 'Link público para visualização do estoque compartilhado';
COMMENT ON COLUMN public.warehouses.usuario_publico IS 'Usuário para autenticação no acesso público';
COMMENT ON COLUMN public.warehouses.senha_publica IS 'Senha para autenticação no acesso público (hash)';
COMMENT ON COLUMN public.warehouses.compartilhamento_ativo IS 'Se o compartilhamento está ativo';
COMMENT ON COLUMN public.warehouses.compartilhamento_expira_em IS 'Data de expiração do compartilhamento (opcional)';

-- Política RLS para permitir visualização pública de warehouses com token válido
CREATE POLICY "Warehouses com token podem ser visualizados publicamente"
  ON public.warehouses
  FOR SELECT
  TO anon
  USING (
    token_publico IS NOT NULL 
    AND compartilhamento_ativo = true
    AND (compartilhamento_expira_em IS NULL OR compartilhamento_expira_em > now())
  );

-- Política RLS para permitir visualização de inventory de warehouses compartilhados
CREATE POLICY "Inventory de warehouses compartilhados pode ser visualizado publicamente"
  ON public.inventory
  FOR SELECT
  TO anon
  USING (
    warehouse_id IN (
      SELECT id FROM public.warehouses
      WHERE token_publico IS NOT NULL
        AND compartilhamento_ativo = true
        AND (compartilhamento_expira_em IS NULL OR compartilhamento_expira_em > now())
    )
  );

-- Política RLS para permitir visualização de produtos de estoque compartilhado
CREATE POLICY "Produtos de estoque compartilhado podem ser visualizados publicamente"
  ON public.products
  FOR SELECT
  TO anon
  USING (
    id IN (
      SELECT DISTINCT product_id FROM public.inventory
      WHERE warehouse_id IN (
        SELECT id FROM public.warehouses
        WHERE token_publico IS NOT NULL
          AND compartilhamento_ativo = true
          AND (compartilhamento_expira_em IS NULL OR compartilhamento_expira_em > now())
      )
    )
  );



