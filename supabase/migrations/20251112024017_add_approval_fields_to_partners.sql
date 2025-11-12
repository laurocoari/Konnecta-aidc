-- Add approval fields to partners table
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pendente' 
  CHECK (approval_status IN ('pendente', 'aprovado', 'rejeitado')),
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Create index for approval_status for better query performance
CREATE INDEX IF NOT EXISTS idx_partners_approval_status ON public.partners(approval_status);

-- Update existing partners to have 'aprovado' status if they are active
UPDATE public.partners
SET approval_status = 'aprovado'
WHERE status = 'ativo' AND approval_status = 'pendente';

