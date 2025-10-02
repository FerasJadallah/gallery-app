BEGIN;

-- Ensure the album images bucket is private
UPDATE storage.buckets
SET public = false
WHERE name = 'album-images';

-- Enable RLS on core tables
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_images ENABLE ROW LEVEL SECURITY;

-- Policies for albums table
CREATE POLICY "public can view public albums"
  ON public.albums
  FOR SELECT
  TO public
  USING (privacy = 'public');

CREATE POLICY "owners can view their albums"
  ON public.albums
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "owners can insert albums"
  ON public.albums
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owners can update their albums"
  ON public.albums
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "owners can delete their albums"
  ON public.albums
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for album_images table
CREATE POLICY "public can view images from public albums"
  ON public.album_images
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = album_images.album_id
        AND a.privacy = 'public'
    )
  );

CREATE POLICY "owners can view their album images"
  ON public.album_images
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = album_images.album_id
        AND auth.uid() = a.user_id
    )
  );

CREATE POLICY "owners can insert album images"
  ON public.album_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = album_images.album_id
        AND auth.uid() = a.user_id
    )
  );

CREATE POLICY "owners can update album images"
  ON public.album_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = album_images.album_id
        AND auth.uid() = a.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = album_images.album_id
        AND auth.uid() = a.user_id
    )
  );

CREATE POLICY "owners can delete album images"
  ON public.album_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = album_images.album_id
        AND auth.uid() = a.user_id
    )
  );

-- Storage policies for album images bucket
CREATE POLICY "owners can upload album images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'album-images'
    AND auth.uid()::text = split_part(name, '/', 1)
    AND EXISTS (
      SELECT 1
      FROM public.albums a
      WHERE a.id = split_part(name, '/', 2)
        AND a.user_id = auth.uid()
    )
  );

CREATE POLICY "owners can manage their album images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'album-images'
    AND (
      auth.uid()::text = split_part(name, '/', 1)
      OR EXISTS (
        SELECT 1
        FROM public.album_images ai
        JOIN public.albums a ON a.id = ai.album_id
        WHERE ai.storage_path = storage.objects.name
          AND a.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "owners can read their album images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'album-images'
    AND (
      auth.uid()::text = split_part(name, '/', 1)
      OR EXISTS (
        SELECT 1
        FROM public.album_images ai
        JOIN public.albums a ON a.id = ai.album_id
        WHERE ai.storage_path = storage.objects.name
          AND a.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "public can view images from public albums"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'album-images'
    AND EXISTS (
      SELECT 1
      FROM public.album_images ai
      JOIN public.albums a ON a.id = ai.album_id
      WHERE ai.storage_path = storage.objects.name
        AND a.privacy = 'public'
    )
  );

COMMIT;
