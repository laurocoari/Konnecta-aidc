-- Add specifications and videos fields to products table
ALTER TABLE public.products 
ADD COLUMN especificacoes jsonb DEFAULT '[]'::jsonb,
ADD COLUMN videos jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.especificacoes IS 'Array of product specifications with name and value';
COMMENT ON COLUMN public.products.videos IS 'Array of product videos with type (youtube/upload), url, and title';

-- Create storage bucket for product media (images and videos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-media', 'product-media', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for product-media bucket
CREATE POLICY "Admins can upload product media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-media' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can update product media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-media' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Admins can delete product media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-media' 
  AND has_role(auth.uid(), 'admin'::user_role)
);

CREATE POLICY "Anyone can view product media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-media');