-- Trigger to automatically sync photos JSON field in restaurants table
-- when images are added, updated, or deleted in the images table

-- Function to sync photos JSON from images table to restaurants table
CREATE OR REPLACE FUNCTION sync_restaurant_photos()
RETURNS TRIGGER AS $$
DECLARE
  target_restaurant_id uuid;
BEGIN
  -- Determine which restaurant to update
  IF TG_OP = 'DELETE' THEN
    target_restaurant_id := OLD.place_id;
  ELSE
    target_restaurant_id := NEW.place_id;
  END IF;

  -- Only sync if this is a restaurant image
  IF (TG_OP = 'DELETE' AND OLD.place_type = 'restaurant') OR
     (TG_OP != 'DELETE' AND NEW.place_type = 'restaurant') THEN

    -- Update the photos JSON field in restaurants table
    UPDATE restaurants
    SET photos = (
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'id', i.id,
            'storage_path', i.storage_path,
            'public_url', i.public_url,
            'filename', i.filename,
            'alt_text', i.alt_text,
            'title', i.title,
            'caption', i.caption,
            'category', i.category,
            'descriptor', i.descriptor,
            'is_primary', i.is_primary,
            'display_order', i.display_order,
            'width', i.width,
            'height', i.height,
            'quality_score', i.quality_score
          ) ORDER BY i.display_order ASC, i.created_at ASC
        ),
        '[]'::json
      )
      FROM images i
      WHERE i.place_id = target_restaurant_id
        AND i.place_type = 'restaurant'
    )
    WHERE id = target_restaurant_id;

  END IF;

  -- Return appropriate record
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_photos_on_insert ON images;
DROP TRIGGER IF EXISTS sync_photos_on_update ON images;
DROP TRIGGER IF EXISTS sync_photos_on_delete ON images;

-- Create triggers for INSERT, UPDATE, and DELETE
CREATE TRIGGER sync_photos_on_insert
  AFTER INSERT ON images
  FOR EACH ROW
  EXECUTE FUNCTION sync_restaurant_photos();

CREATE TRIGGER sync_photos_on_update
  AFTER UPDATE ON images
  FOR EACH ROW
  EXECUTE FUNCTION sync_restaurant_photos();

CREATE TRIGGER sync_photos_on_delete
  AFTER DELETE ON images
  FOR EACH ROW
  EXECUTE FUNCTION sync_restaurant_photos();

-- Manually sync all existing restaurant photos
UPDATE restaurants
SET photos = (
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'id', i.id,
        'storage_path', i.storage_path,
        'public_url', i.public_url,
        'filename', i.filename,
        'alt_text', i.alt_text,
        'title', i.title,
        'caption', i.caption,
        'category', i.category,
        'descriptor', i.descriptor,
        'is_primary', i.is_primary,
        'display_order', i.display_order,
        'width', i.width,
        'height', i.height,
        'quality_score', i.quality_score
      ) ORDER BY i.display_order ASC, i.created_at ASC
    ),
    '[]'::json
  )
  FROM images i
  WHERE i.place_id = restaurants.id
    AND i.place_type = 'restaurant'
)
WHERE EXISTS (
  SELECT 1 FROM images WHERE place_id = restaurants.id AND place_type = 'restaurant'
);
