-- Add popular_times_raw column to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS popular_times_raw jsonb;

-- Add comment for documentation
COMMENT ON COLUMN restaurants.popular_times_raw IS 'Raw popular times histogram data from Google Maps scrape (via Apify)';
