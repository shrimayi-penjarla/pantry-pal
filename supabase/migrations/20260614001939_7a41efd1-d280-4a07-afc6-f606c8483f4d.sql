
DROP POLICY IF EXISTS "Public read recipe-images" ON storage.objects;
DROP POLICY IF EXISTS "Public upload recipe-images" ON storage.objects;
DROP POLICY IF EXISTS "Public update recipe-images" ON storage.objects;
DROP POLICY IF EXISTS "Public delete recipe-images" ON storage.objects;

CREATE POLICY "Users read own recipe-images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own recipe-images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own recipe-images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own recipe-images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recipe-images' AND auth.uid()::text = (storage.foldername(name))[1]);
