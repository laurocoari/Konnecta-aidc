-- Update client-files bucket to allow files up to 50MB
-- Note: This migration requires admin permissions. Configure manually via Dashboard:
-- Storage > Buckets > client-files > Edit > Restrict file size: 50MB
UPDATE storage.buckets
SET file_size_limit = 50 * 1024 * 1024 -- 50MB in bytes
WHERE id = 'client-files';

COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Maximum file size in bytes for uploads to this bucket';

