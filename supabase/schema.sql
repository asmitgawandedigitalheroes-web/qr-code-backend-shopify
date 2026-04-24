-- Run this in Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS galleries (
  id            BIGSERIAL PRIMARY KEY,
  gallery_token TEXT UNIQUE NOT NULL,
  session_id    TEXT,
  customer_name TEXT,
  event_id      TEXT,
  event_name    TEXT,
  qr_code_url   TEXT,
  status        TEXT DEFAULT 'active',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS photos (
  id           BIGSERIAL PRIMARY KEY,
  gallery_id   BIGINT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  photo_url    TEXT NOT NULL,
  storage_path TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_galleries_token ON galleries(gallery_token);
CREATE INDEX IF NOT EXISTS idx_photos_gallery_id ON photos(gallery_id);


-- -------------------------------------------------------
-- STORAGE BUCKET SETUP
-- Run this too, or create the bucket manually in the dashboard
-- -------------------------------------------------------

-- 1. Create a public bucket named "gallery-photos"
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT DO NOTHING;

-- 2. Allow public read access (anyone can view photos via URL)
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-photos');

-- 3. Allow backend (service role) to upload
CREATE POLICY "Service role upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-photos');

-- 4. Allow backend (service role) to delete
CREATE POLICY "Service role delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery-photos');
