# Anthropic Content Generation - Technical Specification

**Version:** 1.0
**Date:** 2025-10-20
**Status:** In Development - Incremental Implementation

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

## Implementation Strategy: Incremental Field Addition

### Phase 1: Basic Content (CURRENT) ✅
**Status:** Implemented and tested

**Fields:**
- `about` - 200-300 word SEO description

**Prompt Strategy:**
- Simple, single-paragraph request
- Full apify_output + firecrawl_output as context
- Natural language instructions
- No JSON output required

**Test Results:**
- ✅ Successfully generated content for 74 Duke
- ✅ Natural, human-sounding language
- ✅ Dog-friendly features mentioned
- ✅ Specific dishes included
- ✅ No AI clichés
- ✅ 26,572 input tokens, 271 output tokens (~$0.07 per request)

### Phase 2: Structured Content Fields
**Status:** Planned

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
   - `categories`: max 5
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
