-- Migration: Adicionar campos de tipo de cotação, proposta e pedido
-- Data: 2025-01-17
-- Descrição: Adiciona campos para tipo_cotacao, proposta_numero e pedido_numero na tabela cotacoes_compras

-- Adicionar coluna tipo_cotacao
ALTER TABLE public.cotacoes_compras
ADD COLUMN IF NOT EXISTS tipo_cotacao TEXT CHECK (tipo_cotacao IN ('COMPRA_DIRETA', 'VENDA_AGENCIAVEL', 'LOCACAO_AGENCIAVEL'));

-- Adicionar coluna proposta_numero
ALTER TABLE public.cotacoes_compras
ADD COLUMN IF NOT EXISTS proposta_numero TEXT;

-- Adicionar coluna pedido_numero
ALTER TABLE public.cotacoes_compras
ADD COLUMN IF NOT EXISTS pedido_numero TEXT;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cotacoes_compras_tipo_cotacao ON public.cotacoes_compras(tipo_cotacao);
CREATE INDEX IF NOT EXISTS idx_cotacoes_compras_proposta_numero ON public.cotacoes_compras(proposta_numero);
CREATE INDEX IF NOT EXISTS idx_cotacoes_compras_pedido_numero ON public.cotacoes_compras(pedido_numero);





