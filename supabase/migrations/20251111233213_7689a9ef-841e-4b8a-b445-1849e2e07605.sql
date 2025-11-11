-- Rename estoque to estoque_atual and add estoque_minimo
ALTER TABLE public.products 
RENAME COLUMN estoque TO estoque_atual;

ALTER TABLE public.products 
ADD COLUMN estoque_minimo integer DEFAULT 0;

COMMENT ON COLUMN public.products.estoque_atual IS 'Current stock quantity';
COMMENT ON COLUMN public.products.estoque_minimo IS 'Minimum stock threshold for alerts';