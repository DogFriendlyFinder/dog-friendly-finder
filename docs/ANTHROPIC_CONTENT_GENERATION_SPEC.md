# Anthropic Content Generation - Technical Specification

**Version:** 2.0
**Date:** 2025-01-21
**Status:** ✅ Fully Implemented and Operational

---

## Overview

This document specifies the Anthropic AI content generation system for transforming raw scraped data (from Apify and Firecrawl) into structured, SEO-optimized content for the Dog Friendly Finder restaurant directory.

---

## System Architecture

### Data Flow

```
[Raw Data in Database]
    ↓
    apify_output (JSONB)
    firecrawl_output (JSONB)
    menu_data (JSONB)
    ↓
[API Route: /api/restaurants/[id]/generate-content]
    ↓
[Anthropic Claude 3.5 Sonnet]
    ↓
[Generated Content (JSON)]
    ↓
[Mapping & Validation Layer]
    ↓
[Database Updates + Reference Table Links]
    ↓
[Restaurant Record Populated]
```

---

## API Endpoint

### Route
`POST /api/restaurants/[id]/generate-content`

### Location
`/src/app/api/restaurants/[id]/generate-content/route.ts`

### Request
```typescript
POST /api/restaurants/fd3706ee-473f-4635-b56d-466351aabc75/generate-content
Content-Type: application/json

// No body required - uses restaurant ID from URL
```

### Response (Initial Implementation - About Only)
```json
{
  "success": true,
  "restaurant_id": "fd3706ee-473f-4635-b56d-466351aabc75",
  "restaurant_name": "74 Duke",
  "generated_content": {
    "about": "Located on Mayfair's Duke Street..."
  },
  "tokens_used": {
    "input_tokens": 26572,
    "output_tokens": 271
  },
  "model": "claude-3-5-sonnet-20241022"
}
```

### Response (Future - All Fields)
```json
{
  "success": true,
  "restaurant_id": "uuid",
  "restaurant_name": "Restaurant Name",
  "generated_content": {
    // Direct text fields
    "about": "string",
    "best_times_description": "string",
    "public_review_sentiment": "string",
    "sentiment_score": 8.5,
    "dress_code": "string | null",
    "getting_there_public": "string",
    "getting_there_car": "string",
    "getting_there_with_dogs": "string",

    // Structured JSONB fields
    "faqs": [...],
    "ratings": {...},
    "hours": {...},
    "social_media_urls": {...},
    "restaurant_awards": [...],

    // Array fields
    "best_times_buzzing": ["string"],
    "best_times_relaxed": ["string"],
    "best_times_with_dogs": ["string"],
    "accessibility_features": ["string"],

    // Reference table suggestions
    "cuisines": ["string"],
    "categories": ["string"],
    "features": ["string"],
    "meals": ["string"],
    "popular_dishes": ["string"],

    // Menu items
    "menu_items": [...]
  },
  "metadata": {
    "tokens_used": {...},
    "model": "string",
    "processing_time_ms": 1234,
    "fields_generated": 25
  }
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

---

## Implementation Status: All Fields Operational ✅

### Complete Implementation
**Status:** Fully operational and tested with multiple restaurants

**All Fields Implemented:**
- ✅ `slug` - Intelligent URL slug generation
- ✅ `about` - 200-300 word SEO description (British English)
- ✅ `phone` - International format with +44 prefix
- ✅ `price_range` - £, ££, £££, or ££££ categorization
- ✅ `social_media_urls` - Instagram, Facebook, Twitter, TikTok
- ✅ `cuisines` - Match-or-create from database
- ✅ `categories` - Match-or-create from database
- ✅ `features` - Match-only against 65 pre-seeded features
- ✅ `neighbourhood` - Match-or-create from 150+ London areas

**Key Features:**
- ✅ Prompt caching (5-minute TTL, 90% cost reduction)
- ✅ British English enforcement
- ✅ Live reference data integration
- ✅ Junction table linking for many-to-many relationships
- ✅ Integrated into /admin/add workflow

**Test Results:**
- ✅ Successfully tested with The Albert, Mountain Beak Street, Marta
- ✅ Natural, human-sounding language (British English)
- ✅ Dog-friendly features accurately detected
- ✅ Price ranges correctly categorized
- ✅ 14 features detected for The Albert
- ✅ Neighbourhoods matched (Primrose Hill)
- ✅ Token usage with caching: ~157k cached, ~16k input per request

### Legacy: Phase-by-Phase Implementation (Historical)
**Status:** Completed - All phases finished

**Fields to add:**
- `best_times_description` - Narrative guide to visiting times
- `public_review_sentiment` - Review summary
- `sentiment_score` - 0-10 aggregate score
- `faqs` - Array of 5-10 Q&A objects
- `ratings` - JSONB with detailed scores

**Prompt Changes:**
- Request JSON output instead of plain text
- Structured schema definition
- Field-by-field validation

### Phase 3: Popular Times Analysis
**Status:** Planned

**Fields to add:**
- `best_times_buzzing` - Array of busy periods
- `best_times_relaxed` - Array of quiet periods
- `best_times_with_dogs` - Array of optimal dog-friendly times

**Data Source:**
- `apify_output.popularTimesHistogram` - Hourly occupancy data by day

**Logic:**
- Analyze occupancy percentages
- Identify peak times (>80% occupancy)
- Identify quiet times (<30% occupancy)
- Recommend dog-friendly times (moderate occupancy + outdoor seating)

### Phase 4: Operating Data Extraction
**Status:** Planned

**Fields to add:**
- `hours` - Structured operating hours JSONB
- `social_media_urls` - JSONB with social links
- `accessibility_features` - Array of accessibility info
- `restaurant_awards` - Array of awards/recognition
- `dress_code` - String or null

**Data Sources:**
- `apify_output.openingHours`
- `firecrawl_output.social_*` scrapes
- `apify_output.additionalInfo.Accessibility`

### Phase 5: Location & Transportation
**Status:** Planned

**Fields to add:**
- `getting_there_public` - Public transport directions
- `getting_there_car` - Driving and parking info
- `getting_there_with_dogs` - Dog-specific transport notes

**Logic:**
- Extract location from `apify_output.address`
- Generate directions based on nearby landmarks
- Include dog-friendly transport tips

### Phase 6: Reference Table Mapping
**Status:** Planned - NEEDS DECISION

**Fields to add:**
- `cuisines` - Array of cuisine type names
- `categories` - Array of restaurant category names
- `features` - Array of feature/amenity names
- `meals` - Array of meal type names
- `popular_dishes` - Array of popular dish names

**Mapping Strategy:** (See "Reference Table Mapping" section below)

### Phase 7: Menu Processing
**Status:** Planned

**Fields to add:**
- `menu_items` - Array of menu item objects for bulk insert

**Data Source:**
- `menu_data` - Already scraped and structured

**Logic:**
- Parse sections and items
- Extract prices and descriptions
- Identify dietary tags
- Maintain display order

---

## Prompt Caching Strategy

### Overview

**Implementation:** Anthropic Ephemeral Prompt Caching with 5-minute TTL

**Purpose:** Reduce costs by 90% and eliminate rate limit impact for repeated requests with large static prompts

### Architecture

**Cached Content (~157k tokens):**
1. Complete neighbourhoods list (150+ London areas)
2. Complete cuisines list (all current cuisines in database)
3. Complete categories list (all current categories)
4. Complete features list (65 pre-seeded features with detection rules)
5. All field-specific generation rules and instructions
6. Global rules and formatting guidelines

**Non-Cached Content (~16k tokens per request):**
- Restaurant-specific data (`apify_output`, `firecrawl_output`, `menu_data`)
- Restaurant name and ID
- Actual generation request

### Configuration

```typescript
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 2048,
  system: [
    {
      type: 'text',
      text: largeStaticPrompt,  // ~157k tokens
      cache_control: { type: 'ephemeral' }  // 5-minute TTL
    }
  ],
  messages: [
    {
      role: 'user',
      content: restaurantSpecificData  // ~16k tokens
    }
  ]
})
```

### Cache Behavior

**First Request (Cache WRITE):**
- Tokens: 157k (cache write) + 16k (input) + 1k (output) = 174k total
- Cost: ~$0.66
  - Cache write: 157k × $3.75/MTok = $0.59
  - Input: 16k × $3/MTok = $0.05
  - Output: 1k × $15/MTok = $0.015

**Subsequent Requests (Cache READ - within 5 minutes):**
- Tokens: 157k (cache read) + 16k (input) + 1k (output)
- Cost: ~$0.11
  - **Cache read: 157k × $0.30/MTok = $0.047** (90% discount)
  - Input: 16k × $3/MTok = $0.05
  - Output: 1k × $15/MTok = $0.015
- **Cache reads DON'T count toward rate limits** 🎉

**Cache Lifetime:**
- TTL: 5 minutes from last use
- Auto-refresh: Using the cache extends the TTL at no cost
- Expiration: Cache expires after 5 minutes of inactivity
- Next request: Automatically re-establishes cache

### Benefits

1. **Cost Reduction:** 90% savings on cached content (~$0.55 → ~$0.05 per request)
2. **Rate Limit Exemption:** Cache reads don't count against 30k tokens/min limit
3. **Consistency:** All requests use same reference data during cache lifetime
4. **Performance:** Slightly faster responses (no re-parsing of large prompt)

### Monitoring

**Usage Data from API Response:**
```typescript
{
  usage: {
    input_tokens: 16000,
    cache_creation_input_tokens: 157000,  // First request only
    cache_read_input_tokens: 157000,       // Subsequent requests
    output_tokens: 1000
  }
}
```

**Logging:**
- Log cache writes vs reads in application logs
- Track cache hit rate over time
- Monitor cost savings

---

## Reference Table Mapping Strategy

### Approach: Hybrid Mapping (RECOMMENDED)

**Step 1: Anthropic Suggests (No Database Knowledge)**

Anthropic analyzes raw data and outputs plain text suggestions:
```json
{
  "cuisines": ["Japanese", "Asian Fusion"],
  "categories": ["Fine Dining", "Romantic", "Date Night"],
  "features": ["Dog Water Bowls", "Outdoor Seating", "Reservations Available"],
  "meals": ["Lunch", "Dinner"],
  "popular_dishes": ["Tonkotsu Ramen", "Gyoza", "Miso Black Cod"]
}
```

**Step 2: Backend Smart Mapping**

For each suggested value:
1. **Exact match lookup** - Check if it exists in reference table
2. **Fuzzy match** - Try case-insensitive partial matching
3. **Create new entry** - If no match found, create it
4. **Link to restaurant** - Create junction table relationship

**Pseudo-code:**
```typescript
async function mapCuisines(restaurantId: string, cuisineNames: string[]) {
  const cuisineIds = [];

  for (const name of cuisineNames) {
    // 1. Try exact match
    let cuisine = await findCuisineByName(name);

    if (!cuisine) {
      // 2. Try fuzzy match
      cuisine = await fuzzyFindCuisine(name);
    }

    if (!cuisine) {
      // 3. Create new
      cuisine = await createCuisine({
        name: normalizeText(name),
        slug: generateSlug(name),
        description: null,
        meta_title: `${name} Restaurants | Dog Friendly Finder`,
        meta_description: `Discover dog-friendly ${name} restaurants across the UK.`
      });

      // Log for admin review
      await logNewReference('cuisine', cuisine.id, name);
    }

    cuisineIds.push(cuisine.id);
  }

  // 4. Create links
  await createCuisineLinks(restaurantId, cuisineIds);
}
```

### Normalization Rules

**Text Normalization:**
- Trim whitespace
- Title case (e.g., "japanese" → "Japanese")
- Remove duplicate spaces
- Handle common variations (e.g., "Japanese Cuisine" → "Japanese")

**Slug Generation:**
- Lowercase
- Replace spaces with hyphens
- Remove special characters
- Ensure uniqueness (append -2, -3 if needed)

**Example:**
```typescript
Input: "Japanese Cuisine"
  ↓
name: "Japanese"
slug: "japanese"
meta_title: "Japanese Restaurants | Dog Friendly Finder"
```

### Fuzzy Matching Strategy

**Level 1: Case-insensitive exact**
```sql
WHERE LOWER(name) = LOWER('japanese')
```

**Level 2: Partial match**
```sql
WHERE LOWER(name) LIKE LOWER('%japanese%')
```

**Level 3: Levenshtein distance** (future)
```sql
WHERE levenshtein(name, 'japanese') < 3
```

### Duplicate Prevention

**Before creating new entry:**
1. Check exact match on `name`
2. Check exact match on `slug`
3. Check fuzzy matches
4. If still unique, create with unique slug

**Conflict Resolution:**
- Log potential duplicates for admin review
- Auto-merge obvious matches (e.g., "Japanese" = "japanese")
- Flag ambiguous cases (e.g., "Japanese Fusion" vs "Japanese")

---

## Anthropic Prompt Engineering

### Prompt Structure (Current - Phase 1)

```
You are analyzing restaurant data for a dog-friendly restaurant directory.

RESTAURANT: {name}

APIFY DATA (Google Places):
{apify_output JSON}

FIRECRAWL DATA (Review Sites & Web):
{firecrawl_output JSON}

TASK: Write a 1-paragraph description (200-300 words) about this restaurant.

REQUIREMENTS:
- Focus on what makes this place special
- Mention dog-friendly features if available
- Include cuisine type and atmosphere
- Mention popular dishes or signature items
- Use natural, conversational language (avoid AI clichés)
- Be specific and concrete
- Make it SEO-friendly but human-sounding

OUTPUT: Return ONLY the paragraph text, no JSON, no formatting.
```

### Prompt Structure (Future - All Fields)

```
You are analyzing restaurant data for a dog-friendly restaurant directory.

RESTAURANT: {name}

APIFY DATA (Google Places):
{apify_output JSON}

FIRECRAWL DATA (Review Sites & Web):
{firecrawl_output JSON}

MENU DATA:
{menu_data JSON}

AVAILABLE REFERENCE DATA (Current Database State):

AVAILABLE CUISINES (prefer these names if applicable, suggest new only if truly unique):
{live_cuisines_list}
Example: Japanese, Italian, British, French, Indian, Chinese, Thai, Mexican, Spanish, Greek, Turkish, Lebanese, Vietnamese, Korean, American, European, Mediterranean, Asian Fusion, Modern British, Contemporary European, Middle Eastern, Caribbean, African, Latin American, Gastropub, Vegan, Vegetarian

AVAILABLE CATEGORIES (prefer these names if applicable):
{live_categories_list}
Example: Fine Dining, Casual Dining, Gastropub, Pub, Cafe, Bistro, Brasserie, Wine Bar, Cocktail Bar, Romantic, Family Friendly, Date Night, Special Occasion

AVAILABLE FEATURES (prefer these names if applicable):
{live_features_list}
Example: Dog Water Bowls, Outdoor Seating, Dog Treats, Dog Menu, Indoor Dog-Friendly Area, Heated Outdoor Area, WiFi, Disabled Access, Vegetarian Options, Vegan Options, Gluten-Free Options, Private Dining, Takeaway, Delivery, Reservations Recommended, Walk-ins Welcome

AVAILABLE MEALS (prefer these names if applicable):
{live_meals_list}
Example: Breakfast, Brunch, Lunch, Dinner, Afternoon Tea, Sunday Roast, Tasting Menu, Small Plates, Bar Snacks

TASK: Generate structured content for this restaurant.

OUTPUT FORMAT (JSON):
{
  "slug": "string (URL-friendly identifier, see SLUG GENERATION rules)",
  "about": "string (200-300 words)",
  "best_times_description": "string",
  "public_review_sentiment": "string",
  "sentiment_score": number (0-10),
  "faqs": [
    {
      "question": "string",
      "answer": "string"
    }
  ],
  "ratings": {
    "food_quality": number (0-10),
    "service": number (0-10),
    "ambiance": number (0-10),
    "value_for_money": number (0-10),
    "accessibility_amenities": number (0-10),
    "dog_friendly_score": number (0-10),
    "overall_score": number (weighted average)
  },
  "cuisines": ["string", "string"],  // 1-3 cuisine names (see CUISINES rules)
  "categories": ["string", "string"],  // 1-3 category names
  "features": ["string", "string", ...],  // Relevant features (max 20)
  "meals": ["string", "string"],  // Meal types served (max 5)
  "popular_dishes": ["string", "string"],  // Popular dish names
  "getting_there_public": "string",
  "getting_there_car": "string",
  "getting_there_with_dogs": "string",
  // ... (all other fields)
}

GLOBAL RULES:
1. Use ONLY data from provided sources (no fabrication)
2. For missing data, use null or empty arrays
3. All claims must be traceable to source data
4. Use natural, human-sounding language
5. Be specific and concrete (no vague descriptions)
6. For dog-friendly features, be explicit about what's available
7. For popular dishes, extract from menu_data and reviews
8. For best times, analyze popularTimesHistogram data
9. For ratings, aggregate from multiple sources
10. Flag any contradictory information

REFERENCE DATA RULES:
11. For cuisines/categories/features/meals: PREFER existing names from the provided lists
12. Use EXACT names from lists (case-sensitive): "Japanese" not "japanese"
13. Only suggest NEW entries for legitimately unique items not covered by existing taxonomy
14. See individual field sections (SLUG GENERATION, RESTAURANT CUISINES, etc.) for detailed rules

OUTPUT: Valid JSON matching the schema above.
```

### Content Guidelines

**Writing Style:**
- Natural, conversational tone
- Avoid AI clichés:
  - ❌ "nestled in", "culinary journey", "delightful", "gem"
  - ✅ "located on", "menu features", "popular choice", "spot"
- Specific over generic:
  - ❌ "offers a variety of dishes"
  - ✅ "menu features tonkotsu ramen, gyoza, and miso black cod"
- Dog-friendly focus:
  - Always mention dog-related features if available
  - Highlight outdoor seating, water bowls, dog treats, etc.
  - Suggest best times to visit with dogs

**SEO Optimization:**
- Include location keywords (neighborhood, street, city)
- Mention cuisine types naturally
- Include popular dish names
- Use relevant descriptive terms (atmosphere, pricing, style)

---

## Field-Specific Generation Rules

This section defines precise rules for generating each field. These specifications are provided to Anthropic Claude as part of the prompt to ensure consistent, high-quality output across all restaurants.

---

### ════════════════════════════════════════════════════════════
### SLUG GENERATION
### ════════════════════════════════════════════════════════════

**Field:** `slug` (string, unique identifier for URL)

**Purpose:** Generate a URL-safe, SEO-optimized, unique identifier for the restaurant.

**Format:** `{restaurant-name}` OR `{restaurant-name}-{location}`

**Decision Logic:**

The AI must intelligently determine whether location is needed in the slug by analyzing:
1. **"People also search for" data** (from Apify output)
   - If similar restaurant names appear with different locations → include location
   - Example: "Wimpy Borehamwood", "Wimpy Watford" → location needed
2. **Restaurant name uniqueness**
   - Common chain names (e.g., "Wimpy", "Pret", "Costa") → include location
   - Unique/branded names (e.g., "Abuelo Cafe", "The Oak & Anchor") → assess individually
3. **Contextual clues**
   - Restaurant explicitly identifies as part of a chain → include location
   - Multiple locations mentioned in "about" section → include location

**Fallback Strategy:**
- **If uncertain** → Default to INCLUDING location for safety
- Better to be explicit than risk future conflicts

**Location Hierarchy:**
Use the most specific available location identifier:
1. **Neighbourhood** (preferred) - e.g., "camden-town", "borehamwood", "shoreditch"
2. **City** (if neighbourhood unavailable) - e.g., "london", "manchester", "brighton"
3. **Postcode area** (last resort) - e.g., "nw1", "sw3"

**Data Source:**
- Location data extracted from `apify_output.address` or `apify_output.neighborhood`
- Should be available in all Apify scraped data

**Formatting Rules:**
1. **Lowercase only**
2. **Alphanumeric + hyphens only** (remove apostrophes, ampersands, special chars)
3. **Remove common suffixes:** "restaurant", "cafe", "pub", "bar", "kitchen" (unless part of unique brand name)
4. **Handle "The":**
   - Remove leading "The" in most cases
   - Keep if integral to brand (e.g., "The Ivy" → "the-ivy")
5. **Ampersands:** Replace "&" with "and" (e.g., "Fish & Chips" → "fish-and-chips")
6. **Apostrophes:** Remove WITHOUT adding hyphen (e.g., "Jamie's Italian" → "jamies-italian", "It's Bagels" → "its-bagels")
   - IMPORTANT: Do NOT separate apostrophe-adjacent letters with hyphens
   - ❌ WRONG: "it-s-bagels", "jamie-s-italian"
   - ✅ CORRECT: "its-bagels", "jamies-italian"
7. **Spaces:** Convert to hyphens
8. **Multiple consecutive hyphens:** Collapse to single hyphen

**Uniqueness Enforcement:**
- Before finalizing slug, check if it already exists in database
- If duplicate found:
  - Append `-2`, `-3`, `-4`, etc.
  - Example: `wimpy-borehamwood`, `wimpy-borehamwood-2`

**Max Length:** 60 characters (for SEO best practices)

**Examples:**

```
Input: "Abuelo Cafe", Camden Town
Analysis: Unique branded name, single location likely
Output: "abuelo-camden"

Input: "The Wimpy", Borehamwood
Analysis: Chain name, "people also search" shows other Wimpy locations
Output: "wimpy-borehamwood"

Input: "The Oak & Anchor Pub", NW3 area
Analysis: Unique name, no chain indicators, but includes location for specificity
Output: "oak-and-anchor-nw3"

Input: "Honest Burgers", King's Cross
Analysis: Known chain, location essential
Output: "honest-burgers-kings-cross"

Input: "Jamie's Italian Restaurant", Covent Garden
Analysis: Chain, remove "Restaurant" suffix, apostrophe removed without hyphen
Output: "jamies-italian-covent-garden"

Input: "The Ivy", Chelsea
Analysis: "The" is part of brand identity
Output: "the-ivy-chelsea"

Input: "It's Bagels", Primrose Hill
Analysis: Apostrophe removed WITHOUT adding hyphen between "it" and "s"
Output: "its-bagels-primrose-hill"
```

**Edge Cases:**

- **Very long names:** Truncate at 60 chars, ensure it ends on a complete word
- **Numbers in name:** Keep them (e.g., "74 Duke" → "74-duke-mayfair")
- **Non-English characters:** Transliterate to ASCII (e.g., "Café" → "cafe")
- **All special chars:** If name is only special chars, use "restaurant-{location}"

**Validation:**
- Must match regex: `^[a-z0-9]+(-[a-z0-9]+)*$`
- Must be 3-60 characters long
- Must be unique across all restaurants

**Backend Handling:**
- Slug generation happens during content generation phase
- Database enforces uniqueness constraint
- If conflict detected, API appends number suffix automatically

---

### ════════════════════════════════════════════════════════════
### RESTAURANT CUISINES
### ════════════════════════════════════════════════════════════

**Field:** `cuisines` (array of strings - cuisine names)

**Purpose:** Identify the cuisine type(s) for this restaurant to enable filtering, SEO pages, and categorization.

**Data Sources:**
- `apify_output.categoryName` - Primary Google Maps category
- `apify_output.description` - Restaurant description
- `firecrawl_output` - Review site cuisines (TripAdvisor, OpenTable, etc.)
- `menu_data` - Menu items that indicate cuisine style

**Available Cuisines List:**

You will receive a current list of available cuisines from the database. This list represents the existing taxonomy and should be preferred to maintain consistency.

**Example of provided list:**
```
Available Cuisines: Japanese, Italian, British, French, Indian, Chinese, Thai, Mexican, Spanish, Greek, Turkish, Lebanese, Vietnamese, Korean, American, European, Mediterranean, Asian Fusion, Modern British, Contemporary European, Middle Eastern, Caribbean, African, Latin American, Gastropub, Vegan, Vegetarian
```

**Decision Rules:**

1. **Prefer Existing Names:**
   - If the restaurant's cuisine matches an existing cuisine in the list, use that EXACT name
   - Case matters: use "Japanese" not "japanese" or "JAPANESE"
   - Use the full name from list: "Modern British" not "Modern british"

2. **When to Create New Cuisines:**
   - Only suggest new cuisines for legitimately unique or specialized styles
   - ✅ Examples of valid new cuisines:
     - "Japanese-Korean Fusion" (specific fusion not in list)
     - "Nepalese" (distinct cuisine not covered by broader categories)
     - "Modern Indian" (modern interpretation distinct from traditional)
   - ❌ Do NOT create micro-categories:
     - "Neapolitan Pizza" → use "Italian"
     - "Sushi Bar" → use "Japanese"
     - "British Pub" → use "British" + category "Gastropub"
     - "French Bistro" → use "French"

3. **Multiple Cuisines:**
   - Restaurants can have 1-3 cuisines
   - Maximum: 3 cuisines per restaurant
   - Order by prominence (primary cuisine first)
   - Example: ["Japanese", "Asian Fusion"] for a Japanese restaurant with fusion elements
   - Example: ["British", "European"] for a Modern British restaurant with European influences

4. **Fusion Cuisines:**
   - Check if fusion exists in available list first
   - If not in list, suggest specific fusion: "Japanese-Korean Fusion", "Asian-Latin Fusion"
   - Avoid generic "Fusion" alone - always specify what's being fused

5. **Broad vs. Specific:**
   - Generally prefer specific over broad when accurate
   - "Japanese" > "Asian" (when it's specifically Japanese)
   - "Modern British" > "British" (when menu shows modern interpretation)
   - But don't over-specify: "Italian" not "Roman" or "Tuscan" unless truly specialized

**Analysis Process:**

1. Check `apify_output.categoryName` - often the best indicator
2. Scan menu items in `menu_data` - what types of dishes dominate?
3. Review any cuisine mentions in `firecrawl_output` review sites
4. Look at popular dishes in `apify_output.popularDishes`
5. Cross-reference with Available Cuisines list
6. Select 1-3 most accurate cuisine names (existing or new)

**Output Format:**

```json
{
  "cuisines": ["Japanese", "Asian Fusion"]
}
```

**Examples:**

```
Restaurant: "Dishoom"
Menu: Breakfast naans, Bombay comfort food, chai
Available List: [..., "Indian", ...]
Analysis: Indian cuisine with Bombay focus
Output: ["Indian"]

Restaurant: "Hawksmoor"
Menu: Steaks, British classics, Sunday roast
Available List: [..., "British", "Gastropub", ...]
Analysis: British steakhouse
Output: ["British"]

Restaurant: "Smoking Goat"
Menu: Thai BBQ, northern Thai dishes, som tam
Available List: [..., "Thai", ...]
Analysis: Thai cuisine
Output: ["Thai"]

Restaurant: "Gaucho"
Menu: Argentinian steaks, empanadas, chimichurri
Available List: [..., "Latin American", ...]
Analysis: Argentinian is Latin American cuisine
Output: ["Latin American"]

Restaurant: "Barrafina"
Menu: Spanish tapas, jamón, tortilla
Available List: [..., "Spanish", ...]
Analysis: Spanish tapas bar
Output: ["Spanish"]

Restaurant: "Hoppers"
Menu: Sri Lankan hoppers, kothu roti, dosas
Available List: [..., "Indian", ...] (no "Sri Lankan")
Analysis: Sri Lankan is distinct from Indian
Output: ["Sri Lankan"]
Reason: Legitimately unique cuisine not covered by existing categories

Restaurant: "Kol"
Menu: Mexican with British ingredients, mole, tacos
Available List: [..., "Mexican", "Contemporary European", ...]
Analysis: Mexican cuisine with modern/British twist
Output: ["Mexican", "Contemporary European"]

Restaurant: "Jikoni"
Menu: Fusion of African, Asian, Middle Eastern
Available List: [..., "African", "Asian Fusion", "Middle Eastern", ...]
Analysis: Multi-cultural fusion
Output: ["Asian Fusion", "African", "Middle Eastern"]
Reason: Restaurant explicitly does multi-regional fusion
```

**Common Mistakes to Avoid:**

❌ **WRONG:** Creating variations of existing cuisines
- Don't suggest: "Japanese Cuisine" when "Japanese" exists
- Don't suggest: "Modern Italian" when "Italian" exists (unless truly distinct modern interpretation)
- Don't suggest: "british" (lowercase) when "British" exists

❌ **WRONG:** Being too granular
- Don't suggest: "Neapolitan Pizza" → use "Italian"
- Don't suggest: "Cantonese" → use "Chinese"
- Don't suggest: "Punjabi" → use "Indian"

❌ **WRONG:** Using categories as cuisines
- Don't suggest: "Fine Dining" → that's a category, not a cuisine
- Don't suggest: "Pub Food" → use "British" + add "Gastropub" to categories
- Don't suggest: "Steakhouse" → identify the cuisine style (British, American, etc.)

✅ **CORRECT:** Using existing names exactly
- "Japanese" ✓
- "Modern British" ✓
- "Asian Fusion" ✓

✅ **CORRECT:** Suggesting new cuisines only when truly unique
- "Peruvian" (if not in list and menu is clearly Peruvian)
- "Ethiopian" (if not in list and menu is clearly Ethiopian)
- "Japanese-Korean Fusion" (if specific fusion not covered)

**Validation:**
- Array must contain 1-3 strings
- Each string must be a cuisine name (not empty)
- Names should use title case (e.g., "Modern British" not "modern british")

**Backend Processing:**
- For each cuisine name in the array:
  1. Backend attempts case-insensitive exact match against `restaurant_cuisines` table
  2. If match found → use existing cuisine ID
  3. If NO match → auto-create new cuisine entry with:
     - `name`: Normalized name (title case, trimmed)
     - `slug`: Generated from name (e.g., "sri-lankan")
     - `meta_title`: "{Name} Restaurants | Dog Friendly Finder"
     - `meta_description`: "Discover dog-friendly {name} restaurants across the UK."
  4. Create links via `restaurant_cuisine_links` junction table

---

### ════════════════════════════════════════════════════════════
### RESTAURANT CATEGORIES
### ════════════════════════════════════════════════════════════

**Field:** `categories` (array of strings - category names)

**Purpose:** Classify restaurant type/style and occasion suitability for filtering and SEO pages.

**Data Sources:**
- `apify_output.categoryName` - Google Maps category (e.g., "Pub", "Cafe", "Restaurant")
- `apify_output.price` - Price range indicates dining level (£, ££, £££, ££££)
- `apify_output.description` - May contain vibe/style indicators
- `apify_output.reviews` - Customer mentions of occasions, atmosphere
- `firecrawl_output` - Review site classifications

**Available Categories List:**

You will receive a current list of available categories from the database. This list represents the existing taxonomy and should be preferred to maintain consistency.

**Example of provided list:**
```
Available Categories: Fine Dining, Casual Dining, Gastropub, Pub, Cafe, Bistro, Brasserie, Wine Bar, Cocktail Bar, Fast Casual, Romantic, Family Friendly, Date Night, Special Occasion, Business Dining
```

**Category Types:**

1. **Establishment Type** (select at least 1):
   - Fine Dining, Casual Dining, Gastropub, Pub, Cafe, Bistro, Brasserie, Wine Bar, Cocktail Bar, Fast Casual

2. **Occasion/Vibe** (select 0-3):
   - Romantic, Family Friendly, Date Night, Special Occasion, Business Dining, Casual Hangout

**Decision Rules:**

1. **Prefer Existing Names:**
   - Use EXACT names from available list (case-sensitive)
   - Example: "Fine Dining" not "fine dining" or "Fine-Dining"

2. **When to Create New Categories:**
   - Only for legitimately unique establishment types or occasions
   - ✅ Examples of valid new categories:
     - "Brunch Spot" (if not in list and restaurant is brunch-focused)
     - "Rooftop Bar" (if distinct from existing bar categories)
   - ❌ Do NOT create micro-categories:
     - "Expensive Restaurant" → use "Fine Dining"
     - "Cheap Eats" → use "Casual Dining" or "Fast Casual"
     - "Kids Restaurant" → use "Family Friendly"

3. **Multiple Categories:**
   - Minimum: 1 category (at least 1 establishment type)
   - Maximum: 4 categories total
   - Order: Establishment type first, then occasion/vibe categories
   - Example: ["Gastropub", "Romantic", "Date Night"]

4. **Establishment Type Selection Logic:**

   **Fine Dining** indicators:
   - Price: "£££" or "££££"
   - Description keywords: "elegant", "refined", "upscale", "michelin", "tasting menu"
   - Reservations typically required
   - Multi-course meals

   **Gastropub** indicators:
   - apify_output.categoryName = "Pub"
   - Menu shows elevated/quality pub food
   - Price: "££" or "£££"
   - Craft beer selection, seasonal menu

   **Pub** indicators:
   - apify_output.categoryName = "Pub"
   - Traditional pub food (fish & chips, Sunday roast)
   - Price: "£" or "££"
   - Casual atmosphere

   **Casual Dining** indicators:
   - apify_output.categoryName = "Restaurant"
   - Price: "££"
   - Relaxed atmosphere, walk-ins welcome
   - Not fine dining level

   **Cafe/Bistro/Brasserie** indicators:
   - apify_output.categoryName matches directly
   - Menu and hours align with category type

   **Wine Bar/Cocktail Bar** indicators:
   - apify_output.categoryName = "Bar" or "Wine bar"
   - Menu focused on drinks with small plates

   **Fast Casual** indicators:
   - Quick service format
   - Price: "£" or "££"
   - Counter service, no table service

5. **Occasion/Vibe Detection:**

   **Romantic:**
   - Reviews mention: "date night", "romantic", "intimate", "cozy"
   - Typically: dim lighting, quiet atmosphere, ££+ pricing

   **Family Friendly:**
   - Reviews mention: "kids", "children", "family", "high chairs"
   - Amenities include: kids menu, family seating
   - Casual atmosphere

   **Date Night:**
   - Similar to romantic but broader
   - Upscale casual or fine dining
   - Good cocktails/wine list

   **Special Occasion:**
   - Reviews mention: "birthday", "anniversary", "celebration"
   - Fine dining or upscale casual
   - Often requires reservations

   **Business Dining:**
   - Reviews mention: "business lunch", "meetings", "corporate"
   - Central location, quieter atmosphere
   - Typically ££+ pricing

**Analysis Process:**

1. Check `apify_output.categoryName` (primary indicator for establishment type)
2. Check `apify_output.price` to narrow establishment type
3. Scan `apify_output.description` for style/vibe keywords
4. Review sample of `apify_output.reviews` for occasion mentions
5. Cross-reference with Available Categories list
6. Select 1-2 establishment types + 0-2 occasion categories (max 4 total)

**Output Format:**

```json
{
  "categories": ["Gastropub", "Romantic", "Date Night"]
}
```

**Examples:**

```
Restaurant: "Hawksmoor"
categoryName: "Restaurant"
price: "£££"
description: "Upscale steakhouse with refined atmosphere"
reviews: Mention "special occasion", "date night", "anniversary"
Available List: [..., "Fine Dining", "Date Night", "Special Occasion", ...]
Analysis: Fine dining steakhouse, great for special occasions
Output: ["Fine Dining", "Date Night", "Special Occasion"]

Restaurant: "The Spaniards Inn"
categoryName: "Pub"
price: "££"
menu: Traditional pub food, Sunday roast, fish & chips
reviews: Mention "family", "beer garden", "kids loved it"
Available List: [..., "Pub", "Family Friendly", ...]
Analysis: Traditional pub with family-friendly outdoor space
Output: ["Pub", "Family Friendly"]

Restaurant: "Dishoom"
categoryName: "Restaurant"
price: "££"
description: "Bombay cafe with casual atmosphere"
reviews: Mention "casual", "great for groups", "family"
Available List: [..., "Casual Dining", "Family Friendly", ...]
Analysis: Casual dining, welcoming for families
Output: ["Casual Dining", "Family Friendly"]

Restaurant: "Sketch"
categoryName: "Restaurant"
price: "££££"
description: "Fine dining with afternoon tea, art gallery"
reviews: "special occasion", "instagram-worthy", "amazing experience"
Available List: [..., "Fine Dining", "Special Occasion", ...]
Output: ["Fine Dining", "Special Occasion"]

Restaurant: "Pret A Manger"
categoryName: "Cafe"
price: "£"
description: "Quick service sandwich shop"
Available List: [..., "Cafe", "Fast Casual", ...]
Analysis: Fast casual cafe
Output: ["Cafe", "Fast Casual"]

Restaurant: "The Anchor & Hope"
categoryName: "Pub"
price: "££"
description: "Award-winning gastropub with seasonal British menu"
reviews: "amazing food", "no reservations", "worth the wait"
Available List: [..., "Gastropub", ...]
Output: ["Gastropub"]

Restaurant: "Clos Maggiore"
categoryName: "Restaurant"
price: "££££"
description: "Romantic French restaurant in Covent Garden"
reviews: "most romantic", "perfect date night", "proposal"
Available List: [..., "Fine Dining", "Romantic", "Date Night", ...]
Output: ["Fine Dining", "Romantic", "Date Night"]
```

**Common Mistakes to Avoid:**

❌ **WRONG:** Using cuisines as categories
- Don't suggest: "Italian Restaurant" → use establishment type only, cuisines go in separate field

❌ **WRONG:** Creating redundant categories
- Don't suggest: "Upscale Dining" when "Fine Dining" exists
- Don't suggest: "Kids Friendly" when "Family Friendly" exists

❌ **WRONG:** Too many categories (>4)
- Don't suggest: ["Pub", "Gastropub", "Casual Dining", "Romantic", "Date Night", "Family Friendly"]
- Be selective, choose the most accurate ones

❌ **WRONG:** No establishment type
- Don't suggest: ["Romantic", "Date Night"] without an establishment type
- Always include at least one: Fine Dining, Casual Dining, Pub, etc.

✅ **CORRECT:** Clear, focused categorization
- ["Fine Dining", "Date Night"] ✓
- ["Gastropub", "Family Friendly"] ✓
- ["Cafe"] ✓
- ["Casual Dining", "Romantic", "Special Occasion"] ✓

**Validation:**
- Array must contain 1-4 strings
- Must include at least 1 establishment type category
- Names should use title case with proper spacing (e.g., "Fine Dining" not "fine dining")

**Backend Processing:**
- For each category name in the array:
  1. Backend attempts case-insensitive exact match against `restaurant_categories` table
  2. If match found → use existing category ID
  3. If NO match → auto-create new category entry with:
     - `name`: Normalized name (title case, trimmed)
     - `slug`: Generated from name (e.g., "fine-dining")
     - `meta_title`: "{Name} Restaurants | Dog Friendly Finder"
     - `meta_description`: "Discover dog-friendly {name.toLowerCase()} restaurants across the UK."
  4. Create links via `restaurant_category_links` junction table

---

### ════════════════════════════════════════════════════════════
### PRICE RANGE
### ════════════════════════════════════════════════════════════

**Field:** `price_range` (string - one of: "£", "££", "£££", "££££")

**Purpose:** Categorize restaurant's price level for filtering and user expectations.

**Data Sources (in priority order):**
1. `apify_output.price` (e.g., "£10–20", "£100+", "$", "££")
2. Menu prices in `menu_data` or `firecrawl_output`
3. Restaurant category/description indicating price level
4. Review mentions of price/value

**Price Categories:**

**£ (Budget) - Under £15 per person:**
- Fast food, casual cafes, takeaway joints
- Pub meals, basic dining
- Examples: "£5-10", "£10-15", "Budget", "Inexpensive"

**££ (Moderate) - £15-30 per person:**
- Casual dining restaurants, gastropubs
- Mid-range chains, bistros
- Examples: "£15-25", "£20-30", "Moderate", "$"

**£££ (Upscale) - £30-60 per person:**
- Fine dining, upscale restaurants
- Premium gastropubs, high-end bistros
- Examples: "£35-50", "£40-60", "Expensive", "$$"

**££££ (Luxury) - £60+ per person:**
- Michelin-starred, luxury fine dining
- Exclusive high-end establishments
- Examples: "£80+", "£100+", "Very Expensive", "$$"
- **Auto-trigger:** Michelin stars/awards → automatically ££££

**Decision Logic:**
1. Parse `apify_output.price` for price ranges or symbols
2. If `menu_data` exists, analyze average main course prices
3. Cross-reference with restaurant category (Fine Dining → likely £££ or ££££)
4. Consider Michelin stars, awards → automatically ££££
5. If uncertain, default to ££ (moderate)

**Output:** Single string matching EXACTLY one of: "£", "££", "£££", "££££"

**Examples:**

```
Restaurant: "Pret A Manger"
apify_output.price: "£5-10"
Analysis: Fast casual cafe, budget pricing
Output: "£"

Restaurant: "The Albert"
apify_output.price: "£10-20"
category: "Gastropub"
Analysis: Moderate gastropub pricing
Output: "££"

Restaurant: "Hawksmoor"
apify_output.price: "£40-60"
category: "Fine Dining"
menu_data average: £45 mains
Analysis: Upscale steakhouse
Output: "£££"

Restaurant: "Gordon Ramsay Restaurant"
Michelin stars: 3
apify_output.price: "£150+"
Analysis: Luxury fine dining with Michelin stars
Output: "££££"
```

**Validation:**
- Must be one of: "£", "££", "£££", "££££"
- No other values accepted

**Backend Processing:**
- Direct field update, no junction table
- Database constraint validates enum values

---

### ════════════════════════════════════════════════════════════
### RESTAURANT FEATURES
### ════════════════════════════════════════════════════════════

**Field:** `features` (array of strings - feature names to match)

**Purpose:** Identify amenities and characteristics from a pre-seeded list of 65 features.

**Important:** Features are **MATCH-ONLY** - they cannot be created dynamically. The AI must suggest names from the pre-seeded list.

**Data Sources (in priority order):**
1. `apify_output.additionalInfo.Pets` - Dog-related amenities
2. `apify_output.additionalInfo.Amenities` - General amenities
3. `apify_output.additionalInfo.Accessibility` - Accessibility features
4. `apify_output.additionalInfo.Payments` - Payment methods
5. `apify_output.additionalInfo.Planning` - Reservation info
6. `firecrawl_output.special_diets` - Dietary options
7. `menu_data` - Menu analysis for dietary markers
8. Reviews - Mentions of amenities, atmosphere

**Available Features (65 total across 10 categories):**

You will receive the complete list of 65 features in the prompt. Use EXACT names from this list.

**Feature Categories:**
1. **dog_amenities** (9) - Dog Water Bowls, Dog Menu, Dog Treats, Dog Beds Available, etc.
2. **outdoor_dining** (8) - Beer Garden, Patio, Terrace, Rooftop Seating, etc.
3. **dietary** (7) - Vegan Options, Vegetarian Options, Gluten-Free Options, etc.
4. **dining_options** (8) - Breakfast Served, Brunch Served, Sunday Roast, Tasting Menu, etc.
5. **atmosphere** (8) - Family-Friendly, Romantic Setting, Live Music, etc.
6. **accessibility** (5) - Wheelchair Accessible, Step-Free Entry, Accessible Restroom, etc.
7. **amenities** (5) - Free WiFi, Parking Available, Bar Area, Private Dining Room, etc.
8. **services** (5) - Takeaway Available, Delivery Service, Online Booking, etc.
9. **payment** (3) - Card Payments Accepted, Contactless Payments, Cash Only
10. **policies** (2) - BYO Wine Allowed, No Corkage Fee

**Detection Rules:**

**1. DOG AMENITIES:**
- Check `apify_output.additionalInfo.Pets` for "Dogs allowed"
- If true, add "Dog-Friendly Indoor Seating" at minimum
- Check for outdoor seating → add "Dog-Friendly Outdoor Seating"
- Look for mentions of water bowls, treats, dog menu in reviews

**2. OUTDOOR DINING:**
- Check `apify_output.additionalInfo.Amenities` for "Outdoor seating"
- Determine type:
  - British pubs with outdoor → "Beer Garden"
  - Restaurants with outdoor → "Patio" or "Terrace"
  - Check for "rooftop" mentions → "Rooftop Seating"

**3. DIETARY:**
- Check `firecrawl_output.special_diets` + `menu_data`
- "Vegetarian Friendly" → "Vegetarian Options"
- "Vegan Options" → "Vegan Options"
- Menu items marked veg/vegan → include those options

**4. ACCESSIBILITY:**
- Check `apify_output.additionalInfo.Accessibility`
- "Wheelchair accessible entrance" → "Wheelchair Accessible" + "Step-Free Entry"

**5. PAYMENTS:**
- Check `apify_output.additionalInfo.Payments`
- "Credit cards" or "Debit cards" → "Card Payments Accepted"
- Modern restaurants → likely "Contactless Payments"

**6. RESERVATIONS:**
- Check `apify_output.additionalInfo.Planning`
- "Accepts reservations" → "Reservations Recommended"

**7. ATMOSPHERE/DINING:**
- Infer from category and reviews
- Category "Fine Dining" → "Upscale Dining" + "Reservations Recommended"
- Category "Gastropub" → "Sunday Roast" (UK pubs)
- Reviews mention family/kids → "Family-Friendly"
- Operating hours include breakfast → "Breakfast Served"

**8. SERVICES:**
- Check `firecrawl_output` for delivery mentions → "Delivery Service", "Takeaway Available"
- Check for online booking links → "Online Booking"

**Output Format:**

```json
{
  "features": [
    "Dog-Friendly Outdoor Seating",
    "Beer Garden",
    "Sunday Roast",
    "Family-Friendly",
    "Card Payments Accepted",
    "Contactless Payments",
    "Lunch Served",
    "Dinner Served",
    "All Day Dining",
    "Casual Atmosphere",
    "Reservations Recommended",
    "Live Music",
    "Bar Area",
    "Wheelchair Accessible"
  ]
}
```

**Examples:**

```
Restaurant: "The Albert"
apify_output.additionalInfo:
  - Pets: "Dogs allowed"
  - Amenities: "Outdoor seating"
  - Payments: "Credit cards", "Debit cards"
  - Planning: "Accepts reservations"
  - Accessibility: "Wheelchair accessible entrance"
Category: "Gastropub"
Reviews: Mention "family", "Sunday roast", "live music"

Detected Features:
- Dog-Friendly Outdoor Seating (dogs + outdoor)
- Beer Garden (pub with outdoor)
- Sunday Roast (gastropub)
- Family-Friendly (reviews)
- Card Payments Accepted (payments)
- Contactless Payments (modern)
- Lunch Served (operating hours)
- Dinner Served (operating hours)
- All Day Dining (operating hours)
- Casual Atmosphere (gastropub)
- Reservations Recommended (accepts reservations)
- Live Music (reviews)
- Bar Area (pub)
- Wheelchair Accessible (accessibility)

Output: Array of 14 features (all matched exactly)
```

**Common Mistakes to Avoid:**

❌ **WRONG:** Suggesting features not in the list
- Don't suggest: "Outdoor Seating" (generic)
- Use instead: "Beer Garden", "Patio", or "Terrace" (specific types)

❌ **WRONG:** Creating variations
- Don't suggest: "Dog friendly seating"
- Use instead: "Dog-Friendly Outdoor Seating" (exact name)

❌ **WRONG:** Too many features (>15)
- Maximum: 15 features per restaurant
- Prioritize most relevant and well-supported by data

✅ **CORRECT:** Exact names from list
- "Dog Water Bowls" ✓
- "Wheelchair Accessible" ✓
- "Vegan Options" ✓

**Validation:**
- Array must contain 0-15 strings
- Each string must match an existing feature name (case-sensitive)
- Features not in database will be logged but not created

**Backend Processing:**
```typescript
// Match features (NO creation)
for (const name of aiSuggestedFeatures) {
  const existing = await supabase
    .from('restaurant_features')
    .select('id, name')
    .eq('name', name)  // Exact match
    .single()

  if (existing) {
    featureIds.push(existing.id)
  } else {
    notFound.push(name)  // Log for review, do NOT create
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

### ════════════════════════════════════════════════════════════
### NEIGHBOURHOODS
### ════════════════════════════════════════════════════════════

**Field:** `neighbourhood` (string - neighbourhood name)

**Purpose:** Identify the specific London neighbourhood for the restaurant.

**Data Sources:**
1. `apify_output.address` - Full formatted address
2. `apify_output.neighborhood` - If provided by Google Places
3. Geocoding inference from `latitude` and `longitude`

**Available Neighbourhoods:**

You will receive a current list of 150+ London neighbourhoods from the database.

**Example of provided list:**
```
Available Neighbourhoods: Primrose Hill, Camden Town, Shoreditch, Dalston, Hackney, Islington, King's Cross, Covent Garden, Soho, Mayfair, Marylebone, Fitzrovia, Bloomsbury, Clerkenwell, Holborn, Westminster, Pimlico, Belgravia, Knightsbridge, Chelsea, South Kensington, Kensington, Notting Hill, Bayswater, Paddington, St John's Wood, Hampstead, Belsize Park, Highgate, Finsbury Park, Stoke Newington, Walthamstow, Leyton, Stratford, Bow, Mile End, Bethnal Green, Whitechapel, Stepney, Limehouse, Canary Wharf, Greenwich, Blackheath, Deptford, Peckham, Camberwell, Brixton, Clapham, Battersea, Wandsworth, Putney, Fulham, Hammersmith, Shepherd's Bush, White City, Acton, Ealing, Richmond, Twickenham, Kingston, Wimbledon, Tooting, Balham, Streatham, Dulwich, Crystal Palace, Catford, Lewisham, Bexley, Woolwich, Eltham, Brentford, Hounslow, Southall, Hayes, Uxbridge, Ruislip, Harrow, Wembley, Willesden, Cricklewood, Kilburn, Maida Vale, Regent's Park, Baker Street, Marble Arch, Oxford Circus, Bond Street, Piccadilly, Leicester Square, Charing Cross, Embankment, Waterloo, London Bridge, Borough, Southwark, Elephant and Castle, Kennington, Vauxhall, Nine Elms, Stockwell, Oval, Old Street, Barbican, Moorgate, Liverpool Street, Aldgate, Tower Hill, Tower Bridge, Bermondsey, Rotherhithe, Surrey Quays, Canada Water, Shadwell, Wapping, Shoreditch Park, Hoxton, De Beauvoir Town, Canonbury, Highbury, Arsenal, Tufnell Park, Kentish Town, Gospel Oak, Swiss Cottage, West Hampstead, Kilburn High Road, Queen's Park, Kensal Rise, Kensal Green, Ladbroke Grove, Holland Park, Earl's Court, West Brompton, Parsons Green, Borehamwood
```

**Decision Rules:**

1. **Prefer Existing Names:**
   - If address or neighborhood field contains an existing neighbourhood name, use it
   - Case-insensitive matching
   - Example: Address "64 Heath St, Hampstead" → "Hampstead"

2. **When to Create New Neighbourhoods:**
   - Only if address clearly specifies a neighbourhood not in the list
   - Must be a real, recognized London neighbourhood
   - ✅ Examples of valid new neighbourhoods:
     - "Sydenham" (real neighbourhood, not in list)
     - "Forest Hill" (real neighbourhood, not in list)
   - ❌ Do NOT create:
     - Street names as neighbourhoods
     - Postcode areas alone (e.g., "NW3")
     - Building names or landmarks

3. **Extraction Process:**
   - Parse `apify_output.address` for neighbourhood name
   - Check against available list (case-insensitive)
   - If match found → use existing name (with correct capitalization from database)
   - If NO match → suggest new neighbourhood name for creation

4. **Fallback:**
   - If neighbourhood unclear, use broader area or city name
   - "London" is acceptable if more specific location cannot be determined

**Output Format:**

```json
{
  "neighbourhood": "Primrose Hill"
}
```

**Examples:**

```
Address: "The Albert, 11 Princess Rd, London NW1 8JR, UK"
Analysis: Princess Road is in Primrose Hill area
Available List contains: "Primrose Hill"
Output: "Primrose Hill"

Address: "Wimpy, 96-98 Shenley Rd, Borehamwood WD6 1EB, UK"
Analysis: Borehamwood is a town north of London
Available List contains: "Borehamwood"
Output: "Borehamwood"

Address: "Abuelo Cafe, 25 Delancey St, Camden Town, London NW1 7NL, UK"
Analysis: Address explicitly mentions Camden Town
Available List contains: "Camden Town"
Output: "Camden Town"

Address: "Restaurant Name, 123 High Street, Forest Hill, London SE23 1AA"
Analysis: Forest Hill is a real neighbourhood
Available List does NOT contain: "Forest Hill"
Output: "Forest Hill"  (will be created in database)
```

**Validation:**
- Must be a string (neighbourhood name)
- Should be title case (e.g., "Primrose Hill" not "primrose hill")

**Backend Processing:**
```typescript
// Match or create neighbourhood
const { data: existing } = await supabase
  .from('neighbourhoods')
  .select('id, name')
  .ilike('name', neighbourhoodName)  // Case-insensitive
  .single()

if (existing) {
  // Link to existing
  await supabase
    .from('restaurants')
    .update({ neighbourhood_id: existing.id })
    .eq('id', restaurantId)
} else {
  // Create new neighbourhood
  const { data: newNeighbourhood } = await supabase
    .from('neighbourhoods')
    .insert({
      name: normalizedName,
      slug: generateSlug(normalizedName),
      city_id: londonCityId
    })
    .select()
    .single()

  // Link to new neighbourhood
  await supabase
    .from('restaurants')
    .update({ neighbourhood_id: newNeighbourhood.id })
    .eq('id', restaurantId)
}
```

---

### ════════════════════════════════════════════════════════════
### BRITISH ENGLISH ENFORCEMENT
### ════════════════════════════════════════════════════════════

**Requirement:** All AI-generated narrative content must use British English spelling and terminology.

**Scope:**
- `about` field descriptions
- `faqs` questions and answers
- `best_times_description`
- `public_review_sentiment`
- Any other narrative content

**British English vs American English:**

**Spelling Differences:**
- ✅ "colour" not ❌ "color"
- ✅ "favourite" not ❌ "favorite"
- ✅ "centre" not ❌ "center"
- ✅ "organised" not ❌ "organized"
- ✅ "neighbourhood" not ❌ "neighborhood"
- ✅ "flavour" not ❌ "flavor"
- ✅ "honour" not ❌ "honor"
- ✅ "realise" not ❌ "realize"
- ✅ "specialise" not ❌ "specialize"

**Terminology Differences:**
- ✅ "chips" not ❌ "fries"
- ✅ "aubergine" not ❌ "eggplant"
- ✅ "courgette" not ❌ "zucchini"
- ✅ "rocket" not ❌ "arugula"
- ✅ "coriander" not ❌ "cilantro"
- ✅ "takeaway" not ❌ "takeout"
- ✅ "booking" not ❌ "reservation" (in most contexts)
- ✅ "bill" not ❌ "check" (at end of meal)

**Implementation in Prompt:**

Add this instruction to the Anthropic prompt:

```
BRITISH ENGLISH REQUIREMENT:
All narrative content must use British English spelling and terminology.
- Use British spelling: colour, favourite, centre, organised, neighbourhood, etc.
- Use British food terms: chips (not fries), aubergine (not eggplant), courgette (not zucchini)
- Use British phrases: takeaway (not takeout), booking (in most contexts), bill (not check)
- Write for a UK audience with UK cultural context
```

**Examples:**

✅ **CORRECT (British English):**
```
"The restaurant specialises in seasonal British cuisine, with favourites like fish and
chips and Sunday roast. The cosy neighbourhood atmosphere makes it a favourite for
families. Booking in advance is recommended, especially for weekend dining."
```

❌ **WRONG (American English):**
```
"The restaurant specializes in seasonal British cuisine, with favorites like fish and
fries and Sunday roast. The cozy neighborhood atmosphere makes it a favorite for
families. Reservations are recommended, especially for weekend dining."
```

**Validation:**
- Currently manual spot-checks during testing
- Future: Could implement British English dictionary validation

---

## Validation & Error Handling

### Input Validation

**Before calling Anthropic:**
1. Check restaurant exists in database
2. Verify `apify_output` is not null
3. Optionally check `firecrawl_output` is not null
4. Validate restaurant ID format (UUID)

### Output Validation

**After Anthropic response:**
1. Verify JSON is valid (if JSON output)
2. Check required fields are present
3. Validate field types match schema
4. Check text length requirements:
   - `about`: 100-500 words
   - `best_times_description`: 50-300 words
5. Validate numeric ranges:
   - `sentiment_score`: 0-10
   - All ratings: 0-10
6. Check arrays are not excessively long:
   - `cuisines`: max 3
   - `categories`: max 4 (minimum 1)
   - `features`: max 20
   - `faqs`: 5-10

### Error Recovery

**Anthropic API Errors:**
- 429 Rate Limit: Log and retry with exponential backoff
- 500 Server Error: Retry up to 3 times
- 400 Bad Request: Log prompt and data for debugging

**Validation Errors:**
- Missing required fields: Return partial success with warning
- Invalid data types: Attempt to coerce, otherwise null
- Out of range values: Clamp to valid range and log warning

**Database Errors:**
- Transaction rollback on any failure
- Log error details for debugging
- Return clear error message to client

---

## Database Updates

### Update Strategy: Incremental

**Phase 1 (Current):**
```typescript
// Only update 'about' field
await supabase
  .from('restaurants')
  .update({ about: generatedContent.about })
  .eq('id', restaurantId);
```

**Future Phases:**
```typescript
// Update all generated fields
await supabase
  .from('restaurants')
  .update({
    about: content.about,
    best_times_description: content.best_times_description,
    public_review_sentiment: content.public_review_sentiment,
    sentiment_score: content.sentiment_score,
    dress_code: content.dress_code,
    faqs: content.faqs,
    ratings: content.ratings,
    hours: content.hours,
    social_media_urls: content.social_media_urls,
    accessibility_features: content.accessibility_features,
    restaurant_awards: content.restaurant_awards,
    best_times_buzzing: content.best_times_buzzing,
    best_times_relaxed: content.best_times_relaxed,
    best_times_with_dogs: content.best_times_with_dogs,
    getting_there_public: content.getting_there_public,
    getting_there_car: content.getting_there_car,
    getting_there_with_dogs: content.getting_there_with_dogs,
  })
  .eq('id', restaurantId);

// Then handle reference table mappings
await mapCuisines(restaurantId, content.cuisines);
await mapCategories(restaurantId, content.categories);
await mapFeatures(restaurantId, content.features);
await mapMeals(restaurantId, content.meals);
await mapDishes(restaurantId, content.popular_dishes);

// Then insert menu items
await bulkInsertMenuItems(restaurantId, content.menu_items);
```

### Transaction Safety

**Option 1: Database Transaction (Preferred)**
```sql
BEGIN;
  -- Update restaurant
  UPDATE restaurants SET ... WHERE id = $1;
  -- Create reference entries
  INSERT INTO restaurant_cuisines ...
  -- Create junction table links
  INSERT INTO restaurant_cuisine_links ...
COMMIT;
```

**Option 2: Try/Catch with Manual Rollback**
```typescript
try {
  await updateRestaurant();
  await mapReferences();
  await insertMenuItems();
} catch (error) {
  // Manual rollback or log for retry
  await logFailedGeneration(restaurantId, error);
  throw error;
}
```

---

## Performance & Cost Considerations

### Anthropic API Costs

**Per Restaurant Estimate:**
- Input tokens: ~25,000-30,000 (apify + firecrawl data)
- Output tokens: ~500-1,000 (all fields)
- Model: Claude 3.5 Sonnet
- Cost: ~$0.07-0.15 per restaurant

**At Scale:**
- 100 restaurants: $7-15
- 1,000 restaurants: $70-150
- 10,000 restaurants: $700-1,500

### Rate Limits

**Anthropic Rate Limits (varies by tier):**
- Requests per minute: Varies
- Tokens per minute: Varies
- Acceleration limit: New API keys have gradual ramp-up

**Mitigation:**
- Implement exponential backoff
- Queue processing system
- Batch process during off-peak hours

### Optimization Strategies

1. **Prompt Compression:** Remove unnecessary whitespace from JSON
2. **Selective Data:** Only include relevant fields from raw data
3. **Caching:** Store successful generations, don't regenerate unnecessarily
4. **Batch Processing:** Process multiple restaurants with delays
5. **Retry Logic:** Smart retry with backoff on rate limits

---

## Testing Strategy

### Unit Tests
- Validate prompt construction
- Test fuzzy matching logic
- Verify slug generation
- Test normalization functions

### Integration Tests
- Test full API endpoint flow
- Verify database updates
- Test error handling
- Validate reference table creation

### Manual Testing Checklist
- [ ] Generate content for 3-5 sample restaurants
- [ ] Verify all fields populated correctly
- [ ] Check for AI clichés or unnatural language
- [ ] Validate SEO optimization
- [ ] Ensure dog-friendly features are highlighted
- [ ] Check data accuracy against source data
- [ ] Verify no fabricated information

---

## Open Questions & Decisions Needed

### Reference Table Pre-seeding
**Question:** Should we pre-populate common values in reference tables?

**Options:**
- A: Pre-seed 20-30 common cuisines, 15-20 categories, 50+ features
- B: Let Anthropic create everything dynamically
- C: Hybrid - seed common ones, create rare ones

**Decision:** TBD

### Auto-Approval vs Manual Review
**Question:** When Anthropic suggests new cuisine/category/feature, should we auto-create?

**Options:**
- A: Auto-create immediately (fast, risk of duplicates)
- B: Flag for admin review (slower, cleaner data)
- C: Auto-create with confidence threshold (hybrid)

**Decision:** TBD

### Fuzzy Matching Aggressiveness
**Question:** How aggressive should fuzzy matching be?

**Options:**
- A: Very conservative (exact match only)
- B: Moderate (case-insensitive + partial)
- C: Aggressive (Levenshtein distance, synonyms)

**Decision:** TBD

### Multiple Cuisines Handling
**Question:** What if a restaurant legitimately has 6+ cuisines?

**Options:**
- A: Hard limit at 5, pick most relevant
- B: Allow unlimited, trust Anthropic
- C: Soft limit with admin review for >5

**Decision:** TBD

### Error Recovery Strategy
**Question:** If Anthropic succeeds but database fails, what to do?

**Options:**
- A: Store in `generated_content_pending` column and retry
- B: Re-run Anthropic (costs money again)
- C: Use database transactions to prevent partial updates

**Decision:** TBD

### Dry Run Mode
**Question:** Should we implement a "dry run" mode?

**Options:**
- A: Yes - show what would be created without committing
- B: No - just implement undo/rollback
- C: Yes for testing, remove for production

**Decision:** TBD

---

## Implementation Phases Timeline

### Phase 1: Basic Content ✅ (COMPLETE)
- **Duration:** Complete
- **Fields:** about
- **Status:** Tested and working

### Phase 2: Structured Fields
- **Duration:** 1-2 hours
- **Fields:** best_times_description, sentiment, FAQs, ratings
- **Dependencies:** JSON output parsing

### Phase 3: Popular Times
- **Duration:** 1-2 hours
- **Fields:** best_times_* arrays
- **Dependencies:** popularTimesHistogram analysis

### Phase 4: Operating Data
- **Duration:** 1-2 hours
- **Fields:** hours, social_media, accessibility, awards
- **Dependencies:** Data extraction logic

### Phase 5: Location & Transport
- **Duration:** 1 hour
- **Fields:** getting_there_* fields
- **Dependencies:** Address parsing

### Phase 6: Reference Mapping
- **Duration:** 3-4 hours
- **Fields:** cuisines, categories, features, meals, dishes
- **Dependencies:** Mapping functions, decisions on questions above

### Phase 7: Menu Processing
- **Duration:** 2 hours
- **Fields:** menu_items
- **Dependencies:** menu_data parsing

### Phase 8: Integration with UI
- **Duration:** 1-2 hours
- **Tasks:** Connect to /admin/add workflow, update stages

### Phase 9: Testing & Refinement
- **Duration:** 2-3 hours
- **Tasks:** Test all fields, validate data quality, fix issues

**Total Estimated Time:** 14-18 hours

---

## File Structure

```
src/app/api/restaurants/[id]/generate-content/
  route.ts              # Main API endpoint

src/lib/anthropic/
  prompts.ts            # Prompt templates
  validators.ts         # Output validation
  mappers.ts            # Reference table mapping functions

src/lib/utils/
  text-normalization.ts # Text normalization functions
  slug-generation.ts    # Slug generation
  fuzzy-matching.ts     # Fuzzy matching logic

docs/
  ANTHROPIC_CONTENT_GENERATION_SPEC.md  # This document
  ANALYSIS_CURRENT_STATE.md             # Current state analysis
```

---

## Version History

**v1.0 (2025-10-20)**
- Initial specification
- Phase 1 implementation complete (about field)
- Tested successfully with 74 Duke restaurant
- Established incremental approach
- Defined reference table mapping strategy
- Identified open questions for decision

---

## Related Documentation

- `/docs/REQUIREMENTS.md` - Overall system requirements
- `/docs/ANALYSIS_CURRENT_STATE.md` - Current implementation status
- `/docs/IMAGE_EXTRACTION.md` - Image processing system
- Anthropic API Docs: https://docs.anthropic.com/
