-- Criar ENUM para tipo_operacao
CREATE TYPE tipo_operacao AS ENUM (
  'venda_direta',
  'venda_agenciada', 
  'locacao_direta',
  'locacao_agenciada'
);

-- Criar ENUM para tipo_disponibilidade
CREATE TYPE tipo_disponibilidade AS ENUM (
  'venda',
  'locacao',
  'ambos'
);

-- Alterar tabela products - adicionar campos para suporte aos 4 tipos de operação
ALTER TABLE products
ADD COLUMN tipo_disponibilidade tipo_disponibilidade DEFAULT 'venda',
ADD COLUMN margem_lucro_venda DECIMAL(5,2) DEFAULT 0,
ADD COLUMN vida_util_meses INTEGER DEFAULT 36,
ADD COLUMN permite_agenciamento BOOLEAN DEFAULT false,
ADD COLUMN comissao_agenciamento_padrao DECIMAL(5,2) DEFAULT 0;

-- Atualizar produtos existentes com base nos valores atuais
UPDATE products 
SET tipo_disponibilidade = CASE 
  WHEN valor_locacao IS NOT NULL AND valor_venda IS NOT NULL THEN 'ambos'::tipo_disponibilidade
  WHEN valor_locacao IS NOT NULL THEN 'locacao'::tipo_disponibilidade
  ELSE 'venda'::tipo_disponibilidade
END;

-- Alterar tabela proposals - adicionar campos financeiros
ALTER TABLE proposals
ADD COLUMN tipo_operacao tipo_operacao DEFAULT 'venda_direta',
ADD COLUMN custo_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN lucro_total DECIMAL(10,2) DEFAULT 0,
ADD COLUMN margem_percentual_total DECIMAL(5,2) DEFAULT 0;

-- Alterar tabela proposal_items - adicionar campos para cálculos detalhados
ALTER TABLE proposal_items
ADD COLUMN fornecedor_id UUID REFERENCES suppliers(id),
ADD COLUMN custo_unitario DECIMAL(10,2) DEFAULT 0,
ADD COLUMN valor_unitario DECIMAL(10,2) DEFAULT 0,
ADD COLUMN comissao_percentual DECIMAL(5,2),
ADD COLUMN periodo_locacao_meses INTEGER,
ADD COLUMN lucro_subtotal DECIMAL(10,2) DEFAULT 0;

-- Migrar dados existentes de preco_unitario para valor_unitario
UPDATE proposal_items
SET valor_unitario = preco_unitario,
    custo_unitario = COALESCE((
      SELECT custo_medio FROM products WHERE id = proposal_items.product_id
    ), 0)
WHERE valor_unitario = 0;

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_proposals_tipo_operacao ON proposals(tipo_operacao);
CREATE INDEX IF NOT EXISTS idx_proposal_items_fornecedor ON proposal_items(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_products_tipo_disponibilidade ON products(tipo_disponibilidade);