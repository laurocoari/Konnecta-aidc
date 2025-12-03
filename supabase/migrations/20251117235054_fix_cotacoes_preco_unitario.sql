-- Migration: Corrigir preco_unitario e valor_convertido em cotacoes_compras_itens
-- Data: 2025-11-17
-- Descrição: Corrige itens onde preco_unitario foi salvo incorretamente como valor_convertido
--            e recalcula valor_convertido corretamente baseado na moeda e taxa de câmbio

-- Primeiro, vamos identificar e corrigir casos onde:
-- 1. preco_unitario está igual a valor_convertido (indicando que foi salvo errado)
-- 2. valor_original existe e é diferente de preco_unitario
-- 3. A moeda é USD e há taxa de câmbio na cotação

DO $$
DECLARE
    item_record RECORD;
    cotacao_taxa NUMERIC;
    cotacao_moeda TEXT;
    novo_preco_unitario NUMERIC;
    novo_valor_convertido NUMERIC;
    itens_corrigidos INTEGER := 0;
BEGIN
    -- Loop através de todos os itens de cotações
    FOR item_record IN 
        SELECT 
            ci.id,
            ci.cotacao_id,
            ci.preco_unitario,
            ci.valor_original,
            ci.valor_convertido,
            ci.moeda,
            c.moeda as cotacao_moeda,
            c.taxa_cambio
        FROM cotacoes_compras_itens ci
        INNER JOIN cotacoes_compras c ON c.id = ci.cotacao_id
        WHERE ci.moeda = 'USD' OR c.moeda = 'USD'
    LOOP
        cotacao_taxa := item_record.taxa_cambio;
        cotacao_moeda := COALESCE(item_record.moeda, item_record.cotacao_moeda, 'BRL');
        
        -- Determinar o valor original correto
        -- Se valor_original existe e é diferente de preco_unitario, usar valor_original
        IF item_record.valor_original IS NOT NULL 
           AND item_record.valor_original != item_record.preco_unitario 
           AND item_record.valor_original > 0 THEN
            novo_preco_unitario := item_record.valor_original;
        ELSE
            -- Se preco_unitario parece ser um valor convertido (muito maior que valor_original quando existe)
            -- e valor_original existe, usar valor_original
            IF item_record.valor_original IS NOT NULL 
               AND item_record.valor_original > 0 
               AND item_record.preco_unitario > item_record.valor_original * 1.5 THEN
                novo_preco_unitario := item_record.valor_original;
            ELSE
                -- Manter preco_unitario atual se não houver evidência de erro
                novo_preco_unitario := item_record.preco_unitario;
            END IF;
        END IF;
        
        -- Recalcular valor_convertido corretamente
        IF cotacao_moeda = 'USD' AND cotacao_taxa IS NOT NULL AND cotacao_taxa > 0 THEN
            -- Se moeda é USD, converter para BRL
            novo_valor_convertido := novo_preco_unitario * cotacao_taxa;
        ELSE
            -- Se moeda é BRL, valor convertido é igual ao original
            novo_valor_convertido := novo_preco_unitario;
        END IF;
        
        -- Atualizar apenas se houver mudança
        IF novo_preco_unitario != item_record.preco_unitario 
           OR novo_valor_convertido != COALESCE(item_record.valor_convertido, 0) THEN
            
            UPDATE cotacoes_compras_itens
            SET 
                preco_unitario = novo_preco_unitario,
                valor_original = novo_preco_unitario,
                valor_convertido = novo_valor_convertido,
                updated_at = NOW()
            WHERE id = item_record.id;
            
            itens_corrigidos := itens_corrigidos + 1;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Corrigidos % itens de cotações', itens_corrigidos;
END $$;

-- Comentário para documentação
COMMENT ON COLUMN cotacoes_compras_itens.preco_unitario IS 'Valor unitário ORIGINAL na moeda de origem (BRL ou USD). NUNCA deve ser o valor convertido.';
COMMENT ON COLUMN cotacoes_compras_itens.valor_original IS 'Valor original na moeda de origem (deve ser igual a preco_unitario)';
COMMENT ON COLUMN cotacoes_compras_itens.valor_convertido IS 'Valor convertido para BRL (preco_unitario * taxa_cambio se USD, ou igual a preco_unitario se BRL)';





