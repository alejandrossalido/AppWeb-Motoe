-- Create the 'avatars' bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to avatars
CREATE POLICY "Avatar Read Access" ON storage.objects
FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload their own avatar
-- We rely on the filename convention or just allow authenticated upload. 
-- For simplicity in this fix: Allow any authenticated user to insert into 'avatars'.
CREATE POLICY "Avatar Upload Access" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated'
);

-- Policy: Allow users to update/delete their own files
-- Typically requires checking owner. Supabase storage usually sets owner to auth.uid() automatically.
CREATE POLICY "Avatar Update Access" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.uid() = owner
);

CREATE POLICY "Avatar Delete Access" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.uid() = owner
);
