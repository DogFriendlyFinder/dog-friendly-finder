# Photos JSON Auto-Sync System

## Overview

The `photos` JSON field in the `restaurants` table automatically stays in sync with the `images` table through database triggers. This means any time you add, update, or delete images in Supabase Storage or via the API, the `photos` JSON field is automatically updated.

## How It Works

### Database Triggers

Three PostgreSQL triggers ensure the `photos` JSON field is always up-to-date:

1. **sync_photos_on_insert** - Fires when a new image is added to the `images` table
2. **sync_photos_on_update** - Fires when an existing image is updated
3. **sync_photos_on_delete** - Fires when an image is deleted

### Sync Function

The `sync_restaurant_photos()` function:
- Queries all images for the restaurant from the `images` table
- Builds a JSON array with essential image metadata
- Updates the `photos` JSON field in the corresponding restaurant record
- Orders images by `display_order` (ASC) and `created_at` (ASC)

### Data Structure

The `photos` JSON field contains an array of image objects:

```json
[
  {
    "id": "uuid-here",
    "storage_path": "restaurants/slug_location/images/filename.jpg",
    "public_url": "https://supabase.co/storage/v1/object/public/places/...",
    "filename": "slug_location_descriptor_01.jpg",
    "alt_text": "Beautiful interior at Restaurant Name, Location",
    "title": "Restaurant Name - Interior | Dog Friendly Finder",
    "caption": "Short user-facing description of the image",
    "category": "interior",
    "descriptor": "dining-room",
    "is_primary": true,
    "display_order": 0,
    "width": 1200,
    "height": 800,
    "quality_score": 120
  },
  ...
]
```

## Installation

Run the migration to set up the triggers:

```bash
# Apply migration directly to Supabase
psql $DATABASE_URL < supabase/migrations/sync_photos_json.sql
```

Or via Supabase CLI:

```bash
supabase db push
```

## Usage

### Automatic Syncing

The triggers work automatically. Any time you:

1. **Upload images via API** - The `/api/restaurants/[id]/images/upload` endpoint creates records in the `images` table, which triggers the sync
2. **Delete images** - Deleting from `images` table or Supabase Storage triggers a resync
3. **Update image metadata** - Changing display_order, alt_text, etc. triggers a resync

### Manual Operations

#### Query photos JSON:
```sql
SELECT id, name, photos
FROM restaurants
WHERE id = 'restaurant-uuid';
```

#### Get primary photo:
```sql
SELECT photos->0 as primary_photo
FROM restaurants
WHERE id = 'restaurant-uuid';
```

#### Search by category:
```sql
SELECT * FROM restaurants
WHERE photos::jsonb @> '[{"category": "exterior"}]'::jsonb;
```

#### Count photos:
```sql
SELECT
  id,
  name,
  jsonb_array_length(COALESCE(photos::jsonb, '[]'::jsonb)) as photo_count
FROM restaurants;
```

## Workflow Integration

### Image Upload Pipeline

When you upload images through the admin UI:

1. **Downloading Images** - Fetches images from Apify Google Images + Firecrawl
2. **Filtering Images** - Claude Vision API analyzes and categorizes each image
3. **Uploading Images** - Images are uploaded to Supabase Storage
   - Metadata saved to `images` table
   - **Trigger fires automatically** → `photos` JSON field updated
   - Route also manually updates `photos` for immediate consistency

### Storage Operations

If you add/delete/modify images directly in Supabase Storage:

```sql
-- Add a new image record
INSERT INTO images (
  place_type, place_id, storage_path, public_url,
  filename, alt_text, title, category, display_order
) VALUES (
  'restaurant', 'uuid-here', 'path/to/image.jpg', 'public-url',
  'filename.jpg', 'Alt text', 'Title', 'food', 5
);
-- ↑ Trigger fires → photos JSON auto-updated

-- Delete an image
DELETE FROM images WHERE id = 'image-uuid';
-- ↑ Trigger fires → photos JSON auto-updated (image removed from array)

-- Update display order
UPDATE images SET display_order = 1 WHERE id = 'image-uuid';
-- ↑ Trigger fires → photos JSON auto-updated (order changed)
```

## Benefits

1. **Always in Sync** - No manual updates needed
2. **Consistent Data** - Photos JSON always reflects current state of images table
3. **Performance** - JSON field can be queried without JOINs
4. **Flexibility** - Direct database operations and API calls both trigger sync
5. **Live Reflection** - Any changes to images are immediately reflected in photos JSON

## Example Use Cases

### Frontend Queries

```typescript
// Get restaurant with photos
const { data } = await supabase
  .from('restaurants')
  .select('id, name, photos')
  .eq('id', restaurantId)
  .single()

// Access photos directly
const primaryPhoto = data.photos[0]
const interiorPhotos = data.photos.filter(p => p.category === 'interior')
```

### Bulk Operations

```sql
-- Get all restaurants with at least 5 photos
SELECT id, name, jsonb_array_length(photos::jsonb) as photo_count
FROM restaurants
WHERE jsonb_array_length(COALESCE(photos::jsonb, '[]'::jsonb)) >= 5;

-- Find restaurants missing photos
SELECT id, name FROM restaurants
WHERE photos IS NULL OR photos::jsonb = '[]'::jsonb;
```

## Maintenance

### Re-sync All Restaurants

If you need to manually re-sync all restaurant photos:

```sql
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
```

### Check Trigger Status

```sql
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'images'
  AND trigger_name LIKE 'sync_photos%';
```

## Troubleshooting

### Photos JSON not updating

1. Check triggers are enabled:
```sql
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'images';
```

2. Check for errors in PostgreSQL logs

3. Manually run the sync function:
```sql
SELECT sync_restaurant_photos();
```

### Incorrect photo order

Update the `display_order` field:
```sql
UPDATE images
SET display_order = 0
WHERE id = 'image-uuid-for-primary';

-- Trigger will fire and resort photos JSON automatically
```
