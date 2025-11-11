-- Criar tabela para simulações de ROI
CREATE TABLE public.roi_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE CASCADE,
  investimento_total NUMERIC NOT NULL,
  custo_operacional_mensal NUMERIC NOT NULL,
  prazo_roi_meses INTEGER NOT NULL,
  duracao_contrato_meses INTEGER NOT NULL,
  lucro_mensal_estimado NUMERIC NOT NULL,
  
  -- Campos calculados (armazenados para histórico)
  retorno_mensal NUMERIC NOT NULL,
  lucro_apos_roi NUMERIC NOT NULL,
  lucro_total_contrato NUMERIC NOT NULL,
  rentabilidade_percentual NUMERIC NOT NULL,
  
  -- Metadados
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  nome_simulacao TEXT,
  observacoes TEXT
);

-- Habilitar RLS
ALTER TABLE public.roi_simulations ENABLE ROW LEVEL SECURITY;

-- Admins e comercial podem ver todas simulações
CREATE POLICY "Admins and comercial can view all simulations"
  ON public.roi_simulations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role));

-- Revendedores veem apenas suas simulações
CREATE POLICY "Partners can view own simulations"
  ON public.roi_simulations FOR SELECT
  USING (created_by = auth.uid());

-- Admins e comercial podem criar simulações
CREATE POLICY "Admins and comercial can create simulations"
  ON public.roi_simulations FOR INSERT
  WITH CHECK (
    (has_role(auth.uid(), 'admin'::user_role) OR has_role(auth.uid(), 'comercial'::user_role))
    AND auth.uid() = created_by
  );

-- Revendedores podem criar suas próprias simulações
CREATE POLICY "Partners can create own simulations"
  ON public.roi_simulations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Usuários podem atualizar suas próprias simulações
CREATE POLICY "Users can update own simulations"
  ON public.roi_simulations FOR UPDATE
  USING (created_by = auth.uid());

-- Admins podem deletar qualquer simulação
CREATE POLICY "Admins can delete simulations"
  ON public.roi_simulations FOR DELETE
  USING (has_role(auth.uid(), 'admin'::user_role));

-- Usuários podem deletar suas próprias simulações
CREATE POLICY "Users can delete own simulations"
  ON public.roi_simulations FOR DELETE
  USING (created_by = auth.uid());

-- Criar índice para performance
CREATE INDEX idx_roi_simulations_proposal_id ON public.roi_simulations(proposal_id);
CREATE INDEX idx_roi_simulations_created_by ON public.roi_simulations(created_by);