-- AJUSTE 25: Cria bucket privado para fotos dos clientes

-- Cria o bucket (privado — somente autenticados conseguem ler)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fotos-clientes',
  'fotos-clientes',
  false,
  52428800, -- 50MB por arquivo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- Clientes (anon) podem fazer upload de fotos
CREATE POLICY "Clientes podem fazer upload"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'fotos-clientes');

-- Somente usuários autenticados (Leticia) podem ver as fotos
CREATE POLICY "Somente autenticados podem ver fotos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'fotos-clientes');

-- Somente autenticados podem deletar
CREATE POLICY "Somente autenticados podem deletar fotos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'fotos-clientes');
