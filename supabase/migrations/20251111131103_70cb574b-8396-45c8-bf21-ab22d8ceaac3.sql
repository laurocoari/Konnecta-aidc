-- Remove a constraint unique do codigo
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_codigo_key;

-- Adiciona constraint unique composta para codigo + versao
ALTER TABLE public.proposals ADD CONSTRAINT proposals_codigo_versao_key UNIQUE (codigo, versao);