-- SQL Script to Check Restaurant Data Status
-- Run this in your Supabase SQL Editor to see the current state

-- Query the three sample restaurants
SELECT
  id,
  name,
  slug,
  city,
  price_range,
  website,

  -- Check which raw data sources exist
  CASE WHEN apify_output IS NOT NULL THEN 'YES' ELSE 'NO' END as has_apify_output,
  CASE WHEN firecrawl_output IS NOT NULL THEN 'YES' ELSE 'NO' END as has_firecrawl_output,
  CASE WHEN menu_data IS NOT NULL THEN 'YES' ELSE 'NO' END as has_menu_data,

  -- Check which AI-generated fields are populated
  CASE WHEN about IS NOT NULL THEN 'YES' ELSE 'NO' END as has_about,
  CASE WHEN best_times_description IS NOT NULL THEN 'YES' ELSE 'NO' END as has_best_times_desc,
  CASE WHEN public_review_sentiment IS NOT NULL THEN 'YES' ELSE 'NO' END as has_review_sentiment,
  CASE WHEN sentiment_score IS NOT NULL THEN 'YES' ELSE 'NO' END as has_sentiment_score,
  CASE WHEN faqs IS NOT NULL THEN 'YES' ELSE 'NO' END as has_faqs,
  CASE WHEN ratings IS NOT NULL THEN 'YES' ELSE 'NO' END as has_ratings,
  CASE WHEN hours::text != '{}' THEN 'YES' ELSE 'NO' END as has_hours,
  CASE WHEN social_media_urls IS NOT NULL THEN 'YES' ELSE 'NO' END as has_social_media,
  CASE WHEN best_times_buzzing IS NOT NULL THEN 'YES' ELSE 'NO' END as has_best_times_buzzing,
  CASE WHEN best_times_relaxed IS NOT NULL THEN 'YES' ELSE 'NO' END as has_best_times_relaxed,
  CASE WHEN best_times_with_dogs IS NOT NULL THEN 'YES' ELSE 'NO' END as has_best_times_with_dogs,
  CASE WHEN getting_there_public IS NOT NULL THEN 'YES' ELSE 'NO' END as has_getting_there_public,
  CASE WHEN getting_there_car IS NOT NULL THEN 'YES' ELSE 'NO' END as has_getting_there_car,
  CASE WHEN getting_there_with_dogs IS NOT NULL THEN 'YES' ELSE 'NO' END as has_getting_there_with_dogs,
  CASE WHEN accessibility_features IS NOT NULL THEN 'YES' ELSE 'NO' END as has_accessibility_features,
  CASE WHEN restaurant_awards IS NOT NULL THEN 'YES' ELSE 'NO' END as has_restaurant_awards

FROM restaurants
WHERE id IN (
  'fd3706ee-473f-4635-b56d-466351aabc75',  -- 74 Duke
  'bb83d14d-4589-4ae4-8210-c276dbd016c1',  -- It's Bagels Notting Hill
  'eec3b644-07a2-4b82-8833-d8482e7f5546'   -- Abuelo
)
ORDER BY name;


-- Get a sample of the raw data structure for one restaurant
SELECT
  id,
  name,
  jsonb_pretty(apify_output) as apify_output_sample,
  jsonb_pretty(firecrawl_output) as firecrawl_output_sample,
  jsonb_pretty(menu_data) as menu_data_sample
FROM restaurants
WHERE id = 'fd3706ee-473f-4635-b56d-466351aabc75'
LIMIT 1;
