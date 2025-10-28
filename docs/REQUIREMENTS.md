# Dog Friendly Finder - Requirements & Technical Specification

## Project Overview

Dog Friendly Finder is a comprehensive directory of dog-friendly restaurants in the UK, optimized for both traditional SEO and LLM search rankings. The platform automatically scrapes, processes, and enriches restaurant data using AI to create detailed, SEO-optimized listings.

## System Architecture

### Core Workflow

1. **Admin Input**: Admin enters restaurant name via Google Places API autocomplete
2. **Data Collection**: Apify Google Places scraper extracts comprehensive restaurant data (primary source)
3. **Supplementary Scraping**: Firecrawl v2 scrapes additional data from review sites and delivery platforms (secondary sources)
4. **AI Processing**: Anthropic API structures and enriches scraped data
5. **Quality Control**: OpenAI Vision API validates image quality
6. **Database Population**: Structured data populates Supabase PostgreSQL database
7. **Public Display**: SEO-optimized pages with dynamically generated schema markup

---

## Database Schema

### Simplified Restaurant-Focused Architecture

The database is designed with a clean, focused structure specifically for restaurants. This architecture prioritizes simplicity and speed for the MVP while remaining extensible for future growth.

**Design Principles:**
- Restaurant-centric core table with all essential data
- Lookup tables for classifications (cuisines, categories, meals, features, dishes)
- Many-to-many join tables for flexible relationships
- SEO-optimized metadata in all lookup tables
- Clear naming conventions for scalability

---

## Database Tables

### Total: 10 Core Tables + 6 Join Tables = 16 Tables

---

### 1. Core Table

#### `restaurants`
Main restaurant table containing all restaurant data.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Restaurant name (NOT NULL) |
| `slug` | text | URL-friendly slug (unique, NOT NULL) |
| `address` | text | Full formatted address (NOT NULL) |
| `phone` | text | International format (nullable) |
| `latitude` | numeric | Latitude coordinate (NOT NULL) |
| `longitude` | numeric | Longitude coordinate (NOT NULL) |
| `coordinates` | geography(point) | PostGIS point for proximity queries |
| `neighborhood` | text | Neighborhood/area (nullable) |
| `city` | text | City/town (NOT NULL) |
| `country` | text | Default: "United Kingdom" |
| `price_range` | text | CHECK IN ('£', '££', '£££', '££££') |
| `about` | text | SEO-optimized description (AI-generated, 200-300 words) |
| `hours` | jsonb | Operating hours (structure below) |
| `website` | text | Official website URL (nullable) |
| `social_media_urls` | jsonb | Social media links (structure below) |
| `google_place_id` | text | Google Places API identifier (nullable) |
| `dress_code` | text | Dress code requirements (nullable) |
| `apify_output` | jsonb | Complete Apify API response (source of truth for Google Places data) |
| `firecrawl_output` | jsonb | Aggregated Firecrawl scrape results from review sites |
| `menu_data` | jsonb | Structured menu data from Firecrawl menu scraping (source of truth) |
| `menu_last_parsed` | timestamptz | When menu_data was last parsed to items table |
| `reservations_url` | text | Booking link (nullable) |
| `reservations_required` | boolean | Default: false |
| `best_times_description` | text | Narrative guide to best visiting times |
| `best_times_buzzing` | text[] | Busy time periods array (from Google Maps Popular Times) |
| `best_times_relaxed` | text[] | Quiet time periods array (from Google Maps Popular Times) |
| `best_times_with_dogs` | text[] | Optimal times for dog owners (AI-generated from Popular Times data) |
| `popular_times_raw` | jsonb | Raw popular times data from Google Maps scrape |
| `getting_there_public` | text | Public transport directions |
| `getting_there_car` | text | Driving directions and parking |
| `getting_there_with_dogs` | text | Dog-specific transportation notes |
| `public_review_sentiment` | text | AI-generated review summary |
| `sentiment_score` | numeric(3,1) | Aggregate sentiment score (0-10) |
| `sentiment_updated_at` | timestamptz | Last sentiment analysis date |
| `review_sources` | jsonb | Review counts per platform (structure below) |
| `ratings` | jsonb | Detailed rating scores (structure below) |
| `restaurant_awards` | jsonb | General awards array |
| `michelin_stars` | integer | 0-3 for filtering |
| `michelin_guide_award_id` | uuid | FK → michelin_guide_awards.id |
| `faqs` | jsonb | Frequently asked questions (structure below) |
| `photos` | jsonb | Selected photos array (structure below) |
| `accessibility_features` | text[] | Accessibility features array |
| `data_sources` | jsonb | Track data source per field |
| `seo_schema_overrides` | jsonb | Optional custom schema tweaks (nullable) |
| `last_scraped_at` | timestamptz | Last full scrape timestamp |
| `created_at` | timestamptz | Default: now() |
| `updated_at` | timestamptz | Default: now(), auto-updated |
| `published` | boolean | Default: false |
| `featured` | boolean | Default: false |

**Indexes:**
- `slug` (unique)
- `published`
- `city`
- `coordinates` (GIST index for geospatial queries)
- `michelin_guide_award_id`

**JSON Structures:**

```json
// hours
{
  "monday": {"open": "09:00", "close": "22:00"},
  "tuesday": {"open": "09:00", "close": "22:00"},
  "wednesday": {"open": "09:00", "close": "22:00"},
  "thursday": {"open": "09:00", "close": "22:00"},
  "friday": {"open": "09:00", "close": "23:00"},
  "saturday": {"open": "10:00", "close": "23:00"},
  "sunday": {"closed": true}
}

// social_media_urls
{
  "facebook": "https://facebook.com/bluebird",
  "instagram": "https://instagram.com/bluebirdchelsea",
  "twitter": "https://twitter.com/bluebird",
  "tiktok": null
}

// ratings
{
  "food_quality": 8.8,
  "service": 7.2,
  "ambiance": 8.7,
  "value_for_money": 9.2,
  "accessibility_amenities": 8.2,
  "dog_friendly_score": 9.2,
  "overall_score": 8.6,
  "last_updated": "2024-10-13T12:00:00Z"
}

// Overall score calculation:
// overall_score = (food_quality * 0.25) + (service * 0.20) + (ambiance * 0.15) +
//                 (value_for_money * 0.15) + (accessibility_amenities * 0.10) +
//                 (dog_friendly_score * 0.15)

// restaurant_awards
[
  {
    "name": "World's 50 Best Restaurants",
    "year": 2024,
    "rank": 23
  },
  {
    "name": "AA Rosette",
    "level": "3 Rosettes",
    "year": 2024
  }
]

// faqs
[
  {
    "question": "Are dogs allowed inside or only in outdoor areas?",
    "answer": "Dogs are welcome in our outdoor terrace year-round..."
  }
]

// photos (selected images only - scraped images not stored in DB)
[
  {
    "url": "https://zhsceyvwaikdxajtiydj.supabase.co/storage/v1/object/public/places/restaurants/bluebird-chelsea/selected/hero.jpg",
    "photo_type": "exterior",
    "caption": "Elegant entrance on King's Road",
    "alt_text": "Bluebird Chelsea restaurant exterior",
    "display_order": 1
  }
]

// review_sources
{
  "google": {"count": 1250, "average": 4.5},
  "tripadvisor": {"count": 850, "average": 4.2},
  "opentable": {"count": 320, "average": 4.6}
}

// apify_output (complete Apify API response - source of truth)
{
  "title": "The Spaniards Inn",
  "description": "Historic 16th-century pub...",
  "categoryName": "Pub",
  "address": "Spaniards Rd, Hampstead, London NW3 7JJ, UK",
  "street": "Spaniards Road",
  "city": "London",
  "postalCode": "NW3 7JJ",
  "countryCode": "GB",
  "website": "https://www.thespaniardshampstead.co.uk",
  "phone": "+44 20 8731 8406",
  "menu": "https://www.thespaniardshampstead.co.uk/menus",
  "placeId": "ChIJix2arm8adkgR6AQ5Md_aF8Y",
  "location": {"lat": 51.5686, "lng": -0.1653},
  "price": "££",
  "totalScore": 4.4,
  "reviewsCount": 6049,
  "openingHours": [
    {"day": "Monday", "hours": "12:00 PM - 11:00 PM"},
    {"day": "Tuesday", "hours": "12:00 PM - 11:00 PM"}
  ],
  "popularTimesHistogram": {
    "Mo": [{"hour": 6, "occupancyPercent": 0}, {"hour": 12, "occupancyPercent": 45}],
    "Tu": [{"hour": 6, "occupancyPercent": 0}],
    "Su": [{"hour": 15, "occupancyPercent": 85}]
  },
  "popularDishes": ["Fish and Chips", "Sunday Roast", "Sticky Toffee Pudding"],
  "additionalInfo": {
    "Pets": [{"Dogs allowed": true}],
    "Planning": [{"Accepts reservations": true}],
    "Accessibility": ["Wheelchair accessible entrance"],
    "Amenities": ["Outdoor seating", "Fireplace"],
    "Payments": ["Credit cards", "Debit cards"]
  },
  "imageUrls": ["https://...", "https://..."],
  "reviews": [
    {
      "text": "Great pub with lovely beer garden...",
      "rating": 5,
      "publishedAtDate": "2024-03-15",
      "authorName": "John Smith"
    }
  ]
}

// firecrawl_output (aggregated from multiple sources)
{
  "tripadvisor": {
    "rating": 4.5,
    "reviews_count": 850,
    "ranking": "#12 of 1,234 restaurants in London",
    "price_range": "££-£££",
    "cuisines": ["British", "Pub"],
    "special_diets": ["Vegetarian Friendly", "Vegan Options"],
    "scraped_at": "2024-03-20T10:30:00Z"
  },
  "opentable": {
    "rating": 4.6,
    "reviews_count": 320,
    "price_range": "££",
    "available_times": ["12:00", "12:30", "13:00"],
    "scraped_at": "2024-03-20T10:31:00Z"
  },
  "thefork": {
    "rating": 4.3,
    "reviews_count": 210,
    "offers": ["20% off food"],
    "scraped_at": "2024-03-20T10:32:00Z"
  },
  "deliveroo": {
    "available": true,
    "delivery_fee": "£2.99",
    "min_order": "£15",
    "popular_items": ["Fish and Chips", "Burger"],
    "scraped_at": "2024-03-20T10:33:00Z"
  }
}

// menu_data (structured menu from Firecrawl)
{
  "menu_url": "https://www.thespaniardshampstead.co.uk/menus",
  "scraped_at": "2024-03-20T10:35:00Z",
  "sections": [
    {
      "name": "Starters",
      "items": [
        {
          "name": "Soup of the Day",
          "description": "Served with crusty bread",
          "price": 6.50,
          "dietary": ["vegetarian"]
        }
      ]
    },
    {
      "name": "Mains",
      "items": [
        {
          "name": "Fish and Chips",
          "description": "Beer-battered cod with chips and mushy peas",
          "price": 14.95,
          "popular": true
        }
      ]
    }
  ]
}
```

---

### 2. Classification Lookup Tables (with SEO fields)

#### `restaurant_cuisines`
Cuisine types (e.g., Japanese, Italian, British).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Display name (e.g., "Japanese") |
| `slug` | text | URL slug (unique) (e.g., "japanese-restaurants") |
| `description` | text | SEO description |
| `meta_title` | text | SEO meta title |
| `meta_description` | text | SEO meta description |
| `created_at` | timestamptz | Default: now() |

**Enables:** `/places-to-eat/cuisines/japanese-restaurants`

**Join Table:** `restaurant_cuisine_links`
- `restaurant_id` (FK → restaurants.id)
- `cuisine_id` (FK → restaurant_cuisines.id)
- PRIMARY KEY (restaurant_id, cuisine_id)

---

#### `restaurant_categories`
Restaurant types (e.g., Fine Dining, Casual, Gastropub).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Display name (e.g., "Fine Dining") |
| `slug` | text | URL slug (unique) (e.g., "fine-dining") |
| `description` | text | SEO description |
| `meta_title` | text | SEO meta title |
| `meta_description` | text | SEO meta description |
| `created_at` | timestamptz | Default: now() |

**Enables:** `/places-to-eat/categories/fine-dining`

**Join Table:** `restaurant_category_links`
- `restaurant_id` (FK → restaurants.id)
- `category_id` (FK → restaurant_categories.id)
- PRIMARY KEY (restaurant_id, category_id)

---

#### `restaurant_meals`
Meal types served (e.g., Breakfast, Lunch, Dinner).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Meal name (e.g., "Dinner") |
| `slug` | text | URL slug (unique) (e.g., "dinner") |
| `description` | text | SEO description |
| `meta_title` | text | SEO meta title |
| `meta_description` | text | SEO meta description |
| `created_at` | timestamptz | Default: now() |

**Enables:** `/places-to-eat/breakfast`, `/places-to-eat/dinner`

**Join Table:** `restaurant_meal_links`
- `restaurant_id` (FK → restaurants.id)
- `meal_id` (FK → restaurant_meals.id)
- PRIMARY KEY (restaurant_id, meal_id)

---

#### `restaurant_features`
Amenities and features (e.g., Dog Bowls, Outdoor Seating, WiFi).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Feature name (e.g., "Dog Water Bowls") |
| `slug` | text | URL slug (unique) |
| `icon` | text | Icon identifier for UI |
| `feature_category` | text | Grouping (e.g., "dog_amenities", "outdoor_dining") |
| `created_at` | timestamptz | Default: now() |

**Join Table:** `restaurant_feature_links`
- `restaurant_id` (FK → restaurants.id)
- `feature_id` (FK → restaurant_features.id)
- PRIMARY KEY (restaurant_id, feature_id)

---

#### `restaurant_dish_categories`
Dish categories for SEO pages (e.g., Pizza, Sushi, Burgers).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Category name (e.g., "Pizza") |
| `slug` | text | URL slug (unique) (e.g., "pizza") |
| `description` | text | SEO description |
| `meta_title` | text | SEO meta title |
| `meta_description` | text | SEO meta description |
| `created_at` | timestamptz | Default: now() |

**Enables:** `/dishes/pizza`, `/dishes/sushi`

---

#### `restaurant_dishes`
Canonical dishes for SEO pages.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Dish name (e.g., "Margherita Pizza") |
| `slug` | text | URL slug (unique) (e.g., "margherita-pizza") |
| `description` | text | General dish description |
| `dish_category_id` | uuid | FK → restaurant_dish_categories.id |
| `cuisine_id` | uuid | FK → restaurant_cuisines.id (nullable) |
| `popular` | boolean | Marked as popular dish (from Apify popularDishes data) |
| `meta_title` | text | SEO meta title |
| `meta_description` | text | SEO meta description |
| `created_at` | timestamptz | Default: now() |

**Indexes:**
- `popular` (partial index WHERE popular = true)

**Join Table:** `restaurant_dish_links`
- `restaurant_id` (FK → restaurants.id)
- `dish_id` (FK → restaurant_dishes.id)
- `notes` (text, nullable) - E.g., "Chef's signature version"
- PRIMARY KEY (restaurant_id, dish_id)

---

#### `michelin_guide_awards`
Michelin Guide recognition types.

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `name` | text | Award name (e.g., "One Michelin Star") |
| `slug` | text | URL slug (unique) (e.g., "one-michelin-star") |
| `description` | text | SEO description |
| `icon_url` | text | Icon/badge image URL |
| `stars` | integer | Number of stars (1-3, NULL for non-starred) |
| `sort_order` | integer | Display ordering |
| `created_at` | timestamptz | Default: now() |

---

### 3. Menu Items Table

#### `restaurant_menu_items`
Individual menu items (extracted from menu_raw).

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `restaurant_id` | uuid | FK → restaurants.id (NOT NULL) |
| `section_name` | text | Section name (e.g., "Starters", "Mains") |
| `item_name` | text | Dish name (NOT NULL) |
| `description` | text | Dish description (nullable) |
| `price` | numeric(10,2) | Price amount (nullable) |
| `currency` | text | Default: "GBP" |
| `dietary_tags` | text[] | Array: ["vegetarian", "gluten-free", "vegan"] |
| `display_order` | integer | Ordering within section |
| `created_at` | timestamptz | Default: now() |
| `updated_at` | timestamptz | Default: now(), auto-updated |

**Indexes:**
- `restaurant_id`
- `dietary_tags` (GIN index)
- Full-text search on `item_name` and `description` (GIN index)

---

## Image Storage Structure

**Supabase Storage Bucket:** `places`

```
places/
  restaurants/
    bluebird-chelsea/
      scraped/          ← Temporary storage for AI evaluation
        01_exterior.jpg
        02_interior.jpg
        03_food_1.jpg
        ...
      selected/         ← Final approved images
        hero.jpg
        gallery_01.jpg
        gallery_02.jpg
        ...
```

**Image Workflow:**
1. Firecrawl returns image URLs
2. Download and upload to `scraped/` folder
3. Send Supabase URLs to OpenAI Vision API for quality scoring
4. Images with score > 7.0 moved to `selected/` folder
5. Selected image URLs stored in `restaurants.photos` JSONB field
6. Scraped images can be deleted after processing (or kept for audit)

**Note:** Only selected photos are stored in the database (in JSONB format).

---

## SEO Schema Generation System

### Architecture: Dynamic Schema Generation

**Design Decision:** Schema is **generated dynamically** on page render, NOT stored in database.

**Why Dynamic Generation?**
- Always reflects current database data (no sync issues)
- Easy to update schema formats globally (just update generator code)
- No data duplication
- Minimal performance overhead with caching

### Schema Service Architecture

```
/lib/schema/

  # Type-specific generators
  types/
    restaurant.ts       ← Generates Restaurant + LocalBusiness schema

  # Shared generators (reusable)
  shared/
    menu.ts             ← Menu schema
    award.ts            ← Award schema
    faq.ts              ← FAQPage schema
    breadcrumb.ts       ← BreadcrumbList schema
    rating.ts           ← AggregateRating schema

  # Utilities
  utils/
    hours.ts            ← Transform hours JSONB to schema format
    social.ts           ← Transform social_media_urls to sameAs array

  # Main orchestrator
  index.ts              ← Main entry point
```

### Database Fields Used for Schema

- `restaurants.name` → schema.name
- `restaurants.about` → schema.description
- `restaurants.address` → schema.address.streetAddress
- `restaurants.city` → schema.address.addressLocality
- `restaurants.neighborhood` → schema.address.addressRegion
- `restaurants.country` → schema.address.addressCountry
- `restaurants.social_media_urls` → schema.sameAs
- `restaurants.hours` → schema.openingHoursSpecification
- `restaurants.ratings` → schema.aggregateRating
- `restaurants.restaurant_awards` → schema.award
- `restaurants.faqs` → FAQPage schema
- `restaurants.photos` → schema.image
- `restaurants.accessibility_features` → schema.accessibilityFeature
- `restaurant_menu_items` → Menu schema

---

## URL Structure (SEO)

### Core Pages
- `/places-to-eat` - Main listing
- `/places-to-eat/restaurants` - All restaurants
- `/places-to-eat/restaurants/[slug]` - Individual restaurant

### Filtered Pages
- `/places-to-eat/cuisines/[slug]` - By cuisine (e.g., `/places-to-eat/cuisines/japanese-restaurants`)
- `/places-to-eat/categories/[slug]` - By category (e.g., `/places-to-eat/categories/fine-dining`)
- `/places-to-eat/meals/[slug]` - By meal (e.g., `/places-to-eat/breakfast`)

### Dish Pages
- `/dishes` - All featured dishes
- `/dishes/[slug]` - Individual dish (e.g., `/dishes/sushi`)

### Location Pages (Future)
- `/places-to-eat/london` - By city
- `/places-to-eat/london/chelsea` - By neighborhood

---

## Data Collection Workflow

### Key Database Strategy

**Raw Data Storage Approach:**
All API responses are stored in JSONB columns for audit trail and reprocessing capability:
- `restaurants.apify_output` - Complete Apify Google Places response
- `restaurants.firecrawl_output` - Aggregated review site data
- `restaurants.menu_data` - Structured menu from Firecrawl

**Benefits:**
- ✅ Never need to re-scrape if processing fails
- ✅ Complete audit trail of all source data
- ✅ Can reprocess with different AI prompts without additional API costs
- ✅ Debug data issues by examining raw inputs
- ✅ Track data provenance for each field

**Workflow Summary:**
1. Create restaurant record immediately (Stage 0)
2. Store raw API outputs in JSONB columns (Stages 1-3)
3. Process raw data with Anthropic to generate content (Stage 7)
4. Populate structured tables from processed data (Stage 8)

---

### Phase 1: Google Places Autocomplete
**Admin Interface Location:** `/admin/add`

**User Flow:**
- Admin uses Google Places Autocomplete input field
- Types restaurant name (e.g., "The Spaniards Inn, Hampstead")
- Real-time dropdown shows matching places with:
  - Name
  - Formatted address
  - Google rating
  - Total reviews
- Admin selects place from dropdown
- Selected place displays as a card with summary info
- "Run" button becomes enabled

**Captured Data:**
- `google_place_id` (e.g., `ChIJix2arm8adkgR6AQ5Md_aF8Y`)
- `name`
- `formatted_address`
- `geometry.location` (lat/lng coordinates)
- `rating`
- `user_ratings_total`

### Phase 2: Multi-Source Data Scraping
**API Integration:** Apify (primary) + Firecrawl v2 (secondary) + Google Places API

**Process Overview:**
1. User clicks "Run" → Create restaurant record immediately with Google Places Autocomplete data
2. Apify Fetch → Store complete response in `apify_output` jsonb column
3. Firecrawl General Fetch → Store aggregated results in `firecrawl_output` jsonb column
4. Firecrawl Menu Fetch → Store structured menu in `menu_data` jsonb column
5. Later stages process these raw outputs with Anthropic for content generation

**Process Stages (displayed in UI with status indicators):**

**Stage 0: Create Restaurant Record (IMMEDIATE)**
When "Run" button is clicked:
- Create `restaurants` record with data from Google Places Autocomplete:
  - `google_place_id`
  - `name`
  - `address`
  - `latitude`, `longitude`
  - `city` (extracted from address)
  - `published: false`
- Return `restaurant_id` to frontend for subsequent API calls
- All subsequent stages update this existing record

**Stage 1: Apify Fetch (PRIMARY SOURCE)**
1. **Apify Google Places Scraper** ⭐ **PRIMARY DATA SOURCE**
   - **Actor:** `compass/crawler-google-places`
   - **API Endpoint:** `https://api.apify.com/v2/acts/compass~crawler-google-places/runs`
   - **Authentication:** Bearer token with `APIFY_API_KEY`
   - **Input Configuration:**
     ```json
     {
       "includeWebResults": false,
       "language": "en",
       "maxCrawledPlacesPerSearch": 1,
       "maxImages": 0,
       "maximumLeadsEnrichmentRecords": 0,
       "placeIds": ["ChIJix2arm8adkgR6AQ5Md_aF8Y"],
       "scrapeContacts": false,
       "scrapeDirectories": false,
       "scrapeImageAuthors": false,
       "scrapePlaceDetailPage": false,
       "scrapeReviewsPersonalData": true,
       "scrapeTableReservationProvider": false,
       "skipClosedPlaces": false,
       "searchMatching": "all",
       "placeMinimumStars": "",
       "website": "allPlaces",
       "maxQuestions": 0,
       "maxReviews": 0,
       "reviewsSort": "newest",
       "reviewsFilterString": "",
       "reviewsOrigin": "all",
       "allPlacesNoSearchAction": ""
     }
     ```
   - **Workflow:**
     1. Start actor run via POST request
     2. Poll run status every 2 seconds (max 60 attempts = 2 minutes)
     3. When status = "SUCCEEDED", fetch results from dataset
   - **Extracted Data (Comprehensive):**
     - **Basic Information:**
       - `title` - Restaurant name
       - `description` - Business description
       - `categoryName` - Primary cuisine/category
       - `address` - Full formatted address
       - `street`, `city`, `postalCode`, `countryCode` - Address components
       - `phone` - Phone number
       - `website` - Official website URL
       - `menu` - Menu URL
       - `placeId` - Google Place ID
       - `location` - `{ lat, lng }` coordinates
       - `price` - Price range (e.g., "$$")
     - **Ratings & Reviews:**
       - `totalScore` - Overall rating (e.g., 4.4)
       - `reviewsCount` - Total number of reviews
       - Individual reviews with text, ratings, dates, author info
     - **Operating Hours:**
       - `openingHours` - Array of `{ day, hours }` objects
       - Example: `[{ day: "Monday", hours: "12:00 PM - 11:00 PM" }]`
     - **Popular Times Histogram** ⭐ **KEY FEATURE**
       - `popularTimesHistogram` - Structured hourly occupancy data
       - Format:
         ```json
         {
           "Mo": [{ "hour": 6, "occupancyPercent": 0 }, { "hour": 7, "occupancyPercent": 12 }, ...],
           "Tu": [...],
           "We": [...],
           "Th": [...],
           "Fr": [...],
           "Sa": [...],
           "Su": [...]
         }
         ```
       - **Why this is critical:** Enables calculation of busiest/quietest times for dog-friendly recommendations
     - **Additional Information:**
       - `additionalInfo.Pets` - Array with `"Dogs allowed"` boolean
       - `additionalInfo.Planning` - Array with `"Accepts reservations"` boolean
       - `additionalInfo.Accessibility` - Accessibility features
       - `additionalInfo.Amenities` - Available amenities
       - `additionalInfo.Offerings` - Service offerings
       - `additionalInfo.Payments` - Accepted payment methods
     - **Images:**
       - `imageUrls` - Array of high-quality image URLs
       - Categories: exterior, interior, food, menu, etc.
   - **Response Format:**
     ```json
     {
       "success": true,
       "data": [{ /* full restaurant data */ }],
       "runId": "abc123",
       "datasetId": "def456"
     }
     ```
   - **Database Storage:**
     - Store complete response in `restaurants.apify_output` jsonb column
     - Extract and populate individual fields:
       - `name`, `address`, `phone`, `website`
       - `price_range` (from `price`)
       - `hours` jsonb (from `openingHours`)
       - `popular_times_raw` jsonb (from `popularTimesHistogram`)
       - Update `last_scraped_at` timestamp

**Stage 2: Firecrawl General Fetch (SECONDARY SOURCE)**
1. **Multi-Source Data Scraping** via Firecrawl v2 API
   - **API Endpoint:** `https://api.firecrawl.dev/v1/scrape` (POST)
   - **Authentication:** Bearer token with `FIRECRAWL_API_KEY`
   - **Search Strategy:** Build location-aware query: `"{name} {location}"`
     - Location extracted from address (neighborhood preferred over city)
     - Removes postcode using regex: `/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/i`
     - Example: "Gaucho Hampstead 64 Heath St"

   - **Scraping Approach:** Google Search + Homepage (parallel execution)
     - **Parallel Execution:** All scrapes run simultaneously for performance
     - **Google Search Scraping Strategy:**
       - Scrape Google search results pages (not direct site URLs)
       - Why: More reliable than direct scraping (sites block bots)
       - Contains: Links, reviews, ratings, contact info, popular times
       - Example URL: `https://www.google.com/search?q=${encodeURIComponent(query)}`

     - **8-10 Scrapes per Restaurant:**
       1. Social Media (3): `{baseQuery} instagram`, `{baseQuery} facebook`, `{baseQuery} tiktok`
       2. Review Sites (2): `{baseQuery} tripadvisor`, `{baseQuery} opentable`
       3. Awards (2): `{baseQuery} awards`, `{baseQuery} michelin`
       4. Homepage (1): Direct scrape of `website` from Google Places data
       5. Menu (1-2): Hybrid approach (see Stage 3)

   - **Request Configuration:**
     ```json
     {
       "url": "https://www.google.com/search?q=...",
       "formats": ["markdown"],
       "onlyMainContent": true,
       "waitFor": 2000
     }
     ```

   - **Response Structure:**
     ```json
     {
       "success": true,
       "data": {
         "markdown": "...",
         "metadata": {
           "title": "...",
           "description": "...",
           "statusCode": 200,
           "url": "...",
           "scrapeId": "...",
           "creditsUsed": 1
         }
       }
     }
     ```

   - **What's Captured from Google Search Results:**
     - Social media profile URLs and follower counts
     - TripAdvisor: ratings, review count, ranking
     - OpenTable: reservation links, ratings
     - Awards and recognition mentions
     - Michelin Guide presence
     - Restaurant contact info (phone, hours, address)
     - Popular times data from Google Business Panel
     - Review snippets and sentiment

   - **Homepage Scraping:**
     - Direct scrape of restaurant's official website
     - Captures: Features, dress code, descriptions, booking info
     - Complements Google search data with official source

   - **Database Storage:**
     - Store complete raw markdown from ALL scrapes
     - Single JSONB structure in `restaurants.firecrawl_output`:
       ```json
       {
         "scraped_at": "2025-10-19T...",
         "restaurant_name": "Gaucho Hampstead",
         "location": "64 Heath St",
         "scrapes": {
           "social_instagram": {
             "query": "https://www.google.com/search?q=...",
             "success": true,
             "markdown": "[23,919 characters of raw markdown]",
             "metadata": {...},
             "error": null
           },
           "social_facebook": {...},
           "social_tiktok": {...},
           "review_tripadvisor": {...},
           "review_opentable": {...},
           "awards_general": {...},
           "awards_michelin": {...},
           "homepage": {...}
         }
       }
       ```
     - **No separate columns** - all data in single `firecrawl_output` field
     - Anthropic will parse raw markdown later to extract structured data

**Stage 3: Firecrawl Menu Fetch (MENU-SPECIFIC)**
1. **Hybrid Menu Scraping Strategy** via Firecrawl v2 API
   - **Primary Strategy:** Use Firecrawl `/v2/search` endpoint for intelligent menu discovery
   - **Fallback Strategies:** Homepage link extraction and common path guessing

   - **Strategy 1: Firecrawl v2 Search (Primary - IMPLEMENTED)**
     - **API Endpoint:** `https://api.firecrawl.dev/v2/search` (POST)
     - **Method:** Intelligent search engine that finds relevant menu pages
     - **Query Patterns (tried sequentially until success):**
       1. `{restaurant_name} {location} menu`
       2. `{restaurant_name} {location} food menu`
       3. `{restaurant_name} {location} lunch dinner menu`
       4. `{restaurant_name} menu`
     - **Response Format:**
       ```json
       {
         "success": true,
         "data": {
           "web": [
             {
               "url": "https://restaurant.com/menu",
               "title": "Restaurant Name - Menu",
               "description": "View our menu...",
               "position": 1
             }
           ]
         },
         "creditsUsed": 3
       }
       ```
     - **Process:**
       1. Call `/v2/search` with query
       2. Get top 3 search results
       3. Scrape each result URL with `/v1/scrape`
       4. Parse menu content from markdown
       5. If menu items found, mark as success
     - **Advantages:**
       - Finds actual menu pages (not just homepage)
       - Discovers third-party menus (TheFork, Deliveroo, etc.)
       - More reliable than guessing paths
       - Works even if restaurant doesn't have standard `/menu` path
     - **Example Success:**
       - Query: "Ottolenghi Richmond menu"
       - Found: TheFork menu page, Slerp ordering page, official site
       - Scrapes all discovered URLs until menu items extracted

   - **Strategy 2: Homepage Link Extraction**
     - Parse homepage navigation for menu links
     - Look for links containing keywords: "menu", "food", "eat", "dining", "lunch", "dinner", "brunch"
     - Extract and scrape discovered menu URLs

   - **Strategy 3: Common Path Fallback**
     - Try common menu paths sequentially:
       - `/menu`
       - `/menus`
       - `/food`
       - `/eat`
       - `/pages/menu`
       - `/pages/lunch-menu`
     - Construct URL: `{website}{path}`
     - Success criteria: `markdown.length > 100` AND no error messages

   - **PDF Menu Scraping:**
     - **Firecrawl v2 supports PDF extraction!**
     - Can scrape PDF menu URLs directly (e.g., A La Carte PDF)
     - Example: `https://gauchorestaurants.com/wp-content/.../Gaucho_FULL_ALC.pdf`
     - Returns markdown with complete menu structure
     - **Success:** Gaucho A La Carte menu scraped with 90+ items
       - Sections: Snacks, Starters, Empanadas, Steaks, Mains, Sides, etc.
       - Full item names, descriptions, and prices (£)

   - **Request Configuration:**
     ```json
     {
       "url": "https://restaurant.com/menu",
       "formats": ["markdown"],
       "onlyMainContent": true,
       "waitFor": 2000
     }
     ```

   - **Database Storage:**
     - Store in separate `restaurants.menu_data` jsonb column:
       ```json
       {
         "scraped_at": "2025-10-19T...",
         "menu_url": "https://gauchorestaurants.com/menus/",
         "raw_markdown": "[7,382 characters of complete menu]",
         "scrape_method": "direct_scrape",
         "metadata": {
           "statusCode": 200,
           "numPages": 1,
           "creditsUsed": 1
         }
       }
       ```
     - **Menu Content Includes:**
       - Section headers (Starters, Mains, Desserts, etc.)
       - Item names with prices
       - Descriptions and dietary markers
       - Special notes (e.g., "Sunday only", "Seasonal")
     - Update `menu_last_parsed` timestamp

   - **Cost Efficiency:**
     - Menu scraping: 1-2 credits per restaurant
     - Total Firecrawl: 9-10 credits per restaurant (~$0.27-0.30)
     - Hybrid approach maximizes success rate while minimizing retries

**Stage 4: Uploading Images** (Future)
- Download image URLs from `apify_output.imageUrls`
- Upload to Supabase Storage `scraped/` folder
- Prepare for Vision API quality assessment

**Stage 5: Analysing Images** (Future)
- Send images to OpenAI Vision API
- Score each image 0-10 on quality criteria
- Identify best images for selection

**Stage 6: Storing Images** (Future)
- Move approved images (score >7.0) to `selected/` folder
- Delete or archive low-quality images
- Store selected image URLs in `restaurants.photos` jsonb

**Stage 7: Generating Content with Anthropic** ✅ **IMPLEMENTED**

**Architecture:** Single API endpoint with live database integration and prompt caching

**API Route:** `POST /api/restaurants/[id]/generate-content`

**Implementation Status:** Fully operational and tested

**Process Flow:**

1. **Fetch Live Reference Data** (not static - always current)
   - Query `restaurant_cuisines` table → array of cuisine names (e.g., ["Japanese", "Italian", ...])
   - Query `restaurant_categories` table → array of category names (e.g., ["Fine Dining", "Casual", ...])
   - Query `restaurant_features` table → array of feature names (65 pre-seeded features)
   - Query `restaurant_meals` table → array of meal names (e.g., ["Breakfast", "Lunch", "Dinner"])
   - Query `neighbourhoods` table → array of 150+ London neighbourhood names

2. **Build Dynamic Prompt with Live Data + Prompt Caching**
   - Include live reference data lists in prompt (~157k tokens)
   - **Prompt caching enabled:** 5-minute TTL ephemeral cache
   - Cache includes: neighbourhoods list, cuisines list, categories list, features list, instructions
   - **Cost savings:** 90% reduction after first request (cache reads exempt from rate limits)
   - **Token usage:** ~157k cached tokens, only ~16 new input tokens per request after cache established
   - Instruction: "Use existing names from lists if applicable, suggest new ones if needed"
   - Ensures AI learns current vocabulary and naming conventions
   - Reduces duplicate creation while allowing flexibility

3. **Input to Anthropic:**
   - `restaurants.apify_output` (complete Google Places data)
   - `restaurants.firecrawl_output` (review sites data)
   - `restaurants.menu_data` (structured menu)
   - **Live reference lists:** available cuisines, categories, features, meals, neighbourhoods

4. **Anthropic Generates (with British English enforcement):**
   - `slug`: Intelligent URL slug (see ANTHROPIC_CONTENT_GENERATION_SPEC.md for rules)
   - `about`: SEO-optimized description (200-300 words, British English)
   - `phone`: International format with +44 prefix
   - `price_range`: £, ££, £££, or ££££ (see Price Range Detection below)
   - `best_times_description`: Narrative guide to visiting times
   - `public_review_sentiment`: Review summary
   - `faqs`: 5-10 relevant FAQs
   - `ratings`: Aggregate scores from multiple sources
   - `social_media_urls`: Instagram, Facebook, Twitter, TikTok URLs
   - Structured `restaurant_menu_items` from `menu_data`
   - **Reference suggestions (as names, not IDs):**
     - `cuisines`: ["Japanese", "Asian Fusion"] (prefer existing names, suggest new if needed)
     - `categories`: ["Fine Dining", "Romantic"]
     - `features`: ["Dog Water Bowls", "Outdoor Seating"] (match from 65 pre-seeded features)
     - `meals`: ["Lunch", "Dinner"]
     - `popular_dishes`: ["Tonkotsu Ramen", "Gyoza"]
     - `neighbourhood`: Match to 150+ London neighbourhoods

5. **Store Raw AI Response** (for audit trail and retry capability)
   - Save complete Anthropic output to database before processing
   - Enables reprocessing without re-calling Anthropic API
   - Provides audit trail of all AI-generated content

6. **Process AI Response & Update Database:**

   **A. Match or Create Reference Entries (Auto-Creation Enabled)**

   For each suggested name (cuisine/category/feature/meal):
   - **Step 1:** Try exact match (case-insensitive) against existing entries
   - **Step 2:** If no match found → **Auto-create new entry** with:
     - `name`: Normalized name (title case, trimmed)
     - `slug`: Generated slug (lowercase, hyphenated)
     - `meta_title`: Auto-generated SEO title
     - `meta_description`: Auto-generated SEO description
   - **Step 3:** Collect IDs (existing or newly created)
   - **No manual approval required** - all suggestions are auto-created

   **B. Create Junction Table Links**
   - Insert relationships in `restaurant_cuisine_links`
   - Insert relationships in `restaurant_category_links`
   - Insert relationships in `restaurant_feature_links`
   - Insert relationships in `restaurant_meal_links`

   **C. Update Restaurant Content Fields**
   - Update `slug`, `about`, `phone`, `price_range`, `social_media_urls`
   - Update `best_times_description`, `public_review_sentiment`
   - Update `faqs`, `ratings`, and other JSONB fields
   - Link neighbourhood via `neighbourhood_id` FK

   **D. Insert Menu Items**
   - Bulk insert parsed menu items into `restaurant_menu_items`

   **E. Match Popular Dishes**
   - Match `apify_output.popularDishes` to `restaurant_dishes` table
   - Create dish entries if needed
   - Mark as popular: `UPDATE restaurant_dishes SET popular = true WHERE ...`
   - Create links via `restaurant_dish_links`

7. **Return Complete Result:**
   - Success status
   - Generated content summary
   - List of new cuisines/categories/features created
   - Matched neighbourhood
   - Token usage (including cache usage metrics)
   - Processing time
   - Any warnings or notes for review

---

### Price Range Detection

**Field:** `restaurants.price_range`

**Constraint:** CHECK IN ('£', '££', '£££', '££££')

**Detection Strategy (AI-powered):**

The Anthropic AI analyzes multiple data sources to categorize restaurants into 4 price tiers:

**£ (Budget) - Under £15 per person:**
- Fast food, casual cafes, takeaway joints
- Pub meals, basic dining
- Indicators: "£5-10", "£10-15", "Budget", "Inexpensive" in Apify data

**££ (Moderate) - £15-30 per person:**
- Casual dining restaurants, gastropubs
- Mid-range chains, bistros
- Indicators: "£15-25", "£20-30", "Moderate", "$" in Apify data

**£££ (Upscale) - £30-60 per person:**
- Fine dining, upscale restaurants
- Premium gastropubs, high-end bistros
- Indicators: "£35-50", "£40-60", "Expensive", "$$" in Apify data

**££££ (Luxury) - £60+ per person:**
- Michelin-starred, luxury fine dining
- Exclusive high-end establishments
- Indicators: "£80+", "£100+", "Very Expensive", "$$", Michelin stars

**Decision Logic:**
1. Parse `apify_output.price` for price ranges or symbols
2. If `menu_data` exists, analyze average main course prices
3. Cross-reference with restaurant category (Fine Dining → likely £££ or ££££)
4. Consider Michelin stars/awards → automatically ££££
5. If uncertain, default to ££ (moderate)

**Output:** Single string matching EXACTLY one of: "£", "££", "£££", "££££"

---

### Restaurant Features Implementation

**Tables:**
- `restaurant_features` - Lookup table with 65 pre-seeded features
- `restaurant_feature_links` - Junction table for many-to-many relationships

**Feature Categories (10 total):**
1. **dog_amenities** (9 features) - Dog Water Bowls, Dog Menu, Dog Treats, Dog Beds Available, etc.
2. **outdoor_dining** (8 features) - Beer Garden, Patio, Terrace, Rooftop Seating, etc.
3. **dietary** (7 features) - Vegan Options, Vegetarian Options, Gluten-Free Options, etc.
4. **dining_options** (8 features) - Breakfast Served, Brunch Served, Sunday Roast, Tasting Menu, etc.
5. **atmosphere** (8 features) - Family-Friendly, Romantic Setting, Live Music, etc.
6. **accessibility** (5 features) - Wheelchair Accessible, Step-Free Entry, Accessible Restroom, etc.
7. **amenities** (5 features) - Free WiFi, Parking Available, Bar Area, Private Dining Room, etc.
8. **services** (5 features) - Takeaway Available, Delivery Service, Online Booking, etc.
9. **payment** (3 features) - Card Payments Accepted, Contactless Payments, Cash Only
10. **policies** (2 features) - BYO Wine Allowed, No Corkage Fee

**AI Detection Rules:**

The Anthropic AI analyzes multiple data sources to detect applicable features:

1. **Dog Amenities:** Check `apify_output.additionalInfo.Pets` for "Dogs allowed"
   - If true, add "Dog-Friendly Indoor Seating" at minimum
   - Check for outdoor seating → add "Dog-Friendly Outdoor Seating"
   - Look for mentions of water bowls, treats in reviews

2. **Outdoor Seating:** Check `apify_output.additionalInfo.Amenities`
   - "Outdoor seating" → determine type (Beer Garden, Patio, Terrace)
   - British pubs with outdoor → likely "Beer Garden"
   - Restaurants with outdoor → "Patio" or "Terrace"

3. **Dietary:** Check `firecrawl_output` special_diets + `menu_data`
   - "Vegetarian Friendly" → "Vegetarian Options"
   - Menu items marked vegetarian/vegan → include those options

4. **Accessibility:** Check `apify_output.additionalInfo.Accessibility`
   - "Wheelchair accessible entrance" → "Wheelchair Accessible" + "Step-Free Entry"

5. **Payments:** Check `apify_output.additionalInfo.Payments`
   - "Credit cards" or "Debit cards" → "Card Payments Accepted"
   - Modern restaurants → likely "Contactless Payments"

**Match-Only Pattern:**
- Features are **pre-seeded** in database (not created dynamically)
- AI suggests feature names, backend matches against existing 65 features
- Unmatched features logged but not created (prevents taxonomy drift)
- Maximum 15 features per restaurant (prioritize most relevant)

**Backend Processing:**
```typescript
// Match features (no creation)
for (const name of aiSuggestedFeatures) {
  const existing = await supabase
    .from('restaurant_features')
    .select('id, name')
    .eq('name', name)  // Exact match (case-sensitive)
    .single()

  if (existing) {
    featureIds.push(existing.id)
  } else {
    notFound.push(name)  // Log for review
  }
}

// Create links
await supabase
  .from('restaurant_feature_links')
  .insert(featureIds.map(id => ({
    restaurant_id: restaurantId,
    feature_id: id
  })))
```

---

### Neighbourhoods System

**Table:** `neighbourhoods`

**Schema:**
- `id` (uuid) - Primary key
- `name` (text) - Neighbourhood name (e.g., "Primrose Hill", "Shoreditch")
- `slug` (text) - URL slug (e.g., "primrose-hill", "shoreditch")
- `city_id` (uuid) - FK to cities table
- `created_at` (timestamptz)

**Current State:**
- 150+ London neighbourhoods pre-seeded
- Used in slug generation and location context
- Referenced in restaurants table via `neighbourhood_id` FK

**Match-or-Create Pattern:**

Unlike features (match-only), neighbourhoods can be created dynamically:

1. AI extracts neighbourhood from `apify_output.address` or infers from location
2. Backend attempts exact match (case-insensitive) against `neighbourhoods` table
3. If match found → link via `neighbourhood_id`
4. If NO match → create new neighbourhood entry:
   ```typescript
   const newNeighbourhood = await supabase
     .from('neighbourhoods')
     .insert({
       name: normalizedName,
       slug: generateSlug(normalizedName),
       city_id: londonCityId
     })
     .select()
     .single()

   await supabase
     .from('restaurants')
     .update({ neighbourhood_id: newNeighbourhood.id })
     .eq('id', restaurantId)
   ```

**Usage in Slug Generation:**
- Neighbourhood name included in location slug when needed
- Examples: "abuelo-camden", "wimpy-borehamwood"
- See ANTHROPIC_CONTENT_GENERATION_SPEC.md for slug generation rules

---

### British English Enforcement

**Requirement:** All AI-generated content must use British English spelling and terminology.

**Implementation:**
- Enforced in Anthropic prompt with explicit instruction
- Examples:
  - "colour" not "color"
  - "favourite" not "favorite"
  - "centre" not "center"
  - "organised" not "organized"
  - "neighbourhood" not "neighborhood"

**Scope:**
- `about` field descriptions
- `faqs` questions and answers
- `best_times_description`
- `public_review_sentiment`
- Any other AI-generated narrative content

**Validation:**
- No automated validation currently
- Manual spot-checks during testing
- Future: Could implement British English dictionary check

**Stage 8: Final Review & Publish** (Future)
- Admin reviews all generated content
- Manually approve/edit as needed
- Set `published: true` when ready to go live

**Additional Source Scraping (Secondary Priority):**

4. **Deliveroo**
   - URL: `https://deliveroo.co.uk/search?q={restaurant_name}`
   - Extract: Menu items, pricing, delivery info

5. **Uber Eats**
   - URL: `https://www.ubereats.com/gb/search?q={restaurant_name}`
   - Extract: Menu items, pricing, popular dishes

6. **Just Eat**
   - URL: `https://www.just-eat.co.uk/search?q={restaurant_name}`
   - Extract: Menu items, pricing, cuisine categories

7. **TripAdvisor**
   - URL: `https://www.tripadvisor.co.uk/Search?q={restaurant_name}`
   - Extract: Reviews, ratings, awards, photos

8. **OpenTable**
   - URL: `https://www.opentable.co.uk/s?term={restaurant_name}`
   - Extract: Reviews, ratings, reservation availability

9. **The Fork**
   - URL: `https://www.thefork.co.uk/search?term={restaurant_name}`
   - Extract: Reviews, ratings, special offers

**Error Handling:**
- Each source scrape is independent
- Failures are logged but don't stop the pipeline
- Response includes `successfulSources` and `failedSources` counts
- UI shows error state for failed stages

### Phase 3: Anthropic AI Processing
**API:** Anthropic Claude API

**Architecture:** Hybrid Option C - AI receives live reference data names (not IDs)

**Input Sources:**

1. **Restaurant Data (from database JSONB columns):**
   - `restaurants.apify_output` - Complete Google Places data including:
     - Basic info, ratings, reviews, popular times
     - Popular dishes array
     - Operating hours, amenities, accessibility
   - `restaurants.firecrawl_output` - Review sites data including:
     - TripAdvisor, OpenTable, The Fork ratings/reviews
     - Deliveroo, Uber Eats, Just Eat menu items
   - `restaurants.menu_data` - Structured menu with sections and items

2. **Live Reference Data (fetched from database every time):**
   - **Available Cuisines:** Array of current cuisine names from `restaurant_cuisines`
     - Example: ["Japanese", "Italian", "British", "French", "Indian", ...]
   - **Available Categories:** Array of current category names from `restaurant_categories`
     - Example: ["Fine Dining", "Casual", "Gastropub", "Romantic", ...]
   - **Available Features:** Array of current feature names from `restaurant_features`
     - Example: ["Dog Water Bowls", "Outdoor Seating", "WiFi", ...]
   - **Available Meals:** Array of current meal names from `restaurant_meals`
     - Example: ["Breakfast", "Lunch", "Dinner", "Brunch", ...]

**Prompt Strategy:**
- Include live reference lists in prompt with instruction: "Use these existing names if applicable, suggest new ones only for legitimately unique styles"
- AI learns current vocabulary and naming conventions
- Reduces duplicates while allowing flexibility for new cuisines/features
- Always reflects latest database state (not static lists)

**Anthropic Tasks:**

1. **Intelligent Slug Generation** (NEW)
   - Analyze restaurant name and "people also search for" data (from Apify)
   - Determine if location is needed in slug (chain vs. unique restaurant)
   - Apply formatting rules: lowercase, hyphens, remove apostrophes correctly
   - Ensure uniqueness (check if slug exists, append -2, -3, etc.)
   - See `ANTHROPIC_CONTENT_GENERATION_SPEC.md` for complete rules

2. **Content Generation:**
   - `about`: SEO-optimized description (200-300 words) highlighting:
     - Key menu items (from menu_data and popularDishes)
     - Dog-friendly features (from apify_output.additionalInfo.Pets)
     - Unique selling points (from reviews)
     - Ambiance and atmosphere (from review sentiment)
     - Awards/recognition (if present)
     - Natural, human-sounding tone (not AI-like)

   - `best_times_description`: Narrative guide based on popularTimesHistogram
     - Analyze busy vs. quiet periods
     - Recommend times for dog owners

   - `public_review_sentiment`: Aggregate and summarize reviews from:
     - apify_output.reviews
     - firecrawl_output review sites

   - `faqs`: Generate 5-10 relevant FAQs based on all available data

3. **Menu Processing:**
   - Parse `menu_data.sections` into individual `restaurant_menu_items` records
   - Extract: section_name, item_name, description, price, dietary_tags
   - Maintain display_order within sections

4. **Reference Data Suggestions (as names, not IDs):**
   - **Cuisines:** Suggest 1-3 cuisine names
     - Prefer existing names from provided list
     - Only suggest new cuisines for legitimately unique styles
     - Example: ["Japanese", "Asian Fusion"] (not "Japanese Cuisine" or "japanese")

   - **Categories:** Suggest 1-3 category names
     - Example: ["Fine Dining", "Romantic"]

   - **Features:** Suggest relevant features (max 20)
     - Prefer existing names from list
     - Example: ["Dog Water Bowls", "Outdoor Seating", "Reservations Available"]

   - **Meals:** Suggest meal types served (max 5)
     - Example: ["Lunch", "Dinner", "Brunch"]

5. **Popular Dish Matching:**
   - Take `apify_output.popularDishes` array (e.g., ["Fish and Chips", "Sunday Roast"])
   - Suggest dish names for matching/creation
   - Backend will match or create in `restaurant_dishes` table

6. **Data Enrichment:**
   - Calculate overall rating scores from multiple sources
   - Generate transportation directions (getting_there_public, getting_there_car)

7. **Output Format:**
   - Structured JSON with:
     - `slug`: Generated slug
     - Content fields (about, best_times_description, faqs, etc.)
     - Menu items array ready for bulk insert
     - **Reference suggestions (NAMES ONLY):**
       - `cuisines`: ["Japanese", "Asian Fusion"]
       - `categories`: ["Fine Dining", "Romantic"]
       - `features`: ["Dog Water Bowls", "Outdoor Seating"]
       - `meals`: ["Lunch", "Dinner"]
       - `popular_dishes`: ["Tonkotsu Ramen", "Gyoza"]

**Backend Processing (after Anthropic response):**

For each suggested name:
1. **Exact match (case-insensitive):** Check if name exists in respective table
2. **If match found:** Use existing entry ID
3. **If no match:** Auto-create new entry with:
   - Normalized name (title case, trimmed)
   - Auto-generated slug
   - Auto-generated SEO metadata
4. **Create junction table links** with collected IDs
5. **No manual approval required** - all suggestions are auto-created

**Critical Rules:**
- Anthropic must ONLY use actual data from input sources
- No fabrication or assumptions
- All claims must be traceable to source data
- Flag any ambiguous or contradictory information
- For reference data: prefer existing names from lists, suggest new only when truly unique

### Phase 4: OpenAI Vision API (Image Quality Control)
**Process:**
1. Download scraped images
2. Upload to `scraped/` folder in Supabase Storage
3. Send image URLs to OpenAI Vision API

**Vision API Task:**
- Evaluate image quality (0-10 scale)
- Criteria:
  - Resolution and sharpness
  - Lighting and composition
  - Relevance to restaurant
  - Professional vs. amateur quality
- Recommend top 3-15 images
- Provide brief descriptions for alt text

**Selection:**
- Images with score > 7.0 moved to `selected/` folder
- Store selected image URLs in `restaurants.photos` JSONB
- Prioritize variety: exterior, interior, food, dog-friendly areas

### Phase 5: Database Population
**API Orchestration Layer:**

**Note:** Restaurant record is created IMMEDIATELY when "Run" is clicked (Stage 0), then updated throughout the pipeline.

1. **Stage 1 - Apify Data Storage:**
   - Store complete response in `restaurants.apify_output` jsonb
   - Update individual fields: name, address, phone, website, price_range
   - Update `hours` jsonb from openingHours
   - Update `popular_times_raw` jsonb from popularTimesHistogram
   - Set `last_scraped_at` timestamp

2. **Stage 2 - Firecrawl General Data Storage:**
   - Store aggregated review site data in `restaurants.firecrawl_output` jsonb
   - Structure: `{ "tripadvisor": {...}, "opentable": {...}, etc. }`

3. **Stage 3 - Menu Data Storage:**
   - Store structured menu in `restaurants.menu_data` jsonb
   - Update `menu_last_parsed` timestamp

4. **Stage 7 - Anthropic Content Population:**

   **API Route:** `POST /api/restaurants/[id]/generate-content`

   **Process (all in single endpoint):**

   **A. Fetch Live Reference Data:**
   - Query all current cuisines, categories, features, meals from database
   - Build arrays of names (not IDs) to include in prompt

   **B. Build Prompt & Call Anthropic:**
   - Include restaurant data (apify_output, firecrawl_output, menu_data)
   - Include live reference lists
   - Call Anthropic API

   **C. Store Raw AI Response:**
   - Save complete Anthropic output to database column (for audit/retry)
   - Enables reprocessing without re-calling API

   **D. Process AI Response:**

   **D1. Match or Create Reference Entries (Auto-Creation):**

   For **Cuisines** (suggested names: e.g., ["Japanese", "Asian Fusion"]):
   - For each name:
     1. Try exact match (case-insensitive): `SELECT * FROM restaurant_cuisines WHERE LOWER(name) = LOWER('Japanese')`
     2. If match found → collect ID
     3. If NO match → **Auto-create:**
        ```sql
        INSERT INTO restaurant_cuisines (name, slug, meta_title, meta_description)
        VALUES (
          'Japanese',
          'japanese',
          'Japanese Restaurants | Dog Friendly Finder',
          'Discover dog-friendly Japanese restaurants across the UK.'
        )
        ```
     4. Collect new ID
   - Create junction table links:
     ```sql
     INSERT INTO restaurant_cuisine_links (restaurant_id, cuisine_id)
     VALUES (?, ?), (?, ?)
     ```

   **Repeat for:**
   - **Categories** → `restaurant_categories` + `restaurant_category_links`
   - **Features** → `restaurant_features` + `restaurant_feature_links`
   - **Meals** → `restaurant_meals` + `restaurant_meal_links`

   **D2. Update Restaurant Content Fields:**
   ```sql
   UPDATE restaurants SET
     slug = ?,
     about = ?,
     best_times_description = ?,
     public_review_sentiment = ?,
     sentiment_score = ?,
     faqs = ?::jsonb,
     ratings = ?::jsonb,
     getting_there_public = ?,
     getting_there_car = ?,
     getting_there_with_dogs = ?
   WHERE id = ?
   ```

   **D3. Insert Menu Items:**
   - Bulk insert into `restaurant_menu_items` from Anthropic output:
   ```sql
   INSERT INTO restaurant_menu_items
     (restaurant_id, section_name, item_name, description, price, dietary_tags, display_order)
   VALUES
     (?, 'Starters', 'Soup of the Day', '...', 6.50, ARRAY['vegetarian'], 1),
     (?, 'Mains', 'Fish and Chips', '...', 14.95, ARRAY[], 2),
     ...
   ```

   **D4. Match or Create Popular Dishes:**
   - For each dish name in `popular_dishes` array:
     1. Try exact match in `restaurant_dishes` table
     2. If NO match → create new entry with `popular = true`
     3. Create link via `restaurant_dish_links`

   **E. Return Complete Result:**
   - Success status
   - Generated content summary
   - **New entries created:**
     - List of newly created cuisines
     - List of newly created categories
     - List of newly created features
     - List of newly created dishes
   - Token usage and processing time
   - Any warnings for review

   **Key Features:**
   - ✅ Single API call does everything
   - ✅ Stores raw AI output for retry capability
   - ✅ Auto-creates new reference entries (no approval needed)
   - ✅ Always uses live database state for reference lists
   - ✅ Transaction safety (rollback on errors)
   - ✅ Complete audit trail

5. **Final Review:**
   - Restaurant remains `published: false` for admin review
   - Admin can review newly created cuisines/categories in database
   - Admin can edit any fields before publishing
   - Set `published: true` when ready to go live

---

## API Integration Details

### Required APIs

#### 1. Apify API ⭐ **PRIMARY DATA SOURCE**
- **Key:** Stored in `.env.local` as `APIFY_API_KEY`
- **Actor:** `compass/crawler-google-places`
- **Base URL:** `https://api.apify.com/v2`
- **Endpoints:**
  - `/acts/compass~crawler-google-places/runs` - Start actor run
  - `/actor-runs/{runId}` - Check run status
  - `/datasets/{datasetId}/items` - Fetch results
- **Authentication:** Bearer token in Authorization header
- **Purpose:** Extract comprehensive Google Places data including popular times histogram
- **Documentation:** https://apify.com/compass/crawler-google-places
- **Rate Limiting:** Check Apify plan limits
- **Cost:** Varies by plan, monitor usage in Apify dashboard

#### 2. Google Places API
- **Autocomplete:** Place search for admin input
- **Place Details:** Get coordinates, address, phone, website
- **Credentials:** Add to `.env.local` as `GOOGLE_PLACES_API_KEY`

#### 3. Firecrawl v2 API (SECONDARY SOURCE)
- **Key:** Stored in `.env.local` as `FIRECRAWL_API_KEY`
- **Base URL:** `https://api.firecrawl.dev/v1`
- **Endpoint:** `/scrape` (POST) - Single page scraping
- **Authentication:** Bearer token in Authorization header
- **Purpose:** Supplementary data scraping
  - Google search results for social media, reviews, awards
  - Restaurant homepage
  - Menu pages (including PDF menu extraction)
- **Features Used:**
  - Markdown format extraction
  - PDF document parsing
  - `onlyMainContent: true` for clean data
  - `waitFor` parameter for dynamic content
- **Documentation:** https://docs.firecrawl.dev/features/scrape

#### 4. Anthropic API
- **Key:** Stored in `.env.local` as `ANTHROPIC_API_KEY`
- **Model:** Claude 3.5 Sonnet (latest)
- **Purpose:** Data structuring and content generation

#### 5. OpenAI API
- **Key:** Stored in `.env.local` as `OPENAI_API_KEY`
- **Model:** GPT-4 Vision
- **Purpose:** Image quality assessment

#### 6. Supabase
- **URL:** `https://zhsceyvwaikdxajtiydj.supabase.co`
- **Anon Key:** (stored in `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- **Storage Bucket:** `places`

---

## Admin Interface Requirements

### Add Restaurant Page
**URL:** `/admin/add`

**Layout:** Three-column interface with real-time data extraction preview

**Column 1: Context & Restaurant Sources (384px width, left sidebar)**

**Section 1: Context**
- Icon badge with MapPin icon
- Heading: "Context"
- Description: "Add restaurants to the Dog Friendly Finder directory"

**Section 2: Restaurant Sources**
- Icon badge with number "2"
- Heading: "Restaurant Sources"
- **Google Places Autocomplete Input:**
  - Placeholder: "Search restaurants..."
  - Real-time autocomplete dropdown
  - Powered by `@react-google-maps/api`

- **Selected Place Card** (shown after selection):
  - Restaurant name (truncated)
  - Formatted address (max 2 lines)
  - Star rating with count (e.g., "4.4 (6,049 reviews)")
  - Icons for rating (Star) and review count (Users)

- **Run Button:**
  - Full width
  - Enabled only when place is selected
  - Triggers scraping pipeline

**Section 3: Process Status Indicators** (shown after Run is clicked)
- Separator above
- 9 processing stages with status icons:
  1. Apify Fetch (primary Google Places data)
  2. Firecrawl Fetch (review sites and general data)
  3. Fetching Menu (menu-specific Firecrawl search)
  4. Uploading Images (from Apify imageUrls)
  5. Analysing Images (OpenAI Vision scoring)
  6. Storing Images (approved images to storage)
  7. Generating Content (Anthropic AI processing)
  8. Mapping Fields (cuisines, categories, popular dishes)
  9. Uploading to Database (final data insertion)

**Status Indicator States:**
- **Pending:** Grey border circle (14px, 3px border, `#d1d5db`)
- **Loading:** Grey spinner (ldrs ring, 14px, 3px stroke, `#d1d5db`)
- **Completed:** Green filled circle (14px, `border-green-500 bg-green-500`)
- **Error:** Red filled circle (14px, `border-red-500 bg-red-500`)

Each stage displays:
- Left: Stage name in small grey text
- Right: Status indicator icon

**Column 2: Extracted Data (384px width, middle panel)**

**Header:**
- Icon badge with MapPin icon
- Heading: "Extracted Data"
- Description: "Data extracted from multiple sources"

**Data Sections** (shown when scraping is running):

1. **Basic Information** (numbered badge "1")
   - Google Place ID
   - Name
   - Slug (auto-generated from name)
   - Dogs Allowed (from Apify `additionalInfo.Pets`)
   - Cuisine (from Apify `categoryName`)
   - Address (full formatted address)
   - Phone
   - Latitude
   - Longitude
   - Coordinates (formatted as "lat, lng")
   - Neighborhood
   - Price Range (from Apify `price`)
   - Website (clickable link)
   - Instagram
   - Facebook
   - Menu (clickable link from Apify `menu`)

2. **Photos** (numbered badge "2")
   - 4 placeholder image squares (future: populated from Apify `imageUrls`)

3. **Ratings** (numbered badge "3")
   - Google (from Apify `totalScore` and `reviewsCount`)
   - TripAdvisor
   - OpenTable
   - The Fork

4. **Operational Info** (numbered badge "4")
   - Hours (all 7 days from Apify `openingHours`)
   - Reservations Required (from Apify `additionalInfo.Planning`)
   - Dress Code

5. **Busy Periods** (numbered badge "5") ⭐ **NEW SECTION**
   - Busiest (calculated from Apify `popularTimesHistogram` - highest occupancy %)
   - Quietest (calculated from Apify `popularTimesHistogram` - lowest occupancy %)
   - **Algorithm:**
     - Iterate through all days and hours in histogram
     - Find maximum occupancy percentage (busiest time)
     - Find minimum occupancy percentage (quietest time)
     - Format as "Day at Time" (e.g., "Sunday at 3 PM")

6. **Features** (numbered badge "6")
   - Placeholder for extracted features
   - Future: Dog amenities, outdoor seating, WiFi, etc.

7. **Restaurant Meals** (numbered badge "7")
   - Placeholder for meal types (breakfast, lunch, dinner, etc.)

8. **Accessibility Features** (numbered badge "8")
   - Placeholder for accessibility information

9. **Awards & Recognition** (numbered badge "9")
   - AA Rosettes
   - Michelin Stars

**Data Display Format:**
- Each field: Left-justified label (grey text) | Right-justified value (bold text)
- Separators between fields
- Sections separated by spacing

**Column 3: Main Content (flex-1, right panel)**
- Currently empty
- Reserved for future features:
  - Preview of generated content
  - Image gallery
  - Menu preview
  - Edit interface

**Status Tracking:**
- Real-time updates as pipeline progresses
- Error states displayed inline
- Success confirmation when complete

### Restaurant List Page (Future)
**URL:** `/admin/restaurants`

**Features:**
- Table view of all restaurants
- Filter by: published status, cuisine, category, city
- Sort by: name, created date, last updated, overall score
- Quick actions: Edit, Re-scrape, Publish/Unpublish, Delete
- Bulk actions: Publish selected, Export selected

---

## SEO Requirements

### On-Page SEO
Each restaurant page must include:
- Unique `meta_title` (60 chars)
- Unique `meta_description` (155 chars)
- Dynamically generated Schema.org markup:
  - `Restaurant` schema
  - `LocalBusiness` schema
  - `Menu` schema (from menu data)
  - `FAQPage` schema (if FAQs exist)
  - `AggregateRating` schema (from ratings)
  - `BreadcrumbList` schema
- Open Graph tags for social sharing
- Canonical URLs
- Breadcrumb navigation
- Internal linking to cuisine/category/dish pages

### Content Guidelines
- Natural, conversational tone
- Avoid AI-sounding phrases ("delightful", "nestled", "culinary journey")
- Focus on specific, concrete details
- Include location-specific keywords
- Optimize for voice search queries

### Technical SEO
- Fast page loads (<2s LCP)
- Mobile-responsive design
- Lazy-loaded images with proper alt text
- Clean URL structure (no IDs, use slugs)
- XML sitemap auto-generation
- robots.txt configuration

---

## Performance Considerations

### Database Optimization
- **Indexes required:**
  - `restaurants.slug` (unique)
  - `restaurants.coordinates` (GIST index for proximity queries)
  - `restaurants.published`
  - `restaurants.city`
  - `restaurant_menu_items.restaurant_id`
  - Full-text search on `restaurant_menu_items.item_name` and `description`
  - GIN index on `restaurant_menu_items.dietary_tags`

- **Connection Pooling:**
  - Use Supabase's built-in pgBouncer
  - Limit connections in admin scraper

- **Query Optimization:**
  - Use `JOIN` aggregation for menu items (avoid N+1 queries)
  - Implement caching for expensive queries (Redis/Next.js cache)
  - Consider materialized views for complex filtered listings

### API Rate Limiting
- **Apify:** Monitor compute units and concurrent runs (varies by plan), implement retry logic for failed runs
- **Firecrawl:** Check plan limits, implement retry logic (reduced usage as secondary source)
- **Anthropic:** Monitor token usage, batch requests where possible
- **OpenAI Vision:** Limit to 15 images max per restaurant
- **Google Places:** Cache autocomplete results, minimize API calls

### Cost Management
**Per Restaurant Estimates:**
- Apify: $0.01-0.05 (per run, depending on plan and compute units)
- Firecrawl: $0.27-0.30 (9-10 scrapes @ ~$0.03/credit)
  - Social media searches: 3 credits
  - Review sites: 2 credits
  - Awards: 2 credits
  - Homepage: 1 credit
  - Menu: 1-2 credits (hybrid approach)
- **Anthropic (with prompt caching):**
  - **First request:** ~$0.15-0.20 (cache WRITE + input + output)
    - Cache write: ~157k tokens @ $3.75/MTok = ~$0.59
    - Input tokens: ~16k @ $3/MTok = ~$0.05
    - Output tokens: ~1k @ $15/MTok = ~$0.015
    - **Total first request: ~$0.66**
  - **Subsequent requests (within 5 min):** ~$0.01-0.02 (cache READ + output)
    - Cache read: ~157k tokens @ $0.30/MTok = ~$0.047 (90% discount, **doesn't count toward rate limits**)
    - Input tokens: ~16k @ $3/MTok = ~$0.05
    - Output tokens: ~1k @ $15/MTok = ~$0.015
    - **Total cached request: ~$0.11**
  - **Effective cost with caching:** ~$0.11 per restaurant (after cache established)
- OpenAI Vision: $0.10-0.30 (15 images @ ~$0.02 each)
- **Total without Anthropic cache: ~$0.43-0.85 per restaurant**
- **Total with Anthropic cache (optimal): ~$0.49-0.66 per restaurant**

At 1,000 restaurants:
- Without caching: $430-850 total
- With prompt caching: $490-660 total
- **Cache benefit:** ~$170-190 savings at scale + rate limit exemption for cache reads

**Cost Savings with Current Architecture:**
- Apify replaces multiple Firecrawl calls (Google Maps, Google Business Profile)
- Google Search scraping via Firecrawl more reliable than direct site scraping
- Parallel execution reduces total time and improves efficiency
- Raw markdown storage eliminates need to re-scrape for reprocessing
- PDF menu extraction (1 credit) vs. multiple page scrapes

**Firecrawl v2 Cost Optimization:**
- Single `firecrawl_output` JSONB column stores all raw data
- No need to re-scrape if Anthropic processing changes
- Hybrid menu approach minimizes failed scrapes
- Parallel execution of all scrapes (8-10 simultaneous requests)
- Google Search scraping: Higher success rate than direct URLs

**Optimization Strategies:**
- Batch process during off-peak hours
- Implement smart re-scraping (only when data likely changed)
- Cache AI-generated content (don't regenerate unnecessarily)
- Monitor Apify compute unit usage and adjust actor configuration
- Use Apify's dataset storage efficiently (delete old datasets)
- Store raw Firecrawl markdown for audit trail and reprocessing

---

## Development Phases

### Phase 1: Database Setup ✅
- Create Supabase tables with proper relationships
- Set up foreign keys and indexes
- Seed initial data (cuisines, categories, meals, features, dish categories, Michelin awards)

### Phase 2: Schema Service
- Build modular schema generators
- Create restaurant schema generator
- Create shared generators (faq.ts, menu.ts, award.ts)
- Test schema output with Google Rich Results Test

### Phase 3: Admin Interface
- Build Google Places autocomplete
- Create "Run Scraper" orchestration API
- Build review/preview interface
- Implement approval workflow

### Phase 4: Scraping Pipeline
- Integrate Firecrawl v2 API
- Build Anthropic data processing
- Implement OpenAI Vision quality control
- Handle error cases and retries

### Phase 5: Database Population Logic
- API layer for data insertion
- Lookup/create logic for referenced tables
- Transaction management for atomic operations
- Validation and error handling

### Phase 6: Public Frontend
- Restaurant detail pages with dynamic schema
- Listing pages (all, by cuisine, by category, etc.)
- Dish pages
- Search functionality
- SEO implementation

### Phase 7: Testing & Launch
- Test with 10-20 real restaurants
- Validate data quality
- Perform SEO audit (including schema validation)
- Load testing
- Soft launch and iterate

---

## Technical Stack Summary

- **Frontend:** Next.js (TypeScript)
- **Database:** Supabase (PostgreSQL with PostGIS)
- **Storage:** Supabase Storage
- **APIs:**
  - **Apify API** (primary data source - Google Places scraping with popular times)
  - Google Places API (autocomplete for admin interface)
  - Firecrawl v2 (secondary web scraping - review sites, delivery platforms)
  - Anthropic Claude (data processing & content generation)
  - OpenAI GPT-4 Vision (image quality control)
- **Hosting:** Vercel (Next.js default)
- **Version Control:** Git
- **Schema Generation:** Dynamic (runtime, not stored)

---

## Success Metrics

### Technical KPIs
- Scraping success rate: >90%
- Data accuracy: >95% (manual spot checks)
- Image approval rate: >60%
- Page load speed: <2s LCP
- Database query performance: <100ms avg
- Schema validation: 100% pass rate on Google Rich Results Test

### Business KPIs
- Organic search ranking: Top 3 for target keywords within 6 months
- LLM search visibility: Cited in ChatGPT/Claude responses
- User engagement: >3 min avg session duration
- Conversion: >5% click-through on reservation links

---

## Contact & Support

**Project Lead:** James
**Setup Date:** 2024-09-16
**Framework:** 5 Day Sprint

For technical issues or questions, refer to:
- Firecrawl Docs: https://docs.firecrawl.dev/
- Anthropic API Docs: https://docs.anthropic.com/
- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Schema.org: https://schema.org/
