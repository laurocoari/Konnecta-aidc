-- Adicionar campo account_receivable_id na tabela rental_receipts
-- Para rastrear qual recibo foi gerado para qual conta a receber

ALTER TABLE public.rental_receipts
ADD COLUMN IF NOT EXISTS account_receivable_id UUID REFERENCES public.accounts_receivable(id) ON DELETE SET NULL;

-- Criar índice para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_rental_receipts_account_receivable ON public.rental_receipts(account_receivable_id);



