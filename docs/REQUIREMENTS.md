# Dog Friendly Finder - Requirements & Technical Specification

## Project Overview

Dog Friendly Finder is a comprehensive directory of dog-friendly restaurants in the UK, optimized for both traditional SEO and LLM search rankings. The platform automatically scrapes, processes, and enriches restaurant data using AI to create detailed, SEO-optimized listings.

## System Architecture

### Core Workflow

1. **Admin Input**: Admin enters restaurant name via Google Places API autocomplete
2. **Data Collection**: Firecrawl v2 scrapes comprehensive restaurant data
3. **AI Processing**: Anthropic API structures and enriches scraped data
4. **Quality Control**: OpenAI Vision API validates image quality
5. **Database Population**: Structured data populates Supabase PostgreSQL database
6. **Public Display**: SEO-optimized pages with dynamically generated schema markup

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
| `menu_raw` | jsonb | Original scraped menu (source of truth) |
| `menu_last_parsed` | timestamptz | When menu was last parsed to items table |
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
| `meta_title` | text | SEO meta title |
| `meta_description` | text | SEO meta description |
| `created_at` | timestamptz | Default: now() |

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
**API Integration:** Firecrawl v2 + Google Places API

**Process Stages (displayed in UI with status indicators):**

**Stage 1: Fetching Place Data**
1. **Google Business Profile (Google Places API)**
   - Endpoint: `https://maps.googleapis.com/maps/api/place/details/json`
   - Fields requested: `name`, `formatted_address`, `formatted_phone_number`, `website`, `opening_hours`, `price_level`, `rating`, `user_ratings_total`, `photos`, `reviews`, `editorial_summary`, `business_status`, `url`, `current_opening_hours`, `utc_offset`
   - Extracts: Basic info, hours, reviews, photos, ratings

2. **Google Maps Place Page (via Firecrawl v2)** ⭐ **KEY DISCOVERY**
   - URL: `https://www.google.com/maps?q=place_id:{PLACE_ID}`
   - Example: `https://www.google.com/maps?q=place_id:ChIJix2arm8adkgR6AQ5Md_aF8Y`
   - **Why this is important:** Google Maps page contains **Popular Times/Busy Periods** data that is NOT available through the standard Google Places API
   - Extracted data includes:
     - **Popular times visualization** (hourly busy patterns per day)
     - **Live busy status** ("Busier than usual", etc.)
     - Full review text with photos
     - Q&A section
     - Menu highlights with photos
     - Photo categories (Latest, Food & drink, Vibe, etc.)
     - Price range statistics
     - Related places
   - Firecrawl returns markdown + HTML for comprehensive extraction

3. **Official Restaurant Website (via Firecrawl v2)**
   - URL obtained from Google Places API `website` field
   - Formats: `["markdown", "html"]`
   - Options: `onlyMainContent: true`, `waitFor: 2000`
   - Extracts: Detailed menu, special events, reservation info

**Stage 2: Uploading Images** (Coming in Phase 4)
- Download image URLs from Google Places API `photos` field
- Upload to Supabase Storage `scraped/` folder
- Prepare for Vision API quality assessment

**Stage 3: Analysing Images** (Coming in Phase 4)
- Send images to OpenAI Vision API
- Score each image 0-10 on quality criteria
- Identify best images for selection

**Stage 4: Storing Images** (Coming in Phase 4)
- Move approved images (score >7.0) to `selected/` folder
- Delete or archive low-quality images
- Generate URLs for database storage

**Stage 5: Generating Content** (Coming in Phase 3)
- Send all scraped data to Anthropic API
- Generate SEO-optimized descriptions
- Structure menu data
- Create FAQs
- Summarize reviews

**Stage 6: Mapping Fields** (Coming in Phase 5)
- Map scraped data to database schema
- Lookup or create cuisine entries
- Lookup or create category entries
- Associate features, meals, dishes

**Stage 7: Uploading to Database** (Coming in Phase 5)
- Insert restaurant record
- Insert menu items
- Create many-to-many associations
- Store photos array in JSONB

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

**Input:** Raw Firecrawl data + restaurant context

**Anthropic Tasks:**
1. **Structure Extraction:**
   - Parse menu into sections and items
   - Extract operating hours in consistent format
   - Identify cuisine types
   - List features/amenities (no assumptions, data-driven only)
   - Extract ratings data
   - Extract social media URLs

2. **Content Generation:**
   - `about`: SEO-optimized description (200-300 words) highlighting:
     - Key menu items
     - Dog-friendly features
     - Unique selling points
     - Ambiance and atmosphere
     - Awards/recognition
     - Natural, human-sounding tone (not AI-like)

   - `best_times_description`: Narrative guide to optimal visiting times

   - `public_review_sentiment`: Summarize recent reviews across platforms

   - `faqs`: Generate 5-10 relevant FAQs based on venue data

3. **Data Enrichment:**
   - Calculate rating scores based on review sentiment
   - Identify best times (buzzing vs. relaxed)
   - Suggest dog-friendly visiting times
   - Generate transportation directions
   - Identify accessibility features

4. **Output Format:**
   - Structured JSON ready for database insertion
   - Reference existing database entries (e.g., cuisine_id for "Japanese")
   - Flag new entries needed (e.g., new cuisine type "Peruvian-Japanese Fusion")

**Critical Rule:** Anthropic must ONLY use actual data from Firecrawl. No fabrication or assumptions.

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

1. **Lookup/Create Referenced Data:**
   - Check if cuisine exists; if not, create entry in `restaurant_cuisines`
   - Check if category exists; if not, create entry in `restaurant_categories`
   - Check features; create new in `restaurant_features` if needed
   - Repeat for meals, dish categories, etc.

2. **Insert Restaurant:**
   - Create `restaurants` record with all fields
   - Store `menu_raw` JSONB
   - Store `ratings`, `restaurant_awards`, `faqs`, `photos` JSONB fields

3. **Insert Menu Items:**
   - Create `restaurant_menu_items` records (bulk insert for performance)

4. **Associate Many-to-Many:**
   - Link cuisines via `restaurant_cuisine_links`
   - Link categories via `restaurant_category_links`
   - Link features via `restaurant_feature_links`
   - Link meals via `restaurant_meal_links`
   - Link dishes via `restaurant_dish_links`

5. **Set Status:**
   - Mark `published: false` for manual review
   - Admin reviews and approves before going live

---

## API Integration Details

### Required APIs

#### 1. Google Places API
- **Autocomplete:** Place search for admin input
- **Place Details:** Get coordinates, address, phone, website
- **Credentials:** Add to `.env.local` as `GOOGLE_PLACES_API_KEY`

#### 2. Firecrawl v2 API
- **Key:** `fc-c5e73c10497a4fe59ddc066dd5246cbc`
- **Endpoints:**
  - `/scrape` - Single page scraping
  - `/crawl` - Multi-page crawling with async status checking
- **Documentation:** https://docs.firecrawl.dev/migrate-to-v2

#### 3. Anthropic API
- **Key:** (stored in `.env.local`)
- **Model:** Claude 3.5 Sonnet (latest)
- **Purpose:** Data structuring and content generation

#### 4. OpenAI API
- **Key:** (stored in `.env.local`)
- **Model:** GPT-4 Vision
- **Purpose:** Image quality assessment

#### 5. Supabase
- **URL:** `https://zhsceyvwaikdxajtiydj.supabase.co`
- **Anon Key:** (stored in `.env.local`)
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
- 7 processing stages with status icons:
  1. Fetching Place Data
  2. Uploading Images
  3. Analysing Images
  4. Storing Images
  5. Generating Content
  6. Mapping Fields
  7. Uploading to Database

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
   - Name
   - Address
   - Phone
   - Website
   - Price Range

2. **Cuisine & Categories** (numbered badge "2")
   - Cuisine
   - Category
   - Meals

3. **Hours & Reservations** (numbered badge "3")
   - Open Hours
   - Reservations

4. **Ratings & Reviews** (numbered badge "4")
   - Google Rating
   - TripAdvisor
   - Overall Score

5. **Features & Amenities** (numbered badge "5")
   - Dog Friendly
   - Outdoor Seating
   - WiFi
   - Other features

6. **Awards** (numbered badge "6")
   - Michelin
   - AA Rosettes
   - Other awards

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
- **Firecrawl:** Check plan limits, implement retry logic
- **Anthropic:** Monitor token usage, batch requests where possible
- **OpenAI Vision:** Limit to 15 images max per restaurant
- **Google Places:** Cache autocomplete results

### Cost Management
**Per Restaurant Estimates:**
- Firecrawl: $0.10-0.50 (depending on pages crawled)
- Anthropic: $0.05-0.20 (token usage)
- OpenAI Vision: $0.10-0.30 (15 images @ ~$0.02 each)
- **Total: ~$0.25-1.00 per restaurant**

At 1,000 restaurants: $250-1,000 total processing cost.

**Optimization Strategies:**
- Batch process during off-peak hours
- Implement smart re-scraping (only when data likely changed)
- Cache AI-generated content (don't regenerate unnecessarily)

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
  - Google Places API (location data)
  - Firecrawl v2 (web scraping)
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
