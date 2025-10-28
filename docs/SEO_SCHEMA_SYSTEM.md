# SEO Schema System - Technical Specification

## Overview

### Purpose

The SEO Schema System generates structured data (JSON-LD) for restaurant listing pages to enhance search engine visibility and enable rich results in Google Search and other search engines.

**Primary Goals:**
1. Rank #1 in organic search (both traditional and LLM search)
2. Enable rich snippets and enhanced search results
3. Provide comprehensive, accurate structured data to search engines
4. Support entity linking and knowledge graph integration
5. Future-proof architecture for multiple place types (hotels, attractions, shops)

### Architecture Philosophy

**Dynamic Generation Over Static Storage:**
- Schema is generated dynamically on page render, NOT stored in database
- Always reflects current database state (no sync issues)
- Easy to update schema formats globally (just update generator code)
- No data duplication
- Minimal performance overhead with Next.js caching

**Composition Over Inheritance:**
- Core reusable components (address, geo, images, ratings, cuisine, hours, etc.)
- Business-specific schemas that compose core components (Restaurant, Hotel, Attraction)
- Global schemas for site-wide entities (WebSite, Organization, BreadcrumbList)
- Flexible mappers that transform different DB structures to consistent schema output

### Design Principles

1. **Single Source of Truth**: Database is the sole data source
2. **Type Safety**: Full TypeScript typing for all schema components
3. **Validation First**: All schemas must pass schema.org validation
4. **Composability**: Build complex schemas from simple, reusable components
5. **Extensibility**: Easy to add new place types (hotels, attractions, etc.)
6. **Entity Linking**: Proper use of `sameAs`, `@id`, and URLs for SEO entity linking

---

## System Architecture

### Directory Structure

```
/src/lib/schema/
  ├── core/                    # Universal, reusable components
  │   ├── address.ts           # PostalAddress transformer
  │   ├── geo.ts               # GeoCoordinates transformer
  │   ├── contact.ts           # Phone, email, URL
  │   ├── images.ts            # ImageObject array generator
  │   ├── rating.ts            # AggregateRating transformer
  │   ├── hours.ts             # OpeningHoursSpecification transformer
  │   ├── cuisine.ts           # servesCuisine array generator
  │   ├── dog-features.ts      # Dog-specific amenityFeature
  │   ├── payment.ts           # Payment methods transformer
  │   └── reservation.ts       # ReserveAction transformer
  ├── global/                  # Site-wide schemas
  │   ├── website.ts           # WebSite schema with SearchAction
  │   ├── organization.ts      # Dog Friendly Finder organization
  │   └── breadcrumbs.ts       # BreadcrumbList generator
  ├── business/                # Place type specifics
  │   ├── restaurant.ts        # Restaurant schema generator
  │   ├── hotel.ts             # Hotel schema (future)
  │   └── attraction.ts        # TouristAttraction schema (future)
  ├── generators/              # Complete page schema generators
  │   ├── restaurant-page.ts   # Restaurant detail page schema
  │   └── index.ts             # Main exports
  ├── components/
  │   └── JsonLd.tsx           # React component to render JSON-LD
  ├── types.ts                 # TypeScript interfaces
  └── utils.ts                 # Shared utility functions
```

### Component Flow

```
Restaurant Page
    ↓
generators/restaurant-page.ts
    ↓
    ├─→ business/restaurant.ts
    │       ↓
    │       ├─→ core/address.ts
    │       ├─→ core/geo.ts
    │       ├─→ core/images.ts
    │       ├─→ core/rating.ts
    │       ├─→ core/hours.ts
    │       ├─→ core/cuisine.ts
    │       ├─→ core/dog-features.ts
    │       ├─→ core/payment.ts
    │       └─→ core/reservation.ts
    │
    └─→ global/breadcrumbs.ts
```

---

## Core Components

### 1. Address Component (`core/address.ts`)

**Purpose:** Transforms database address fields into PostalAddress schema

**Schema.org Type:** `PostalAddress`

**Database Sources:**
- `restaurants.address` → `streetAddress`
- `restaurants.city` → `addressLocality`
- Address parsing logic → `postalCode` extraction
- `restaurants.country` → `addressCountry` (ISO code)

**Input Interface:**
```typescript
interface AddressInput {
  address: string        // Full formatted address
  city: string          // City/town
  country: string       // Country name
}
```

**Output Schema:**
```json
{
  "@type": "PostalAddress",
  "streetAddress": "64 St John's Wood High St",
  "addressLocality": "London",
  "postalCode": "NW8 7SH",
  "addressCountry": "GB"
}
```

**Implementation Notes:**
- Extract postcode using UK postcode regex: `/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/i`
- Convert country name to ISO 3166-1 alpha-2 code (e.g., "United Kingdom" → "GB")
- Handle cases where postcode may not be present
- Sanitize street address by removing city and postcode

---

### 2. Geo Component (`core/geo.ts`)

**Purpose:** Transforms latitude/longitude into GeoCoordinates schema

**Schema.org Type:** `GeoCoordinates`

**Database Sources:**
- `restaurants.latitude` → `latitude`
- `restaurants.longitude` → `longitude`

**Input Interface:**
```typescript
interface GeoInput {
  latitude: number
  longitude: number
}
```

**Output Schema:**
```json
{
  "@type": "GeoCoordinates",
  "latitude": 51.5325082,
  "longitude": -0.1692872
}
```

**Implementation Notes:**
- Simple passthrough, no transformation needed
- Ensure coordinates are numbers (not strings)
- Validate latitude range: -90 to 90
- Validate longitude range: -180 to 180

---

### 3. Images Component (`core/images.ts`)

**Purpose:** Transforms photo data into ImageObject array

**Schema.org Type:** `ImageObject[]`

**Database Sources:**
- `photos` table joined by `place_id`
- Fields: `public_url`, `caption`, `alt_text`, `width`, `height`, `display_order`

**Input Interface:**
```typescript
interface ImageInput {
  url: string          // Full public URL from Supabase Storage
  caption?: string     // Image caption
  alt_text?: string    // Alt text for accessibility
  width?: number       // Image width in pixels
  height?: number      // Image height in pixels
}
```

**Output Schema:**
```json
{
  "@type": "ImageObject",
  "url": "https://zhsceyvwaikdxajtiydj.supabase.co/storage/v1/object/public/places/restaurants/england-s-grace_london/images/england-s-grace_london_gourmet-burrata-dish_01.jpg",
  "caption": "A beautifully plated burrata dish with fresh ingredients",
  "width": "800",
  "height": "600"
}
```

**Implementation Notes:**
- Return array of ImageObject schemas
- Order by `display_order` ASC
- Width and height must be strings (schema.org requirement)
- Include alt text in `caption` field if no caption exists
- Validate URLs are properly formatted
- Skip images with missing URLs

---

### 4. Rating Component (`core/rating.ts`)

**Purpose:** Transforms review data into AggregateRating schema

**Schema.org Type:** `AggregateRating`

**Database Sources:**
- `restaurants.apify_output.totalScore` → `ratingValue`
- `restaurants.apify_output.reviewsCount` → `ratingCount`
- Alternative: Calculate from `restaurants.ratings.overall_score`

**Input Interface:**
```typescript
interface RatingInput {
  totalScore: number      // Average rating (e.g., 4.6)
  reviewsCount: number    // Total review count (e.g., 418)
}
```

**Output Schema:**
```json
{
  "@type": "AggregateRating",
  "ratingValue": "4.6",
  "ratingCount": "418"
}
```

**Implementation Notes:**
- `ratingValue` must be string
- `ratingCount` must be string
- Default bestRating: "5"
- Default worstRating: "1"
- Skip if no ratings data exists
- Round ratingValue to 1 decimal place

---

### 5. Hours Component (`core/hours.ts`)

**Purpose:** Transforms operating hours JSONB into OpeningHoursSpecification array

**Schema.org Type:** `OpeningHoursSpecification[]`

**Database Sources:**
- `restaurants.hours` JSONB field

**Input Structure:**
```json
{
  "monday": {"open": "09:00", "close": "22:00"},
  "tuesday": {"open": "09:00", "close": "22:00"},
  "wednesday": {"open": "09:00", "close": "22:00"},
  "thursday": {"open": "09:00", "close": "22:00"},
  "friday": {"open": "09:00", "close": "23:00"},
  "saturday": {"open": "10:00", "close": "23:00"},
  "sunday": {"closed": true}
}
```

**Output Schema:**
```json
[
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": "Monday",
    "opens": "09:00",
    "closes": "22:00"
  },
  {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": "Tuesday",
    "opens": "09:00",
    "closes": "22:00"
  }
]
```

**Implementation Notes:**
- Skip days marked as `{"closed": true}` or omit those entries
- Capitalize day names: "Monday", "Tuesday", etc.
- Use 24-hour time format: "HH:MM"
- Validate time format regex: `/^\d{2}:\d{2}$/`
- Combine consecutive days with same hours (optional optimization)
- Handle edge cases: 24-hour venues, midnight closing times

---

### 6. Cuisine Component (`core/cuisine.ts`)

**Purpose:** Generates servesCuisine array from cuisine links

**Schema.org Property:** `servesCuisine` (string[])

**Database Sources:**
- `restaurant_cuisine_links` JOIN `restaurant_cuisines`
- Fallback: `restaurants.apify_output.categories`

**Input Interface:**
```typescript
interface CuisineInput {
  cuisines: string[]  // Array of cuisine names
}
```

**Output:**
```json
["Modern European", "Australian", "British"]
```

**Implementation Notes:**
- Query cuisine names via junction table
- If no cuisines linked, extract from apify_output.categories
- Return array of strings (not objects)
- Limit to 5 cuisines maximum (avoid over-tagging)
- Use canonical cuisine names (not synonyms)

---

### 7. Dog Features Component (`core/dog-features.ts`)

**Purpose:** Generates amenityFeature array for dog-friendly attributes

**Schema.org Type:** `LocationFeatureSpecification[]`

**Database Sources:**
- `restaurant_feature_links` JOIN `restaurant_features`
- Filter by `feature_category = 'dog_amenities'`

**Input Interface:**
```typescript
interface DogFeatureInput {
  features: string[]  // Array of dog-friendly feature names
}
```

**Output Schema:**
```json
[
  {
    "@type": "LocationFeatureSpecification",
    "name": "Dogs Allowed",
    "value": true
  },
  {
    "@type": "LocationFeatureSpecification",
    "name": "Dogs Allowed Inside",
    "value": true
  },
  {
    "@type": "LocationFeatureSpecification",
    "name": "Dogs Allowed Outside",
    "value": true
  },
  {
    "@type": "LocationFeatureSpecification",
    "name": "Dog Water Bowls",
    "value": true
  }
]
```

**Implementation Notes:**
- Use `LocationFeatureSpecification` type (valid for Restaurant)
- **NEVER use `petsAllowed` property** - not valid for Restaurant type (only valid for LodgingBusiness, Accommodation, TouristAttraction)
- Always set `value: true` (we only list features that exist)
- Filter features by `feature_category = 'dog_amenities'`
- Include generic "Dogs Allowed" feature at minimum
- Specify indoor/outdoor dog areas if available

---

### 8. Payment Component (`core/payment.ts`)

**Purpose:** Transforms payment methods into schema properties

**Schema.org Properties:**
- `currenciesAccepted` (string)
- `paymentAccepted` (string[])

**Database Sources:**
- `restaurants.apify_output.additionalInfo.Payments`
- Default: Card payments if modern restaurant

**Input Interface:**
```typescript
interface PaymentInput {
  payments: string[]  // Array of payment method names
}
```

**Output Schema:**
```json
{
  "currenciesAccepted": "GBP",
  "paymentAccepted": ["Cash", "Credit Card", "Debit Card", "Contactless"]
}
```

**Implementation Notes:**
- `currenciesAccepted` is always "GBP" for UK restaurants
- Map payment strings from Apify data:
  - "Credit cards" → "Credit Card"
  - "Debit cards" → "Debit Card"
  - "Cash" → "Cash"
  - Modern restaurants → add "Contactless"
- Return array of strings for `paymentAccepted`
- Default to ["Cash", "Credit Card"] if no data

---

### 9. Reservation Component (`core/reservation.ts`)

**Purpose:** Generates ReserveAction schema for booking integration

**Schema.org Type:** `ReserveAction`

**Database Sources:**
- `restaurants.reservations_url`
- `restaurants.reservations_required` → `acceptsReservations`

**Input Interface:**
```typescript
interface ReservationInput {
  reservationsUrl?: string
  reservationsRequired: boolean
}
```

**Output Schema:**
```json
{
  "acceptsReservations": true,
  "potentialAction": {
    "@type": "ReserveAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.opentable.co.uk/restaurant/profile/304143?ref=4208"
    }
  }
}
```

**Implementation Notes:**
- Include `potentialAction` only if `reservationsUrl` exists
- Always include `acceptsReservations` property
- Use `urlTemplate` (not `url`) in EntryPoint
- Validate URL format
- Common reservation platforms: OpenTable, Resy, SevenRooms

---

## Business Schema: Restaurant

### Restaurant Schema Generator (`business/restaurant.ts`)

**Purpose:** Generates complete Restaurant schema by composing core components

**Schema.org Type:** `Restaurant` (subtype of `FoodEstablishment` and `LocalBusiness`)

**Complete Schema Structure:**

```json
{
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "@id": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood",
  "name": "England's Grace",
  "description": "AI-generated SEO-optimized description (200-300 words)",
  "url": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood",
  "image": [...],                      // From core/images.ts
  "address": {...},                    // From core/address.ts
  "geo": {...},                        // From core/geo.ts
  "telephone": "+44 20 3161 7614",
  "sameAs": [...],                     // Social media + restaurant website
  "servesCuisine": [...],              // From core/cuisine.ts
  "priceRange": "£££",
  "hasMenu": {...},                    // Menu schema
  "aggregateRating": {...},            // From core/rating.ts
  "openingHoursSpecification": [...],  // From core/hours.ts
  "acceptsReservations": true,
  "potentialAction": {...},            // From core/reservation.ts
  "amenityFeature": [...],             // From core/dog-features.ts
  "currenciesAccepted": "GBP",
  "paymentAccepted": [...]             // From core/payment.ts
}
```

### Field-by-Field Specification

#### Core Identity Fields

**`@context`**
- Fixed value: `"https://schema.org"`
- Always required

**`@type`**
- Fixed value: `"Restaurant"`
- Could be array for multiple types: `["Restaurant", "LocalBusiness"]` (optional)

**`@id`**
- Full canonical URL to restaurant page
- Format: `https://www.dogfriendlyfinder.com/places-to-eat/restaurants/{slug}`
- Source: `restaurants.slug`
- **Must include www.**

**`name`**
- Restaurant name
- Source: `restaurants.name`
- Example: `"England's Grace"`

**`description`**
- AI-generated SEO-optimized description
- Source: `restaurants.about`
- Length: 200-300 words
- British English spelling
- Natural, conversational tone (avoid AI clichés)

**`url`**
- Same as `@id` (canonical URL to Dog Friendly Finder page)
- **Must include www.**
- **Purpose:** Primary URL for the Restaurant entity
- **Note:** Restaurant's own website goes in `sameAs` array (not here)

#### Media Fields

**`image`**
- Array of ImageObject schemas
- Generated by: `core/images.ts`
- Source: `photos` table (JOIN by `place_id`)
- Order by: `display_order ASC`

**`sameAs`**
- Array of URLs for entity linking
- **Include:**
  1. Restaurant's official website (`restaurants.website`)
  2. Instagram profile (`restaurants.social_media_urls.instagram`)
  3. Facebook page (`restaurants.social_media_urls.facebook`)
  4. Twitter/TikTok if available
- **Purpose:** SEO entity linking - helps search engines understand the restaurant is the same entity across platforms
- **Why include restaurant website:** Even though we want users on our site, including the restaurant's website in `sameAs` helps search engines link entities and improves our credibility

Example:
```json
"sameAs": [
  "https://www.englandsgrace.com/",
  "https://www.instagram.com/englandsgraceldn/",
  "https://www.facebook.com/p/Englands-Grace-100095609943919/"
]
```

#### Location Fields

**`address`**
- PostalAddress object
- Generated by: `core/address.ts`
- Sources: `restaurants.address`, `restaurants.city`, `restaurants.country`

**`geo`**
- GeoCoordinates object
- Generated by: `core/geo.ts`
- Sources: `restaurants.latitude`, `restaurants.longitude`

**`telephone`**
- International format phone number
- Source: `restaurants.phone`
- Format: `+44 20 3161 7614` (with +44 prefix for UK)

#### Cuisine & Pricing Fields

**`servesCuisine`**
- Array of cuisine names
- Generated by: `core/cuisine.ts`
- Sources: `restaurant_cuisine_links` + `restaurant_cuisines`
- Fallback: `restaurants.apify_output.categories`
- Example: `["Modern European", "Australian", "British"]`

**`priceRange`**
- Price category indicator
- Source: `restaurants.price_range`
- Values: `"£"`, `"££"`, `"£££"`, `"££££"`
- Determined by Anthropic AI based on menu prices and Google data

#### Menu Fields

**`hasMenu`**
- Menu object with URL to menu section
- Format:
```json
{
  "@type": "Menu",
  "url": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood#menu"
}
```
- Links to on-page menu section (anchor link)
- **Must include www.**

#### Rating Fields

**`aggregateRating`**
- AggregateRating object
- Generated by: `core/rating.ts`
- Sources: `restaurants.apify_output.totalScore` and `reviewsCount`
- Example:
```json
{
  "@type": "AggregateRating",
  "ratingValue": "4.6",
  "ratingCount": "418"
}
```

#### Hours & Reservations

**`openingHoursSpecification`**
- Array of OpeningHoursSpecification objects
- Generated by: `core/hours.ts`
- Source: `restaurants.hours` JSONB

**`acceptsReservations`**
- Boolean value
- Source: `restaurants.reservations_required`
- Default: `false` if null

**`potentialAction`**
- ReserveAction object (only if reservations URL exists)
- Generated by: `core/reservation.ts`
- Source: `restaurants.reservations_url`

#### Dog-Friendly Features

**`amenityFeature`**
- Array of LocationFeatureSpecification objects
- Generated by: `core/dog-features.ts`
- Sources: `restaurant_feature_links` + `restaurant_features` (filtered by `feature_category = 'dog_amenities'`)
- **NEVER use `petsAllowed` property** (not valid for Restaurant type)

#### Payment Fields

**`currenciesAccepted`**
- Fixed value: `"GBP"` for UK restaurants
- Single string (not array)

**`paymentAccepted`**
- Array of payment method strings
- Generated by: `core/payment.ts`
- Source: `restaurants.apify_output.additionalInfo.Payments`
- Example: `["Cash", "Credit Card", "Debit Card", "Contactless"]`

---

## Global Schemas

### 1. WebSite Schema (`global/website.ts`)

**Purpose:** Define Dog Friendly Finder as a searchable website entity

**Schema.org Type:** `WebSite`

**Output Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.dogfriendlyfinder.com/#website",
  "name": "Dog Friendly Finder",
  "description": "A comprehensive directory of dog-friendly venues across the United Kingdom",
  "url": "https://www.dogfriendlyfinder.com/",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.dogfriendlyfinder.com/search?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

**Implementation Notes:**
- Include on all pages (global schema)
- Use consistent `@id` with `#website` fragment
- Include SearchAction for search box rich result
- Update when search functionality is implemented

---

### 2. Organization Schema (`global/organization.ts`)

**Purpose:** Define Dog Friendly Finder as an organization entity

**Schema.org Type:** `Organization`

**Output Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.dogfriendlyfinder.com/#organization",
  "name": "Dog Friendly Finder",
  "url": "https://www.dogfriendlyfinder.com/",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.dogfriendlyfinder.com/logo.png",
    "width": "600",
    "height": "60"
  },
  "sameAs": [
    "https://www.facebook.com/dogfriendlyfinder",
    "https://www.instagram.com/dogfriendlyfinder",
    "https://twitter.com/dogfriendlyfind"
  ]
}
```

**Implementation Notes:**
- Include on homepage and about page
- Update social media URLs when created
- Logo dimensions must be strings
- Use high-quality logo image

---

### 3. BreadcrumbList Schema (`global/breadcrumbs.ts`)

**Purpose:** Define navigation hierarchy for SEO and user experience

**Schema.org Type:** `BreadcrumbList`

**Output Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://www.dogfriendlyfinder.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Places to Eat",
      "item": "https://www.dogfriendlyfinder.com/places-to-eat"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Restaurants",
      "item": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants"
    },
    {
      "@type": "ListItem",
      "position": 4,
      "name": "England's Grace",
      "item": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood"
    }
  ]
}
```

**Implementation Notes:**
- Generate dynamically based on URL structure
- Position starts at 1 (not 0)
- All URLs must include www.
- Last item (current page) should still include `item` property
- Include on all restaurant detail pages

---

## Page Schema Generators

### Restaurant Page Generator (`generators/restaurant-page.ts`)

**Purpose:** Generate complete JSON-LD for restaurant detail pages

**Output:** Array of schema objects for a single restaurant page

**Schemas Generated:**
1. Restaurant schema (from `business/restaurant.ts`)
2. BreadcrumbList schema (from `global/breadcrumbs.ts`)

**Function Signature:**
```typescript
export async function generateRestaurantPageSchema(
  restaurantId: string
): Promise<object[]>
```

**Process:**
1. Fetch restaurant data from database with all relations:
   - Restaurant record
   - Photos (ordered by display_order)
   - Cuisines (via restaurant_cuisine_links)
   - Features (via restaurant_feature_links, filtered by dog_amenities)
   - Menu items (ordered by section_name, display_order)

2. Generate Restaurant schema:
   - Compose all core components
   - Apply business logic specific to restaurants
   - Validate required fields exist

3. Generate BreadcrumbList schema:
   - Build breadcrumb trail from restaurant slug
   - Include: Home → Places to Eat → Restaurants → [Restaurant Name]

4. Return array: `[restaurantSchema, breadcrumbSchema]`

**Error Handling:**
- Gracefully handle missing optional fields
- Log warnings for missing required fields
- Return partial schema if critical data missing
- Never throw errors (degrade gracefully)

---

## Database Field Mappings

### Complete Restaurant Data Sources

| Schema Property | Database Source | Transformer | Notes |
|----------------|-----------------|-------------|-------|
| `@id` | `restaurants.slug` | Direct | Add domain prefix + www. |
| `name` | `restaurants.name` | Direct | No transformation |
| `description` | `restaurants.about` | Direct | AI-generated content |
| `url` | `restaurants.slug` | Direct | Same as @id |
| `image` | `photos` table (JOIN) | `core/images.ts` | Order by display_order |
| `address.streetAddress` | `restaurants.address` | `core/address.ts` | Extract street only |
| `address.addressLocality` | `restaurants.city` | `core/address.ts` | Direct |
| `address.postalCode` | `restaurants.address` | `core/address.ts` | Extract via regex |
| `address.addressCountry` | `restaurants.country` | `core/address.ts` | Convert to ISO code |
| `geo.latitude` | `restaurants.latitude` | `core/geo.ts` | Convert to number |
| `geo.longitude` | `restaurants.longitude` | `core/geo.ts` | Convert to number |
| `telephone` | `restaurants.phone` | Direct | Ensure +44 prefix |
| `sameAs` | `restaurants.website`, `restaurants.social_media_urls` | Array builder | Combine all URLs |
| `servesCuisine` | `restaurant_cuisine_links` + `restaurant_cuisines` | `core/cuisine.ts` | JOIN to get names |
| `priceRange` | `restaurants.price_range` | Direct | £, ££, £££, or ££££ |
| `hasMenu.url` | `restaurants.slug` | Direct | Add #menu anchor |
| `aggregateRating.ratingValue` | `restaurants.apify_output.totalScore` | `core/rating.ts` | Convert to string |
| `aggregateRating.ratingCount` | `restaurants.apify_output.reviewsCount` | `core/rating.ts` | Convert to string |
| `openingHoursSpecification` | `restaurants.hours` | `core/hours.ts` | Transform JSONB |
| `acceptsReservations` | `restaurants.reservations_required` | Direct | Boolean |
| `potentialAction` | `restaurants.reservations_url` | `core/reservation.ts` | Only if URL exists |
| `amenityFeature` | `restaurant_feature_links` + `restaurant_features` | `core/dog-features.ts` | Filter dog_amenities |
| `currenciesAccepted` | Static | Direct | Always "GBP" |
| `paymentAccepted` | `restaurants.apify_output.additionalInfo.Payments` | `core/payment.ts` | Map strings |

### Junction Table Queries

**Cuisines:**
```sql
SELECT c.name
FROM restaurant_cuisines c
JOIN restaurant_cuisine_links rcl ON c.id = rcl.cuisine_id
WHERE rcl.restaurant_id = ?
ORDER BY c.name
```

**Features (Dog-Friendly):**
```sql
SELECT f.name
FROM restaurant_features f
JOIN restaurant_feature_links rfl ON f.id = rfl.feature_id
WHERE rfl.restaurant_id = ?
  AND f.feature_category = 'dog_amenities'
ORDER BY f.name
```

**Photos:**
```sql
SELECT public_url, caption, alt_text, width, height
FROM photos
WHERE place_id = ?
ORDER BY display_order ASC
LIMIT 20
```

---

## TypeScript Interfaces

### Core Type Definitions (`types.ts`)

```typescript
// Base schema types
export interface SchemaContext {
  "@context": "https://schema.org"
  "@type": string | string[]
  "@id"?: string
}

// Restaurant schema
export interface RestaurantSchema extends SchemaContext {
  "@type": "Restaurant"
  name: string
  description?: string
  url: string
  image?: ImageObject[]
  address: PostalAddress
  geo: GeoCoordinates
  telephone?: string
  sameAs?: string[]
  servesCuisine?: string[]
  priceRange?: string
  hasMenu?: Menu
  aggregateRating?: AggregateRating
  openingHoursSpecification?: OpeningHoursSpecification[]
  acceptsReservations?: boolean
  potentialAction?: ReserveAction
  amenityFeature?: LocationFeatureSpecification[]
  currenciesAccepted?: string
  paymentAccepted?: string[]
}

// Core component types
export interface PostalAddress {
  "@type": "PostalAddress"
  streetAddress?: string
  addressLocality?: string
  addressRegion?: string
  postalCode?: string
  addressCountry?: string
}

export interface GeoCoordinates {
  "@type": "GeoCoordinates"
  latitude: number
  longitude: number
}

export interface ImageObject {
  "@type": "ImageObject"
  url: string
  caption?: string
  width?: string
  height?: string
}

export interface AggregateRating {
  "@type": "AggregateRating"
  ratingValue: string
  ratingCount: string
  bestRating?: string
  worstRating?: string
}

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification"
  dayOfWeek: string
  opens: string
  closes: string
}

export interface Menu {
  "@type": "Menu"
  url: string
}

export interface ReserveAction {
  "@type": "ReserveAction"
  target: EntryPoint
}

export interface EntryPoint {
  "@type": "EntryPoint"
  urlTemplate: string
}

export interface LocationFeatureSpecification {
  "@type": "LocationFeatureSpecification"
  name: string
  value: boolean
}

// Database input types
export interface RestaurantData {
  id: string
  name: string
  slug: string
  about: string | null
  address: string
  phone: string | null
  latitude: number
  longitude: number
  city: string
  country: string
  price_range: string | null
  hours: Record<string, any> | null
  website: string | null
  social_media_urls: Record<string, string> | null
  apify_output: Record<string, any> | null
  reservations_url: string | null
  reservations_required: boolean
}

export interface PhotoData {
  public_url: string
  caption: string | null
  alt_text: string | null
  width: number | null
  height: number | null
  display_order: number
}

export interface CuisineData {
  name: string
}

export interface FeatureData {
  name: string
  feature_category: string
}
```

---

## React Component

### JsonLd Component (`components/JsonLd.tsx`)

**Purpose:** Render JSON-LD schema in Next.js pages

**Component:**
```typescript
import React from 'react'

interface JsonLdProps {
  data: object | object[]
}

export function JsonLd({ data }: JsonLdProps) {
  const jsonString = JSON.stringify(data, null, 0) // No pretty-print for production

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  )
}
```

**Usage in Restaurant Page:**
```typescript
import { JsonLd } from '@/lib/schema/components/JsonLd'
import { generateRestaurantPageSchema } from '@/lib/schema/generators/restaurant-page'

export default async function RestaurantPage({ params }) {
  const { slug } = params

  // Fetch restaurant data
  const restaurant = await getRestaurant(slug)

  // Generate schema
  const schema = await generateRestaurantPageSchema(restaurant.id)

  return (
    <>
      <JsonLd data={schema} />
      {/* Page content */}
    </>
  )
}
```

**Implementation Notes:**
- Place in `<head>` section of page (Next.js handles this automatically)
- Can include multiple schema objects in array
- No pretty-printing in production (minified)
- Render on server-side (SSR) for SEO

---

## Validation Requirements

### Schema.org Validation

**Tool:** https://validator.schema.org/

**Required Validation Steps:**
1. Copy complete JSON-LD output
2. Paste into schema.org validator
3. Ensure zero errors
4. Review warnings (may be acceptable)

**Common Validation Errors to Avoid:**

1. **Duplicate Keys:**
   - Error: "Duplicate key found in JSON-LD"
   - Solution: Never use the same property twice (e.g., don't use `url` for both Dog Friendly Finder page AND restaurant website)

2. **Invalid Property for Type:**
   - Error: "The property petsAllowed is not recognised by the schema for an object of type Restaurant"
   - Solution: Only use properties valid for Restaurant type - use `amenityFeature` instead of `petsAllowed`

3. **Incorrect Value Type:**
   - Error: "ratingValue must be a string"
   - Solution: Ensure numeric values are converted to strings where required

4. **Line Breaks in URLs:**
   - Error: Image URLs not loading due to spaces
   - Solution: Ensure URLs are continuous strings without line breaks

5. **Missing Required Properties:**
   - Warning: "Missing recommended property 'image'"
   - Solution: Include all recommended properties when data is available

### Google Rich Results Test

**Tool:** https://search.google.com/test/rich-results

**Process:**
1. Enter full URL of restaurant page (or paste HTML)
2. Run test
3. Verify rich results are detected:
   - Restaurant
   - Breadcrumb
4. Check for warnings or errors

**Valid Restaurant Rich Result Indicators:**
- Green checkmark for Restaurant
- Preview shows: Name, rating, price range, cuisine
- No critical errors

---

## Example Output: England's Grace

### Complete Restaurant Page Schema

```json
[
  {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood",
    "name": "England's Grace",
    "description": "England's Grace brings Antipodean flair to St John's Wood with a menu celebrating the best of Modern European and Australian cuisine. Located on St John's Wood High Street, this dog-friendly restaurant welcomes four-legged friends both inside and outside, making it an ideal spot for dog owners seeking quality dining. The menu features standout dishes including gourmet burrata presentations, carefully crafted mains, and indulgent desserts, all prepared with attention to seasonal British ingredients. With a welcoming atmosphere and consistently high ratings from diners, England's Grace has established itself as a neighbourhood favourite. The restaurant accepts reservations and offers both lunch and dinner service throughout the week. Whether you're looking for a relaxed meal with your pup or a special occasion dinner, the team at England's Grace provides attentive service in comfortable surroundings.",
    "url": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood",
    "image": [
      {
        "@type": "ImageObject",
        "url": "https://zhsceyvwaikdxajtiydj.supabase.co/storage/v1/object/public/places/restaurants/england-s-grace_london/images/england-s-grace_london_gourmet-burrata-dish_01.jpg",
        "caption": "A beautifully plated burrata dish with fresh ingredients and vibrant garnishes at England's Grace",
        "width": "800",
        "height": "600"
      },
      {
        "@type": "ImageObject",
        "url": "https://zhsceyvwaikdxajtiydj.supabase.co/storage/v1/object/public/places/restaurants/england-s-grace_london/images/england-s-grace_london_cosy-restaurant-interior_02.jpg",
        "caption": "The warm and inviting interior of England's Grace restaurant",
        "width": "800",
        "height": "600"
      }
    ],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "64 St John's Wood High St",
      "addressLocality": "London",
      "postalCode": "NW8 7SH",
      "addressCountry": "GB"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 51.5325082,
      "longitude": -0.1692872
    },
    "telephone": "+44 20 3161 7614",
    "sameAs": [
      "https://www.englandsgrace.com/",
      "https://www.instagram.com/englandsgraceldn/",
      "https://www.facebook.com/p/Englands-Grace-100095609943919/"
    ],
    "servesCuisine": [
      "Modern European",
      "Australian",
      "British"
    ],
    "priceRange": "£££",
    "hasMenu": {
      "@type": "Menu",
      "url": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood#menu"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.6",
      "ratingCount": "418"
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Monday",
        "opens": "12:00",
        "closes": "22:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Tuesday",
        "opens": "12:00",
        "closes": "22:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Wednesday",
        "opens": "12:00",
        "closes": "22:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Thursday",
        "opens": "12:00",
        "closes": "22:00"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Friday",
        "opens": "12:00",
        "closes": "22:30"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Saturday",
        "opens": "10:00",
        "closes": "22:30"
      },
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": "Sunday",
        "opens": "10:00",
        "closes": "21:00"
      }
    ],
    "acceptsReservations": true,
    "potentialAction": {
      "@type": "ReserveAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://www.opentable.co.uk/restaurant/profile/304143?ref=4208"
      }
    },
    "amenityFeature": [
      {
        "@type": "LocationFeatureSpecification",
        "name": "Dogs Allowed",
        "value": true
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "Dogs Allowed Inside",
        "value": true
      },
      {
        "@type": "LocationFeatureSpecification",
        "name": "Dogs Allowed Outside",
        "value": true
      }
    ],
    "currenciesAccepted": "GBP",
    "paymentAccepted": [
      "Cash",
      "Credit Card",
      "Debit Card",
      "Contactless"
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://www.dogfriendlyfinder.com/"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Places to Eat",
        "item": "https://www.dogfriendlyfinder.com/places-to-eat"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Restaurants",
        "item": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants"
      },
      {
        "@type": "ListItem",
        "position": 4,
        "name": "England's Grace",
        "item": "https://www.dogfriendlyfinder.com/places-to-eat/restaurants/englands-grace-st-johns-wood"
      }
    ]
  }
]
```

---

## Future Extensions

### Hotel Schema (`business/hotel.ts`)

**Schema.org Type:** `Hotel` (or `LodgingBusiness`)

**Additional Properties:**
- `checkinTime` / `checkoutTime`
- `petsAllowed` (YES, valid for Hotel type!)
- `numberOfRooms`
- `starRating`
- `amenityFeature` (pet-friendly rooms, pet amenities)

**Shared Components:**
- address, geo, images, rating, contact (reuse from core)
- dog-features (adapted for hotel context)

---

### Attraction Schema (`business/attraction.ts`)

**Schema.org Type:** `TouristAttraction`

**Additional Properties:**
- `isAccessibleForFree`
- `publicAccess`
- `petsAllowed` (YES, valid for TouristAttraction!)
- `touristType`

**Shared Components:**
- address, geo, images, rating, hours, contact
- dog-features (outdoor spaces, trails, restrictions)

---

### Shop Schema (`business/shop.ts`)

**Schema.org Type:** `Store` (or `PetStore` if pet-specific)

**Additional Properties:**
- `currenciesAccepted`
- `paymentAccepted`
- `priceRange`

**Shared Components:**
- address, geo, images, rating, hours, contact
- dog-features (dogs allowed inside, water bowls)

---

## Key Learnings & Best Practices

### What Works

1. **Composition over inheritance** - Reusable core components make extending to new place types easy

2. **Dynamic generation** - Always reflects current database state, no sync issues

3. **Entity linking with sameAs** - Including restaurant's own website in `sameAs` array helps search engines link entities and improves credibility

4. **Proper use of amenityFeature** - LocationFeatureSpecification is the correct way to indicate dog-friendly features for Restaurant type

5. **URL consistency** - Always use www. subdomain for consistency and canonical URL management

### What Doesn't Work

1. **petsAllowed property** - NOT valid for Restaurant type (only for LodgingBusiness, Accommodation, TouristAttraction)
   - ✅ Use: `amenityFeature` with LocationFeatureSpecification
   - ❌ Don't use: `petsAllowed`

2. **Using url for multiple purposes** - Can't use `url` for both Dog Friendly Finder page AND restaurant website
   - ✅ Use: `url` for Dog Friendly Finder page, `sameAs` for restaurant website
   - ❌ Don't use: `url` twice or for wrong purpose

3. **Line breaks in JSON** - Breaks URLs and causes validation errors
   - ✅ Use: Continuous strings without line breaks
   - ❌ Don't use: Multi-line strings that create spaces in URLs

4. **Storing schema in database** - Creates sync issues and duplication
   - ✅ Use: Dynamic generation on page render
   - ❌ Don't use: Database storage with manual updates

5. **Assuming properties are universal** - Different schema types support different properties
   - ✅ Use: Check schema.org documentation for each type
   - ❌ Don't use: Properties without validating they're supported

---

## Implementation Checklist

### Phase 1: Core Components
- [ ] Create `core/address.ts` with postcode extraction
- [ ] Create `core/geo.ts` with coordinate validation
- [ ] Create `core/images.ts` with photo transformation
- [ ] Create `core/rating.ts` with string conversion
- [ ] Create `core/hours.ts` with JSONB transformation
- [ ] Create `core/cuisine.ts` with junction table query
- [ ] Create `core/dog-features.ts` with LocationFeatureSpecification
- [ ] Create `core/payment.ts` with payment mapping
- [ ] Create `core/reservation.ts` with ReserveAction

### Phase 2: Business Schema
- [ ] Create `business/restaurant.ts` composing core components
- [ ] Add validation for required fields
- [ ] Implement error handling for missing data
- [ ] Add TypeScript interfaces in `types.ts`

### Phase 3: Global Schemas
- [ ] Create `global/website.ts` with SearchAction
- [ ] Create `global/organization.ts` with logo
- [ ] Create `global/breadcrumbs.ts` with dynamic generation

### Phase 4: Generators
- [ ] Create `generators/restaurant-page.ts`
- [ ] Add database queries with all required joins
- [ ] Compose Restaurant + BreadcrumbList schemas
- [ ] Export main generator function

### Phase 5: React Component
- [ ] Create `components/JsonLd.tsx` with proper rendering
- [ ] Test server-side rendering
- [ ] Verify schema appears in page source

### Phase 6: Integration
- [ ] Update restaurant detail page to use schema generator
- [ ] Place JsonLd component in page head
- [ ] Test with real restaurant data

### Phase 7: Validation
- [ ] Validate with schema.org validator
- [ ] Test with Google Rich Results Test
- [ ] Fix any validation errors
- [ ] Document any warnings

### Phase 8: Testing
- [ ] Test with 5-10 different restaurants
- [ ] Verify all optional fields handled gracefully
- [ ] Check performance (schema generation time)
- [ ] Validate URLs include www.
- [ ] Confirm no duplicate properties

### Phase 9: Documentation
- [ ] Add inline code comments
- [ ] Create usage examples
- [ ] Document error handling
- [ ] Write troubleshooting guide

---

## Performance Considerations

### Caching Strategy

**Page-Level Caching:**
```typescript
export const revalidate = 3600 // 1 hour
```

**Database Query Optimization:**
- Use single query with multiple joins instead of N+1 queries
- Index all foreign keys used in joins
- Limit photo queries to reasonable number (20 max)

**Schema Generation Time:**
- Target: <50ms per restaurant
- Monitoring: Log generation time in development
- Optimization: Cache commonly used lookups (cuisines list, features list)

---

## Monitoring & Debugging

### Validation Monitoring

**Automated Checks:**
- Run schema.org validator on sample pages daily
- Alert on validation errors
- Track validation score over time

**Manual Checks:**
- Weekly Google Rich Results Test on new pages
- Monthly audit of 20 random restaurant pages
- Quarterly review of schema.org updates

### Error Logging

**Log Categories:**
1. Missing required data (warn level)
2. Invalid data format (error level)
3. Schema generation failures (error level)
4. Validation failures (critical level)

**Example Log Entry:**
```json
{
  "timestamp": "2025-10-28T10:00:00Z",
  "level": "warn",
  "message": "Missing photos for restaurant",
  "restaurant_id": "uuid-here",
  "restaurant_slug": "englands-grace-st-johns-wood",
  "component": "core/images.ts"
}
```

---

## Summary

This SEO Schema System provides:

✅ **Modular, composable architecture** for building complex schemas from simple components

✅ **Dynamic generation** that always reflects current database state

✅ **Type-safe TypeScript** interfaces for all schema objects

✅ **Complete validation** against schema.org and Google requirements

✅ **Extensible design** for future place types (hotels, attractions, shops)

✅ **Production-ready** error handling and graceful degradation

✅ **Comprehensive documentation** with examples and best practices

The system is ready to be implemented following the phased checklist above.
