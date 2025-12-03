-- Add logomarca, emails and attachments fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS logomarca_url TEXT,
ADD COLUMN IF NOT EXISTS email_administrativo TEXT,
ADD COLUMN IF NOT EXISTS email_financeiro TEXT,
ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.clients.logomarca_url IS 'URL da logomarca do cliente no Storage';
COMMENT ON COLUMN public.clients.email_administrativo IS 'Email para questões administrativas';
COMMENT ON COLUMN public.clients.email_financeiro IS 'Email para questões financeiras';
COMMENT ON COLUMN public.clients.anexos IS 'Array de objetos com informações dos anexos (PDF, Excel, etc.)';

-- Create storage bucket for client files (logomarca and attachments)
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-files', 'client-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- RLS policies for client-files bucket
-- Admins and comercial can upload client files
CREATE POLICY "Admins and comercial can upload client files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'client-files' 
  AND (
    has_role(auth.uid(), 'admin'::user_role) 
    OR has_role(auth.uid(), 'comercial'::user_role)
  )
);

-- Admins and comercial can update client files
CREATE POLICY "Admins and comercial can update client files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'client-files' 
  AND (
    has_role(auth.uid(), 'admin'::user_role) 
    OR has_role(auth.uid(), 'comercial'::user_role)
  )
);

-- Admins and comercial can delete client files
CREATE POLICY "Admins and comercial can delete client files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-files' 
  AND (
    has_role(auth.uid(), 'admin'::user_role) 
    OR has_role(auth.uid(), 'comercial'::user_role)
  )
);

-- Anyone can view client files (bucket is public)
CREATE POLICY "Anyone can view client files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-files');

