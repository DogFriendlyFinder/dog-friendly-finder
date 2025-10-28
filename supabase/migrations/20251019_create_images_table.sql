-- Create images table for storing all place images (restaurants, hotels, shops, attractions)
CREATE TABLE IF NOT EXISTS images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Polymorphic relationship (works for ANY place type)
  place_type TEXT NOT NULL CHECK (place_type IN ('restaurant', 'hotel', 'shop', 'attraction')),
  place_id UUID NOT NULL,

  -- Storage (source of truth)
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  original_url TEXT,

  -- SEO Metadata (AI-Generated)
  filename TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  title TEXT NOT NULL,
  caption TEXT,

  -- AI Classification
  category TEXT NOT NULL,
  descriptor TEXT NOT NULL,
  ai_description TEXT,

  -- Dog-Friendly Context
  is_dog_friendly_relevant BOOLEAN DEFAULT false,
  dog_amenity_type TEXT,

  -- Metadata
  source TEXT NOT NULL,
  quality_score INTEGER,
  width INTEGER,
  height INTEGER,

  -- Display
  is_primary BOOLEAN DEFAULT false,
  display_order INTEGER,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_images_place ON images(place_type, place_id);
CREATE INDEX IF NOT EXISTS idx_images_storage_path ON images(storage_path);
CREATE INDEX IF NOT EXISTS idx_images_is_primary ON images(is_primary) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_images_display_order ON images(display_order) WHERE display_order IS NOT NULL;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_update_images_updated_at
  BEFORE UPDATE ON images
  FOR EACH ROW
  EXECUTE FUNCTION update_images_updated_at();

-- Add comment to table
COMMENT ON TABLE images IS 'Stores images for all place types (restaurants, hotels, shops, attractions) with AI-generated SEO metadata';
