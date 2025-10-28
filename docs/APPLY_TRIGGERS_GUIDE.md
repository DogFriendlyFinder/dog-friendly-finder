# How to Apply the Photos JSON Sync Triggers

## Overview

The photos JSON sync triggers need to be applied to your Supabase database **once** during setup. After that, they will automatically keep the `photos` JSON field in sync with the `images` table.

## Method 1: Supabase Dashboard (Recommended)

This is the easiest and most reliable method.

### Steps:

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project: `zhsceyvwaikdxajtiydj`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy the SQL**
   - Open the file: `/supabase/migrations/sync_photos_json.sql`
   - Copy the entire contents

4. **Execute the SQL**
   - Paste the SQL into the query editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

5. **Verify Success**
   You should see output indicating:
   - ✅ Function created: `sync_restaurant_photos()`
   - ✅ Trigger created: `sync_photos_on_insert`
   - ✅ Trigger created: `sync_photos_on_update`
   - ✅ Trigger created: `sync_photos_on_delete`
   - ✅ Existing restaurant photos synced

## Method 2: Supabase CLI

If you have the Supabase CLI installed:

```bash
# Navigate to project root
cd /Users/jamesgoodman/Dog-Friendly-Finder/dog-friendly-finder

# Login to Supabase (if not already)
supabase login

# Link to your project
supabase link --project-ref zhsceyvwaikdxajtiydj

# Apply the migration
supabase db push
```

## Method 3: Direct Database Connection

If you have `psql` installed and the database password:

```bash
# Set the DATABASE_URL in .env.local first:
# DATABASE_URL=postgresql://postgres.zhsceyvwaikdxajtiydj:[PASSWORD]@aws-0-eu-west-2.pooler.supabase.com:6543/postgres

# Then run:
psql $DATABASE_URL < supabase/migrations/sync_photos_json.sql
```

## Verification

After applying the triggers, verify they're active:

### SQL Query:

```sql
-- Check if triggers exist
SELECT
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'images'
  AND trigger_name LIKE 'sync_photos%'
ORDER BY trigger_name;
```

**Expected Result:**
```
trigger_name              | event_manipulation | action_timing
--------------------------+-------------------+--------------
sync_photos_on_delete     | DELETE            | AFTER
sync_photos_on_insert     | INSERT            | AFTER
sync_photos_on_update     | UPDATE            | AFTER
```

### Test the Trigger:

```sql
-- Get a restaurant ID with images
SELECT id, name FROM restaurants WHERE id IN (
  SELECT DISTINCT place_id FROM images WHERE place_type = 'restaurant' LIMIT 1
);

-- Check the photos JSON field
SELECT
  id,
  name,
  jsonb_array_length(COALESCE(photos::jsonb, '[]'::jsonb)) as photo_count,
  photos::jsonb -> 0 -> 'filename' as first_photo
FROM restaurants
WHERE id = 'your-restaurant-id-here';
```

If you see the photo count and first photo filename, the triggers are working! ✅

## Troubleshooting

### Issue: "permission denied for function"

**Solution:** Make sure you're using the service role key or connecting as the `postgres` user.

### Issue: "relation does not exist"

**Solution:** Ensure the `images` table exists. Run the database schema migrations first.

### Issue: Photos JSON field is empty

**Solution:** The trigger only fires on INSERT/UPDATE/DELETE. Run the manual sync query:

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

## What Happens Next?

Once the triggers are applied:

1. **Automatic Syncing** - Any time you add, update, or delete images:
   ```typescript
   // In your code:
   await supabase.from('images').insert({ ... })
   // ↓ Trigger fires automatically
   // ↓ photos JSON field updated
   ```

2. **Live Data** - The `photos` JSON field always reflects the current state of the `images` table

3. **No Manual Updates** - You never need to manually update the `photos` field

4. **Works Everywhere** - Triggers work for:
   - API uploads via `/api/restaurants/[id]/images/upload`
   - Direct database operations
   - Supabase Storage operations
   - Bulk imports

## Next Steps

After applying the triggers:

1. Test by uploading images through the admin UI at `/admin/add`
2. Check the `photos` JSON field is populated
3. Try deleting an image and verify it's removed from the JSON
4. Update an image's `display_order` and verify the JSON is re-sorted

For more details, see: [/docs/PHOTOS_JSON_SYNC.md](/docs/PHOTOS_JSON_SYNC.md)
