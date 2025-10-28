import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  defaultHeaders: {
    'anthropic-beta': 'context-1m-2025-08-07'
  }
})

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const restaurantId = params.id

    console.log(`[Generate Content] Starting for restaurant ID: ${restaurantId}`)

    // Fetch restaurant data with raw outputs
    const { data: restaurant, error: fetchError } = await supabase
      .from('restaurants')
      .select('id, name, apify_output, firecrawl_output, menu_data')
      .eq('id', restaurantId)
      .single()

    if (fetchError || !restaurant) {
      console.error('[Generate Content] Restaurant not found:', fetchError)
      return NextResponse.json(
        { error: 'Restaurant not found', details: fetchError?.message },
        { status: 404 }
      )
    }

    if (!restaurant.apify_output) {
      return NextResponse.json(
        { error: 'No Apify data available for this restaurant' },
        { status: 400 }
      )
    }

    console.log('[Generate Content] Restaurant data fetched:', restaurant.name)

    // Fetch live reference data
    console.log('[Generate Content] Fetching live reference data...')
    const { data: availableCuisines } = await supabase
      .from('restaurant_cuisines')
      .select('name')
      .order('name')

    const { data: availableCategories } = await supabase
      .from('restaurant_categories')
      .select('name')
      .order('name')

    const { data: availableNeighbourhoods } = await supabase
      .from('neighbourhoods')
      .select('name')
      .eq('city', 'London')
      .order('name')

    const { data: availableMichelinAwards } = await supabase
      .from('michelin_guide_awards')
      .select('name, stars')
      .order('sort_order')

    const cuisinesList = availableCuisines?.map(c => c.name).join(', ') || 'No cuisines available'
    const categoriesList = availableCategories?.map(c => c.name).join(', ') || 'No categories available'
    const neighbourhoodsList = availableNeighbourhoods?.map(n => n.name).join(', ') || 'No neighbourhoods available'
    const michelinAwardsList = availableMichelinAwards?.map(a => `${a.name} (${a.stars !== null ? a.stars + ' stars' : 'non-starred'})`).join(', ') || 'No Michelin awards available'

    console.log(`[Generate Content] Available cuisines: ${cuisinesList.substring(0, 100)}...`)
    console.log(`[Generate Content] Available categories: ${categoriesList.substring(0, 100)}...`)
    console.log(`[Generate Content] Available neighbourhoods: ${neighbourhoodsList.substring(0, 100)}...`)
    console.log(`[Generate Content] Available Michelin awards: ${michelinAwardsList}`)

    // Construct the prompt (same as before)
    const prompt = `You are analyzing restaurant data for a dog-friendly restaurant directory.

RESTAURANT: ${restaurant.name}

APIFY DATA (Google Places):
${JSON.stringify(restaurant.apify_output, null, 2)}

${restaurant.firecrawl_output ? `FIRECRAWL DATA (Review Sites & Web):
${JSON.stringify(restaurant.firecrawl_output, null, 2)}` : 'No Firecrawl data available.'}

${restaurant.menu_data ? `MENU DATA:
${JSON.stringify(restaurant.menu_data, null, 2)}` : 'No menu data available.'}

AVAILABLE REFERENCE DATA (Current Database State):

AVAILABLE CUISINES (prefer these names if applicable, suggest new only if truly unique):
${cuisinesList}

AVAILABLE CATEGORIES (prefer these names if applicable):
${categoriesList}

AVAILABLE NEIGHBOURHOODS (London - prefer these names if applicable):
${neighbourhoodsList}

AVAILABLE MICHELIN AWARDS (match exact names if applicable):
${michelinAwardsList}

TASK: Generate structured content for this restaurant.

OUTPUT FORMAT (JSON):
{
  "slug": "string (URL-friendly identifier)",
  "phone": "string (with international dialing code, e.g. +44 20 1234 5678) or null",
  "price_range": "string (one of: '£', '££', '£££', '££££')",
  "coordinates": {
    "latitude": number,
    "longitude": number
  },
  "hours": {
    "monday": {"open": "string (HH:MM)", "close": "string (HH:MM)"} or {"closed": true},
    "tuesday": {"open": "string (HH:MM)", "close": "string (HH:MM)"} or {"closed": true},
    "wednesday": {"open": "string (HH:MM)", "close": "string (HH:MM)"} or {"closed": true},
    "thursday": {"open": "string (HH:MM)", "close": "string (HH:MM)"} or {"closed": true},
    "friday": {"open": "string (HH:MM)", "close": "string (HH:MM)"} or {"closed": true},
    "saturday": {"open": "string (HH:MM)", "close": "string (HH:MM)"} or {"closed": true},
    "sunday": {"open": "string (HH:MM)", "close": "string (HH:MM)"} or {"closed": true}
  },
  "dress_code": "string or null",
  "reservations_url": "string (full URL with tracking) or null",
  "reservations_required": boolean,
  "best_times_buzzing": ["string", "string", ...],
  "best_times_relaxed": ["string", "string", ...],
  "best_times_with_dogs": ["string", "string", ...],
  "best_times_description": "string (2-4 sentences) or null",
  "getting_there_public": "string (2-3 sentences) or null",
  "getting_there_car": "string (2-3 sentences)",
  "nearest_dog_parks": "string (2-4 sentences)",
  "public_review_sentiment": "string (2-4 sentences) or null",
  "sentiment_score": number (0.0-10.0, 1 decimal place) or null",
  "restaurant_awards": [{"name": "string", "year": number, "rank": number, "level": "string"}],
  "michelin_guide_award": "string (EXACT award name from AVAILABLE MICHELIN AWARDS list) or null",
  "accessibility_features": ["string", "string", ...],
  "social_media_urls": {
    "instagram": "string (full URL) or null",
    "facebook": "string (full URL) or null",
    "tiktok": "string (full URL) or null",
    "twitter": "string (full URL) or null"
  },
  "about": "string (200-300 words)",
  "cuisines": ["string", "string"],
  "categories": ["string", "string", "string"],
  "features": ["string", "string", ...],
  "neighbourhood": "string",
  "faqs": [
    {
      "question": "string (include restaurant name for SEO)",
      "answer": "string (2-4 sentences, factual)"
    }
  ]
}

FIELD-SPECIFIC RULES:

=== COORDINATES ===
Extract the geographic coordinates from the Apify data.

Data Source:
- apify_output.location.lat (latitude)
- apify_output.location.lng (longitude)

Rules:
1. Extract latitude and longitude directly from apify_output.location
2. Return as numeric values (not strings)
3. Latitude should be between -90 and 90
4. Longitude should be between -180 and 180
5. Use the exact values from apify_output - do not round or modify

Example:
If apify_output.location = { "lat": 51.5412, "lng": -0.1434 }
Then output: { "latitude": 51.5412, "longitude": -0.1434 }

Output: Object with numeric latitude and longitude

=== HOURS ===
Extract and convert the restaurant's operating hours to 24-hour format.

Data Source:
- apify_output.openingHours (array of objects with day and hours)

Input Format (from Apify):
[
  {"day": "Monday", "hours": "12:00 PM - 11:00 PM"},
  {"day": "Tuesday", "hours": "12:00 PM - 11:00 PM"},
  ...
]

Output Format:
{
  "monday": {"open": "12:00", "close": "23:00"},
  "tuesday": {"open": "12:00", "close": "23:00"},
  "wednesday": {"open": "12:00", "close": "23:00"},
  "thursday": {"open": "12:00", "close": "23:00"},
  "friday": {"open": "12:00", "close": "23:00"},
  "saturday": {"open": "10:00", "close": "23:00"},
  "sunday": {"closed": true}
}

Conversion Rules:
1. Convert day names to lowercase (Monday → monday)
2. Convert 12-hour format to 24-hour format:
   - 12:00 AM → 00:00
   - 1:00 AM → 01:00
   - 12:00 PM → 12:00
   - 1:00 PM → 13:00
   - 11:00 PM → 23:00
3. Parse "12:00 PM - 11:00 PM" format to extract open and close times
4. If a day is not in the openingHours array, mark as {"closed": true}
5. If hours say "Closed" or "Closed All Day", use {"closed": true}
6. If hours say "Open 24 hours", use {"open": "00:00", "close": "23:59"}
7. Handle special cases like "12:00 AM - 12:00 AM" (24 hours) → {"open": "00:00", "close": "23:59"}

Edge Cases:
- If no openingHours data available, return null for the entire hours object
- If day is missing from array, assume closed
- Ensure all 7 days are included in output (monday through sunday)

Output: JSONB object with all 7 days, each with either {open, close} or {closed: true}

=== DRESS CODE ===
Extract or infer the restaurant's dress code policy.

Data Sources (in priority order):
1. firecrawl_output - Look for explicit dress code mentions in scraped website content
2. apify_output.description or reviews - Look for dress code mentions
3. Restaurant category/price level - Infer based on establishment type

Common Dress Code Values:
- "Casual" - No restrictions, everyday wear
- "Smart Casual" - Nice jeans, collared shirts, no sportswear
- "Smart" - Dress shirt, trousers, smart shoes required
- "Formal" - Jacket required, elegant attire
- "Business Casual" - Professional but relaxed
- null - No dress code specified (default for most casual places)

Detection Rules:
1. EXPLICIT: If dress code is explicitly mentioned in firecrawl_output or reviews, use that exact wording
2. FINE DINING: If price_range is "££££" or "£££" and category is "Fine Dining", likely "Smart Casual" or "Smart"
3. CASUAL/PUBS/CAFES: If category is "Pub", "Cafe", "Casual Dining", or price is "£" or "££", use null (no dress code)
4. MICHELIN-STARRED: If Michelin stars or high-end awards mentioned, likely "Smart" or "Formal"
5. DEFAULT: If uncertain or no information available, return null

Examples:
- Fine dining restaurant, ££££ → "Smart Casual"
- Traditional pub, ££ → null
- Michelin-starred, explicit mention "jacket required" → "Formal"
- Gastropub, £££ → null
- Website says "please dress smart casual" → "Smart Casual"

Output: Single string or null

=== RESERVATIONS URL ===
Extract the restaurant's online booking/reservation URL and add tracking parameter.

Data Sources (in priority order):
1. firecrawl_output - Look for booking links in scraped website content
2. apify_output.reservationLinks or similar fields
3. Look for links containing booking platform domains or reservation keywords

Common UK Booking Platforms:
- OpenTable: opentable.co.uk, opentable.com
- Resy: resy.com
- TheFork: thefork.co.uk, thefork.com
- SevenRooms: sevenrooms.com
- Bookatable: bookatable.co.uk
- Quandoo: quandoo.co.uk
- Tock: exploretock.com
- Restaurant's own booking system (often /book, /reservations, /booking in URL)

Detection Rules:
1. EXPLICIT BOOKING PLATFORMS: If a link to OpenTable, Resy, TheFork, etc. is found, use that URL
2. RESTAURANT WEBSITE BOOKING: Look for URLs containing "/book", "/reservations", "/booking", "/reserve"
3. EMBEDDED WIDGETS: If firecrawl mentions booking widgets or forms, look for associated URLs
4. PREFER DIRECT LINKS: Prefer direct booking URLs over general contact pages
5. VALIDATION: Ensure the URL is a full, valid URL (starts with http:// or https://)
6. DEFAULT: If no booking link found, return null

Tracking Parameter Rules:
IMPORTANT: Add tracking parameter to ALL reservation URLs for attribution:
- If URL already has query parameters (contains "?"), append "&source=dog-friendly-finder"
- If URL has no query parameters, append "?source=dog-friendly-finder"
- This allows booking platforms to track referral traffic

Examples:
- Found: "https://www.opentable.co.uk/restaurant/profile/123456"
  Output: "https://www.opentable.co.uk/restaurant/profile/123456?source=dog-friendly-finder"

- Found: "https://resy.com/cities/ldn/venue?seats=2"
  Output: "https://resy.com/cities/ldn/venue?seats=2&source=dog-friendly-finder"

- Found: "https://restaurantwebsite.com/book"
  Output: "https://restaurantwebsite.com/book?source=dog-friendly-finder"

- No booking system found → null
- Contact page only (no booking) → null

Output: Full URL string with tracking parameter or null

=== RESERVATIONS REQUIRED ===
Determine whether reservations/booking is required to dine at this restaurant.

Data Sources (in priority order):
1. apify_output.additionalInfo.Planning - Look for "Accepts reservations" or "Reservations required"
2. firecrawl_output - Look for explicit statements about booking requirements
3. Reviews mentioning booking policies
4. Infer from restaurant type and price level

Detection Rules:
1. EXPLICIT REQUIRED: If data explicitly states "reservations required", "booking essential", "reservation only", "by appointment only" → true
2. FINE DINING: If price_range is "££££" or category is "Fine Dining" → likely true (unless stated otherwise)
3. MICHELIN-STARRED: If Michelin stars mentioned → true
4. ACCEPTS RESERVATIONS: If data only says "accepts reservations" or "recommended" (not "required") → false
5. CASUAL ESTABLISHMENTS: If category is "Pub", "Cafe", "Casual Dining" → false
6. WALK-INS WELCOME: If mentions "walk-ins welcome", "no booking needed" → false
7. DEFAULT: If uncertain → false (default value)

Key Phrases for TRUE (required):
- "Reservations required"
- "Booking essential"
- "Reservation only"
- "By appointment only"
- "Pre-booking necessary"
- "Must book in advance"

Key Phrases for FALSE (not required):
- "Walk-ins welcome"
- "No reservation needed"
- "Accepts reservations" (implies optional, not required)
- "Reservations recommended" (optional)
- "First come, first served"

Examples:
- Fine dining, website says "reservations required" → true
- Michelin-starred restaurant → true
- Casual pub, "walk-ins welcome" → false
- Gastropub, "accepts reservations" → false (optional, not required)
- No information, casual category → false (default)

Output: Boolean (true or false)

=== BEST TIMES BUZZING ===
Identify the busiest times at this restaurant based on Google Maps Popular Times data.

Data Source:
- apify_output.popularTimesHistogram (day abbreviations with hourly occupancy percentages)

Data Structure Example:
{
  "Mo": [{"hour": 6, "occupancyPercent": 0}, {"hour": 12, "occupancyPercent": 45}],
  "Tu": [{"hour": 6, "occupancyPercent": 0}],
  "Fr": [{"hour": 18, "occupancyPercent": 85}, {"hour": 19, "occupancyPercent": 92}],
  "Sa": [{"hour": 12, "occupancyPercent": 88}, {"hour": 19, "occupancyPercent": 95}],
  "Su": [{"hour": 12, "occupancyPercent": 90}]
}

Analysis Rules:
1. Analyze all days and hours to identify peak occupancy periods
2. Consider occupancyPercent >= 75% as "buzzing" (busy)
3. Group consecutive busy hours into time periods
4. Focus on the TOP 2-4 busiest periods across the week

Time Period Naming Conventions:
- Morning: 6:00-11:59 (e.g., "Saturday mornings")
- Lunch: 12:00-14:59 (e.g., "Sunday lunch")
- Afternoon: 15:00-17:59 (e.g., "Friday afternoons")
- Evening: 18:00-21:59 (e.g., "Friday evenings")
- Late night: 22:00-23:59 (e.g., "Saturday late night")
- Brunch: 10:00-14:00 on weekends only (e.g., "Sunday brunch")

Day Grouping:
- If same time period is busy on multiple consecutive days, group them
  Example: "Friday and Saturday evenings" or "Weekday lunches"
- Weekdays: Monday-Friday
- Weekends: Saturday-Sunday

Output Format:
- Use full day names (not abbreviations)
- Be specific about time of day
- Order by busyness (busiest first)
- Maximum 4 entries
- Return empty array if no popularTimesHistogram data available

Examples:
- High occupancy Fri 18-21, Sat 19-22 → ["Friday and Saturday evenings"]
- High occupancy Sat 12-14, Sun 12-14 → ["Weekend lunch", "Sunday brunch"]
- High occupancy Fri 19-21 (95%), Sat 20-22 (90%), Sun 12-13 (80%) → ["Friday evenings", "Saturday evenings", "Sunday lunch"]
- No data → []

Output: Array of strings (text[])

=== BEST TIMES RELAXED ===
Identify the quietest times at this restaurant based on Google Maps Popular Times data.

Data Source:
- apify_output.popularTimesHistogram (day abbreviations with hourly occupancy percentages)

Data Structure Example:
{
  "Mo": [{"hour": 6, "occupancyPercent": 0}, {"hour": 12, "occupancyPercent": 45}],
  "Tu": [{"hour": 6, "occupancyPercent": 0}, {"hour": 15, "occupancyPercent": 20}],
  "We": [{"hour": 14, "occupancyPercent": 25}],
  "Fr": [{"hour": 18, "occupancyPercent": 85}, {"hour": 19, "occupancyPercent": 92}],
  "Su": [{"hour": 12, "occupancyPercent": 90}]
}

Analysis Rules:
1. Analyze all days and hours to identify low occupancy periods
2. Consider occupancyPercent <= 35% as "relaxed" (quiet)
3. Only include times when the restaurant is actually OPEN (check against hours field)
4. Group consecutive quiet hours into time periods
5. Focus on the TOP 2-4 quietest periods across the week

Time Period Naming Conventions:
- Morning: 6:00-11:59 (e.g., "Tuesday mornings")
- Lunch: 12:00-14:59 (e.g., "Wednesday lunch")
- Afternoon: 15:00-17:59 (e.g., "Weekday afternoons")
- Evening: 18:00-21:59 (e.g., "Monday evenings")
- Late night: 22:00-23:59 (e.g., "Weeknight late")
- Early opening: First 1-2 hours after opening

Day Grouping:
- If same time period is quiet on multiple consecutive days, group them
  Example: "Monday and Tuesday evenings" or "Weekday mornings"
- Weekdays: Monday-Friday
- Weekends: Saturday-Sunday

Output Format:
- Use full day names (not abbreviations)
- Be specific about time of day
- Order by quietness (quietest first)
- Maximum 4 entries
- Return empty array if no popularTimesHistogram data available

Examples:
- Low occupancy Mon 15-17, Tue 15-17, Wed 15-17 → ["Weekday afternoons"]
- Low occupancy Mon 18-20, Tue 18-20 → ["Monday and Tuesday evenings"]
- Low occupancy Tue 12-13 (15%), Thu 15-16 (20%), Mon 19-20 (25%) → ["Tuesday lunch", "Thursday afternoon", "Monday evenings"]
- No data → []

Output: Array of strings (text[])

=== BEST TIMES WITH DOGS ===
Recommend optimal times for dog owners to visit based on Google Maps Popular Times data.

Data Source:
- apify_output.popularTimesHistogram (day abbreviations with hourly occupancy percentages)

Rationale:
Dog owners need a balance:
- NOT too busy (easier to navigate with dog, more space, staff less stressed)
- NOT too quiet (restaurant fully operational, good atmosphere, not awkward being only customer)
- IDEAL: Moderate occupancy (40-65%) - enough buzz but not overwhelming

Analysis Rules:
1. Analyze all days and hours to identify moderate occupancy periods
2. Consider occupancyPercent between 40-65% as "ideal for dogs"
3. Only include times when the restaurant is actually OPEN (check against hours field)
4. Prefer outdoor seating times if available (check features for outdoor seating)
5. Group consecutive moderate hours into time periods
6. Focus on the TOP 2-4 best periods for dog owners across the week

Time Period Naming Conventions:
- Morning: 6:00-11:59 (e.g., "Saturday mornings")
- Lunch: 12:00-14:59 (e.g., "Weekday lunch")
- Afternoon: 15:00-17:59 (e.g., "Weekday afternoons")
- Evening: 18:00-21:59 (e.g., "Early Friday evenings")
- Late night: 22:00-23:59 (e.g., "Weeknight late")
- Brunch: 10:00-14:00 on weekends only

Day Grouping:
- If same time period has moderate occupancy on multiple days, group them
  Example: "Weekday afternoons" or "Weekend mornings"
- Weekdays: Monday-Friday
- Weekends: Saturday-Sunday

Special Considerations:
- Prefer mornings and early afternoons (typically better for dog owners)
- If outdoor seating available, mention it (e.g., "Weekday afternoons on the terrace")
- Avoid peak meal times if they're very busy (>75%)

Output Format:
- Use full day names (not abbreviations)
- Be specific about time of day
- Order by dog-friendliness (best first)
- Maximum 4 entries
- Return empty array if no popularTimesHistogram data available

Examples:
- Moderate occupancy Sat 10-12 (50%), Sun 10-12 (48%) → ["Weekend mornings"]
- Moderate occupancy Mon-Fri 15-17 (45%) → ["Weekday afternoons"]
- Moderate occupancy Tue 12-13 (55%), Sat 10-11 (50%), Mon 15-16 (45%) → ["Tuesday lunch", "Saturday mornings", "Monday afternoons"]
- Restaurant has outdoor seating + moderate Wed 14-16 → ["Wednesday afternoons on the terrace"]
- No data → []

Output: Array of strings (text[])

=== BEST TIMES DESCRIPTION ===
Write a natural language guide about the best times to visit this restaurant, synthesizing insights from Popular Times data.

Data Sources:
- best_times_buzzing (array you just generated)
- best_times_relaxed (array you just generated)
- best_times_with_dogs (array you just generated)
- apify_output.popularTimesHistogram (for additional context)

Writing Guidelines:
1. Write 2-4 sentences in a conversational, helpful tone
2. Structure: Start with when it's busiest, then quietest, then best for dogs
3. Use natural British English phrasing
4. Be specific and actionable
5. Connect the information logically with transitions

Content to Include:
- BUSIEST: Mention the busiest times (from best_times_buzzing)
- QUIETEST: Mention the quietest times (from best_times_relaxed)
- BEST FOR DOGS: Recommend optimal times for dog owners (from best_times_with_dogs)
- CONTEXT: Add any helpful context (e.g., "book ahead for weekend brunch")

Tone and Style:
- Informative but friendly
- Avoid AI clichés and generic phrases
- Be concise and practical
- Use "you" and "your dog" to address dog owners directly

Template Structure (vary the phrasing):
"[Restaurant name] gets busiest [buzzing times], so expect a lively atmosphere then. For a more relaxed experience, visit [relaxed times] when it's quieter. Dog owners will find [with dogs times] ideal - [brief reason why]."

Examples:

Example 1:
best_times_buzzing: ["Friday and Saturday evenings", "Sunday lunch"]
best_times_relaxed: ["Weekday afternoons", "Monday evenings"]
best_times_with_dogs: ["Weekend mornings", "Weekday lunch"]
Output: "The pub is busiest on Friday and Saturday evenings and during Sunday lunch, creating a vibrant atmosphere. For a more peaceful visit, weekday afternoons and Monday evenings are your best bet. Dog owners should aim for weekend mornings or weekday lunch when there's a good balance of activity without the crowds."

Example 2:
best_times_buzzing: ["Saturday brunch"]
best_times_relaxed: ["Tuesday and Wednesday evenings"]
best_times_with_dogs: ["Weekday mornings"]
Output: "Saturday brunch draws the biggest crowds here, so booking ahead is recommended. Tuesday and Wednesday evenings are noticeably quieter if you prefer a more intimate setting. For visits with your dog, weekday mornings offer the perfect balance - enough buzz to feel welcoming without being overwhelming."

Example 3:
best_times_buzzing: []
best_times_relaxed: []
best_times_with_dogs: []
Output: null (if no Popular Times data available)

Edge Cases:
- If all three arrays are empty → return null
- If only one or two arrays have data, work with what's available
- Adapt the sentence structure based on available information

Output: Single text string (2-4 sentences) or null

=== GETTING THERE PUBLIC ===
Provide practical public transport directions to this restaurant using train/Underground only.

Data Sources:
- apify_output.address (full address with neighbourhood)
- coordinates.latitude and coordinates.longitude
- General knowledge of London transport network (Tube, Overground, National Rail)

Requirements:
- ONLY include train/Underground/Overground (NO buses)
- Prioritise stations with minimal walking distance
- Provide up to 2 options if multiple convenient stations exist
- Include walking time estimate from each station
- Be specific about which Tube/train lines serve each station

Writing Guidelines:
1. Write 2-3 clear, actionable sentences
2. Use British terminology: "Tube", "Underground", "Overground", "National Rail"
3. Specify walking distance/time: "5-minute walk", "10-minute walk"
4. Mention Tube/rail lines in the format: "Northern line", "Circle and District lines"
5. Use conversational, helpful tone

Format Structure:
- Single station: "The nearest station is [Station Name] ([Lines]), about [X minutes] walk away."
- Two stations: "The nearest stations are [Station 1] ([Lines], [X min walk]) and [Station 2] ([Lines], [Y min walk])."

Decision Logic:
1. Identify the nearest Tube/train station(s) based on address and coordinates
2. Check if there are 2 stations within reasonable walking distance (typically < 15 minutes)
3. If yes, mention both options
4. If only one convenient option, mention just that one
5. Always specify the Tube/rail lines that serve each station

Examples:

Example 1 - Single station:
Address: "14 Blenheim Crescent, Notting Hill, London W11 1NN"
Output: "The nearest station is Ladbroke Grove on the Circle and Hammersmith & City lines, about a 5-minute walk away."

Example 2 - Two stations:
Address: "Upper Street, Islington, London N1"
Output: "The nearest stations are Angel (Northern line, 8-minute walk) and Highbury & Islington (Victoria line and Overground, 10-minute walk)."

Example 3 - Station with multiple lines:
Address: "King's Road, Chelsea, London SW3"
Output: "The nearest station is Sloane Square on the Circle and District lines, around a 10-minute walk from the restaurant."

Example 4 - National Rail option:
Address: "Spaniards Road, Hampstead, London NW3"
Output: "The nearest station is Hampstead Heath Overground, approximately a 15-minute walk through Hampstead Heath."

UK Terminology:
- "Tube" or "Underground" (not "subway" or "metro")
- "Overground" (not "above-ground train")
- "National Rail" for mainline train services
- Walking distances: "5-minute walk", "10-minute walk" (not "5 mins" or "10'")

Output: Single text string (2-3 sentences) or null if not in a location with train/Tube access

=== GETTING THERE CAR ===
Provide practical driving directions and parking information for this restaurant.

Data Sources:
- apify_output.address (extract postcode)
- apify_output.additionalInfo.Amenities - Look for "Parking available"
- firecrawl_output - Look for parking mentions in scraped content
- General knowledge of area parking (if available)

Requirements:
- Always include the postcode for GPS/maps/Waze
- Mention parking availability if known
- Specify type of parking (car park, on-street, off-street)
- Include parking restrictions/charges if mentioned

Writing Guidelines:
1. Write 2-3 clear, practical sentences
2. Start with postcode for navigation
3. Follow with parking information
4. Be specific about parking locations if known
5. Use conversational, helpful tone

Format Structure:
"For sat nav, use postcode [POSTCODE]. [Parking information]."

Parking Information to Include:
- Car parks: Name and approximate location if known
- On-street parking: Restrictions (pay & display, permit zones, time limits)
- Off-street parking: Mention if restaurant has own car park or nearby options
- Free parking: Mention if available
- Parking charges: Include if information available
- Walking distance from parking to restaurant if relevant

Decision Logic:
1. Extract postcode from address (always required)
2. Check apify_output.additionalInfo.Amenities for "Parking available"
3. Check firecrawl_output for parking mentions
4. If parking info available, include specifics
5. If no parking info, provide general guidance based on area knowledge

Examples:

Example 1 - Car park available:
Address: "King's Road, Chelsea, London SW3 4UD"
Parking data: Mention of NCP car park nearby
Output: "For sat nav, use postcode SW3 4UD. There's an NCP car park on Milner Street, about a 5-minute walk away, and limited metered parking on King's Road itself."

Example 2 - On-street parking:
Address: "Upper Street, Islington, London N1 2TX"
Output: "For sat nav, use postcode N1 2TX. Parking in Islington is mainly pay & display on surrounding streets, with restrictions typically Mon-Sat 8:30am-6:30pm."

Example 3 - Own parking:
Address: "Hampstead Heath area, London NW3 7JJ"
Parking data: "Parking available" in amenities
Output: "For sat nav, use postcode NW3 7JJ. The restaurant has its own small car park, and there's also free on-street parking nearby after 6:30pm and on Sundays."

Example 4 - Limited parking area:
Address: "Soho, London W1D 5BU"
Output: "For sat nav, use postcode W1D 5BU. Parking in central Soho is very limited and expensive, so we'd recommend public transport or nearby NCP car parks on Poland Street or Lexington Street."

Example 5 - No specific parking info:
Address: "Richmond, London TW9 1TW"
Output: "For sat nav, use postcode TW9 1TW. There are several public car parks in Richmond town centre within a short walk of the restaurant."

UK Terminology:
- "Car park" (not "parking lot")
- "Postcode" (not "zip code")
- "Sat nav" or "GPS" (both acceptable)
- "Pay & display" for metered parking
- "Permit holders only" for resident parking zones

Output: Single text string (2-3 sentences)

=== NEAREST DOG PARKS ===
Identify the 2-3 closest parks or excellent dog walking areas near this restaurant.

Data Sources:
- coordinates.latitude and coordinates.longitude
- neighbourhood (for local knowledge)
- General knowledge of London parks and green spaces

Requirements:
- Provide 2-3 options, prioritized by proximity (closest first)
- Include walking distance for nearby parks (<20 minute walk)
- For parks >20 minute walk away, include driving time or public transport option
- Mention park size/type if relevant (e.g., "large heath", "small square garden")
- Be specific about park names

Writing Guidelines:
1. Write 2-4 sentences covering 2-3 parks/green spaces
2. Use British terminology
3. Be practical and specific
4. Consider what makes each park good for dogs

Distance Guidelines:
- Walking distance: Use minutes for <20 min walk (e.g., "10-minute walk")
- Driving distance: Use minutes for >20 min walk (e.g., "5-minute drive")
- Miles: Include if helpful for context (e.g., "1.2 miles away")
- Public transport: Mention if park is >20 min walk (e.g., "15 min on Tube to...")

Park Selection Criteria:
1. Proximity (prioritize closest)
2. Size (larger parks generally better for dogs)
3. Notable features (off-lead areas, ponds, trails)
4. Dog-friendliness (known dog walking spots)

Format Structure:
"The nearest green space is [Park Name], [distance]. [Brief description]. [Park 2] is [distance] and [description]. For a longer walk, [Park 3] is [distance/transport] away."

Examples:

Example 1 - Multiple nearby parks:
Location: Notting Hill
Output: "The nearest green space is Kensington Gardens, just a 5-minute walk away, with plenty of off-lead areas. Holland Park is also within 10 minutes on foot and offers woodland paths and a Japanese garden. For a bigger space, Hyde Park is a 15-minute walk or short bus ride away."

Example 2 - One close, others further:
Location: Islington
Output: "Highbury Fields is the nearest park, about an 8-minute walk, popular with local dog owners and great for off-lead exercise. For more space, Hampstead Heath is a 10-minute drive or 20 minutes on the Tube (Northern line to Hampstead), offering 800 acres of parkland and ponds."

Example 3 - Near large heath:
Location: Hampstead
Output: "Hampstead Heath is right on the doorstep, less than a 5-minute walk, with 800 acres of ancient heath land, woodland, and swimming ponds. Parliament Hill offers panoramic London views and is accessed from the same heath. For a different walk, Primrose Hill is a 15-minute walk away with open grassland and excellent views."

Example 4 - Central London location:
Location: Covent Garden
Output: "The nearest green space is Lincoln's Inn Fields, about a 10-minute walk, London's largest public square with open lawns. St James's Park is a 15-minute walk or short Tube ride away, with beautiful landscaped gardens around the lake. For more space, Regent's Park is 20 minutes away on the Tube (Piccadilly line) with large open areas and Primrose Hill adjacent."

UK Terminology:
- "Green space" or "park" (both fine)
- "Off-lead" (not "off-leash")
- Minutes for walking/driving (e.g., "10-minute walk")
- Specific Tube lines when mentioning public transport

Output: Single text string (2-4 sentences)

=== PUBLIC REVIEW SENTIMENT ===
Write a brief summary of what customers appreciate about this restaurant based on review data.

Data Source:
- apify_output.reviews (array of review objects with text, rating, authorName, publishedAtDate)

Requirements:
- Analyze review text to identify common positive themes
- PRIORITIZE mentions of dogs or dog-friendliness
- Focus on what people LIKE (positive sentiment)
- Be specific about what reviewers praise
- Include variety of aspects (food, service, atmosphere, dog-friendliness)

Writing Guidelines:
1. Write 2-4 sentences in a conversational tone
2. Start with most common/important praise
3. Mention dog-related reviews if present (high priority)
4. Use specific language from reviews where possible
5. Avoid generic AI phrases like "patrons rave" or "guests love"

Content to Include (in priority order):
1. DOG-FRIENDLINESS: If reviews mention dogs, lead with this or mention prominently
2. FOOD QUALITY: Common praise about dishes, flavours, presentation
3. SERVICE: Staff friendliness, attentiveness, knowledge
4. ATMOSPHERE: Ambiance, decor, vibe, setting
5. VALUE: Good value for money, portion sizes
6. SPECIFIC HIGHLIGHTS: Particular dishes, features, or experiences mentioned repeatedly

Analysis Approach:
- Scan all review texts for common themes
- Look for keywords: "dog", "dogs", "pup", "puppy", "four-legged", "furry friend", "pet"
- Identify frequently mentioned positive aspects
- Note specific dishes or features praised
- Pay attention to reviews with high ratings (4-5 stars)

Tone and Style:
- Informative and genuine
- Use natural language
- Reflect actual customer opinions
- Be specific, not vague
- British English phrasing

Examples:

Example 1 - With dog mentions:
Reviews mention: dogs welcome, lovely beer garden, great Sunday roast, friendly staff, dogs get water bowls
Output: "Reviewers consistently praise the warm welcome extended to dogs, with many mentioning water bowls and the spacious beer garden as perfect for four-legged friends. The Sunday roast gets regular mentions for quality and value, whilst the friendly staff and relaxed atmosphere make it a favourite with locals."

Example 2 - Food-focused:
Reviews mention: excellent food, creative menu, great cocktails, attentive service
Output: "Customers rave about the creative menu and excellent food quality, with particular praise for the seasonal dishes and presentation. The cocktail selection receives frequent compliments, and reviewers appreciate the attentive but not overbearing service."

Example 3 - Atmosphere and location:
Reviews mention: beautiful setting, cosy interior, great location, outdoor seating, dogs allowed
Output: "The beautiful setting and cosy interior are frequently highlighted, with many reviewers loving the charming Victorian details. Dog owners appreciate that well-behaved dogs are welcome, particularly in the outdoor seating area, and the location makes it ideal for a post-Heath walk meal."

Example 4 - Limited reviews:
Only 2-3 reviews available
Output: "Early reviews highlight the quality of the ingredients and friendly service, with customers appreciating the neighbourhood atmosphere."

Example 5 - No reviews:
No reviews in data
Output: null

Edge Cases:
- If no reviews available → return null
- If very few reviews (1-3) → keep brief, acknowledge limited data
- If reviews are mixed → focus on positive aspects only
- If reviews mention dogs → MUST include this prominently

Phrases to Avoid:
- "Patrons rave"
- "Guests love"
- "Culinary journey"
- "Nestled in"
- "Hidden gem"
- Generic superlatives without specifics

Output: Single text string (2-4 sentences) or null if no reviews available

=== SENTIMENT SCORE ===
Calculate an overall sentiment score (0-10, 1 decimal place) based on review data.

Data Source:
- apify_output.reviews (array of review objects with text, rating, authorName, publishedAtDate)

Requirements:
- Score range: 0.0 to 10.0 (1 decimal place)
- Based on both review ratings AND sentiment analysis
- Consider quantity and quality of reviews
- Return null if no reviews available

Calculation Method:
1. START with average star rating (convert to 0-10 scale)
   - 5 stars = 10.0
   - 4 stars = 8.0
   - 3 stars = 6.0
   - 2 stars = 4.0
   - 1 star = 2.0

2. ADJUST based on sentiment analysis:
   - Positive keywords/themes → +0.1 to +0.5
   - Dog-friendly mentions → +0.2 to +0.3
   - Specific praise (food, service, atmosphere) → +0.1 each
   - Negative aspects mentioned → -0.1 to -0.5

3. CONSIDER review quantity:
   - Very few reviews (1-3) → reduce confidence, cap at 8.5
   - Good number of reviews (10+) → full confidence in score
   - Many reviews (50+) → more weight to average rating

4. FINAL SCORE:
   - Round to 1 decimal place
   - Minimum: 0.0
   - Maximum: 10.0

Scoring Guidelines:
- 9.0-10.0: Outstanding (consistently excellent reviews, glowing praise)
- 8.0-8.9: Excellent (strong positive reviews, few complaints)
- 7.0-7.9: Very Good (mostly positive, some minor issues)
- 6.0-6.9: Good (positive overall, mixed reviews)
- 5.0-5.9: Average (balanced mix of positive and negative)
- 4.0-4.9: Below Average (more negative than positive)
- 3.0-3.9: Poor (mostly negative reviews)
- 0.0-2.9: Very Poor (overwhelmingly negative)

Examples:

Example 1 - High rating, positive reviews:
Average rating: 4.6 stars (9.2 on 10-point scale)
Review sentiment: Very positive, mentions dogs, great food, friendly staff
Calculation: 9.2 + 0.2 (dogs) + 0.2 (food) + 0.1 (service) = 9.7
Output: 9.7

Example 2 - Good rating, mixed sentiment:
Average rating: 4.2 stars (8.4 on 10-point scale)
Review sentiment: Positive food reviews, some service complaints
Calculation: 8.4 + 0.2 (food) - 0.2 (service issues) = 8.4
Output: 8.4

Example 3 - Moderate rating, few reviews:
Average rating: 3.8 stars (7.6 on 10-point scale)
Only 2 reviews available
Calculation: 7.6, capped at 8.5 due to limited data
Output: 7.6

Example 4 - High rating, many positive mentions:
Average rating: 4.8 stars (9.6 on 10-point scale)
100+ reviews, consistently mentions dogs welcome, excellent food, great atmosphere
Calculation: 9.6 + 0.3 (dogs) + 0.1 (food) = 10.0 (capped at 10.0)
Output: 10.0

Example 5 - No reviews:
No reviews in data
Output: null

Edge Cases:
- No reviews → return null
- Only 1-2 reviews → be conservative, don't exceed 8.5
- All 5-star reviews but generic text → slightly lower adjustment
- Lower star rating but very detailed positive reviews → add modest boost
- Very old reviews only → no penalty, use data available

Output: Numeric value 0.0-10.0 with 1 decimal place, or null if no reviews

=== RESTAURANT AWARDS ===
Extract any restaurant awards or accolades (excluding Michelin - that's handled separately).

Data Sources:
- apify_output.description or other fields mentioning awards
- firecrawl_output - scraped content from website, review sites
- Look for award mentions in reviews

Requirements:
- EXCLUDE Michelin stars/awards (separate field)
- Include recognised UK restaurant awards
- Include international awards if mentioned
- Return empty array if no awards found

Award Object Structure:
{
  "name": "string (award name)",
  "year": number (year awarded - if known),
  "rank": number (if award has ranking - optional),
  "level": "string (if award has levels - optional)"
}

Common UK Restaurant Awards to Look For:
- AA Rosettes (levels: 1-5 Rosettes)
- Good Food Guide ratings
- Harden's ratings
- Time Out Love London Awards
- Restaurant & Bar Design Awards
- National Restaurant Awards
- Cateys Awards
- Sustainable Restaurant Awards
- World's 50 Best Restaurants
- OFM Awards (Observer Food Monthly)
- BBC Good Food Awards

Detection Rules:
1. Look for award names in description, website content, reviews
2. Extract year if mentioned (e.g., "2024 winner")
3. Extract rank if numbered (e.g., "#23 in World's 50 Best")
4. Extract level for tiered awards (e.g., "3 AA Rosettes")
5. Normalize award names (consistent capitalization)

Award Name Formatting:
- Use official award names
- Capitalize properly: "AA Rosette" not "aa rosette"
- Include full name: "Good Food Guide" not "GFG"

Examples:

Example 1 - AA Rosettes:
Data mentions: "Awarded 3 AA Rosettes in 2024"
Output: [{"name": "AA Rosette", "level": "3 Rosettes", "year": 2024}]

Example 2 - Ranked award:
Data mentions: "Ranked #45 in World's 50 Best Restaurants 2023"
Output: [{"name": "World's 50 Best Restaurants", "year": 2023, "rank": 45}]

Example 3 - Multiple awards:
Data mentions: "Winner Time Out Love London Awards 2024" and "2 AA Rosettes"
Output: [
  {"name": "Time Out Love London Awards", "year": 2024},
  {"name": "AA Rosette", "level": "2 Rosettes"}
]

Example 4 - Award without year:
Data mentions: "Good Food Guide recommended"
Output: [{"name": "Good Food Guide"}]

Example 5 - No awards:
No award mentions found
Output: []

Edge Cases:
- Michelin mentioned → SKIP (separate field)
- "Award-winning" without specific award → SKIP (too vague)
- Very old awards (>10 years) → include but note year
- Unclear if legitimate award → be conservative, skip if uncertain
- Local community awards → include if specific name given

Output: Array of award objects (can be empty array [])

=== MICHELIN GUIDE AWARD ===
Identify if the restaurant has a Michelin Guide award.

Data Sources (in priority order):
1. firecrawl_output - Look for Michelin mentions in scraped website content
2. apify_output.description or reviews - Look for Michelin references
3. restaurant_awards array - Check for Michelin mentions

Requirements:
- Return the EXACT award name from AVAILABLE MICHELIN AWARDS list
- Match award names case-insensitively but return the EXACT official name
- STARRED awards (1-3 stars): Return award name like "One Michelin Star"
- NON-STARRED awards: Return award name like "Bib Gourmand", "Michelin Green Star", "Michelin Plate", "Michelin Selected"
- NO Michelin recognition: Return null

Award Hierarchy (from AVAILABLE MICHELIN AWARDS):

STARRED awards (1-3 stars):
- "Three Michelin Stars"
- "Two Michelin Stars"
- "One Michelin Star"

NON-STARRED awards (recognition without stars):
- "Bib Gourmand"
- "Michelin Green Star"
- "Michelin Plate"
- "Michelin Selected"

Detection Rules:
1. EXACT MATCH: Look for exact phrases from AVAILABLE MICHELIN AWARDS list
2. COMMON PHRASINGS:
   - "3 Michelin stars" → "Three Michelin Stars"
   - "2 Michelin stars" → "Two Michelin Stars"
   - "1 Michelin star" → "One Michelin Star"
   - "Bib Gourmand" → "Bib Gourmand"
   - "Michelin Guide" (general mention) → check for specific award type
   - "Green Star" → "Michelin Green Star"
   - "Michelin Plate" → "Michelin Plate"

3. AWARD NAME MAPPING: Convert detected phrases to EXACT names from AVAILABLE MICHELIN AWARDS
4. DEFAULT: If no Michelin recognition detected → null

Examples:

Example 1 - Three Michelin Stars:
Data mentions: "Awarded three Michelin stars in 2024"
Output: "Three Michelin Stars"

Example 2 - One Michelin Star:
Data mentions: "One star Michelin restaurant"
Output: "One Michelin Star"

Example 3 - Bib Gourmand (non-starred):
Data mentions: "Bib Gourmand restaurant"
Output: "Bib Gourmand"

Example 4 - Michelin Green Star (non-starred):
Data mentions: "Awarded Michelin Green Star for sustainability"
Output: "Michelin Green Star"

Example 5 - Michelin Plate (non-starred):
Data mentions: "Featured in Michelin Guide with a Plate award"
Output: "Michelin Plate"

Example 6 - No Michelin recognition:
No Michelin mentions found
Output: null

Edge Cases:
- "Michelin recommended" (vague) → Check if specific award mentioned, otherwise null
- "Formerly one star" (past tense) → null (only current awards)
- Multiple awards mentioned → Use the HIGHEST (stars take precedence)
- "In the Michelin Guide" without specifics → null (too vague)
- Award name spelling variations → Match to official AVAILABLE MICHELIN AWARDS names

Output: String (exact name from AVAILABLE MICHELIN AWARDS) or null

=== ACCESSIBILITY FEATURES ===
Identify accessibility features available at this restaurant for people with disabilities.

Data Sources (in priority order):
1. apify_output.additionalInfo.Accessibility - Google Places accessibility data
2. firecrawl_output - Look for accessibility mentions in scraped website content
3. reviews - Look for accessibility mentions in customer reviews
4. features - Cross-reference with restaurant features

Requirements:
- Return an array of schema.org-compliant accessibility feature strings
- Use camelCase format for all values
- Only include features explicitly mentioned or clearly indicated in the data
- Return empty array if no accessibility information available

Standard Accessibility Features (schema.org compliant):

ENTRANCE & ACCESS:
- "wheelchairAccessible" - Wheelchair accessible entrance
- "stepFreeEntry" - No steps at entrance, step-free access
- "levelEntry" - Same level entry from street
- "rampAccess" - Ramp available for wheelchair users
- "wideEntrance" - Wide entrance suitable for wheelchairs
- "automaticDoors" - Automatic or power-assisted doors

FACILITIES:
- "accessibleRestroom" - Accessible toilet/restroom facilities
- "accessibleParking" - Accessible parking spaces available
- "accessibleSeating" - Accessible seating areas
- "accessibleTables" - Tables with wheelchair clearance

VISUAL:
- "brailleMenu" - Menu available in Braille
- "largePrintMenu" - Large print menu available
- "goodLighting" - Well-lit environment for low vision
- "highContrast" - High contrast decor for visual clarity

HEARING:
- "hearingLoop" - Induction loop system available
- "signLanguageInterpretation" - Sign language services
- "quietArea" - Quiet dining areas available
- "visualAlerts" - Visual alert systems

SERVICE:
- "assistanceAnimalsWelcome" - Service animals welcomed
- "trainedStaff" - Staff trained in accessibility needs
- "accessibleMenu" - Menu in accessible formats
- "assistedSeating" - Staff assistance with seating

Detection Rules:

1. GOOGLE PLACES DATA (apify_output.additionalInfo.Accessibility):
   - "Wheelchair accessible entrance" → "wheelchairAccessible" + "stepFreeEntry"
   - "Wheelchair accessible restroom" → "accessibleRestroom"
   - "Wheelchair accessible seating" → "accessibleSeating"
   - "Wheelchair accessible parking lot" → "accessibleParking"
   - "Assistive hearing loop" → "hearingLoop"

2. WEBSITE/FIRECRAWL DATA:
   - Look for phrases: "wheelchair friendly", "disabled access", "step-free", "accessible"
   - "DDA compliant" or "Equality Act compliant" (UK) → likely "wheelchairAccessible"
   - "Blue badge parking" → "accessibleParking"
   - "Accessible toilet" or "disabled toilet" → "accessibleRestroom"
   - "Assistance dogs welcome" → "assistanceAnimalsWelcome"

3. REVIEWS:
   - Customers mentioning wheelchair access → "wheelchairAccessible"
   - Mentions of ramps, lifts, wide doors → relevant features
   - Mentions of accessible toilets → "accessibleRestroom"

4. CROSS-REFERENCE WITH FEATURES:
   - If restaurant has "Wheelchair Accessible" in features → add "wheelchairAccessible"
   - If has "Step-Free Entry" in features → add "stepFreeEntry"
   - If has "Accessible Restroom" in features → add "accessibleRestroom"
   - If has "Accessible Parking" in features → add "accessibleParking"
   - If has "Braille Menu" in features → add "brailleMenu"

Important Notes:
- Only include features with clear evidence in the data
- Do NOT infer or assume accessibility features
- Return empty array if no accessibility information found
- Use exact camelCase strings from the list above
- Maximum 8 features (prioritize most important)

Examples:

Example 1 - Wheelchair accessible venue:
Data: apify_output.additionalInfo.Accessibility = ["Wheelchair accessible entrance", "Wheelchair accessible restroom", "Wheelchair accessible seating"]
Output: ["wheelchairAccessible", "stepFreeEntry", "accessibleRestroom", "accessibleSeating"]

Example 2 - Basic accessibility:
Data: Website mentions "We are wheelchair friendly with step-free access and an accessible toilet"
Output: ["wheelchairAccessible", "stepFreeEntry", "accessibleRestroom"]

Example 3 - Service animals:
Data: Review mentions "They welcomed my guide dog" + Google Places shows "Wheelchair accessible entrance"
Output: ["wheelchairAccessible", "stepFreeEntry", "assistanceAnimalsWelcome"]

Example 4 - Comprehensive accessibility:
Data: Website has full accessibility page listing: wheelchair access, automatic doors, hearing loop, braille menu, accessible parking
Output: ["wheelchairAccessible", "stepFreeEntry", "automaticDoors", "hearingLoop", "brailleMenu", "accessibleParking"]

Example 5 - No accessibility data:
Data: No mentions of accessibility in any data source
Output: []

Example 6 - Parking only:
Data: Google Places shows "Wheelchair accessible parking lot"
Output: ["accessibleParking"]

Edge Cases:
- "Partially accessible" → Only include specifically mentioned features, not general "wheelchairAccessible"
- "Ground floor only" → May indicate "levelEntry" if confirmed step-free
- "Some steps" → Do NOT include "stepFreeEntry" or "wheelchairAccessible"
- Old buildings with limited access → Be conservative, only include confirmed features
- "Accessible entrance at rear" → Still counts as "wheelchairAccessible" if step-free

Output: Array of camelCase strings (can be empty array [])

=== PRICE RANGE ===
Categorize the restaurant's price level based on average cost per person.

Data Sources (in priority order):
1. apify_output.price (e.g., "£10–20", "£100+", "$$")
2. Menu prices in menu_data or firecrawl_output
3. Restaurant category/description indicating price level
4. Review mentions of price/value

Price Categories:
- £ (Budget): Under £15 per person
  * Fast food, casual cafes, takeaway joints
  * Pub meals, basic dining
  * Examples: "£5-10", "£10-15", "Budget", "Inexpensive"

- ££ (Moderate): £15-30 per person
  * Casual dining restaurants, gastropubs
  * Mid-range chains, bistros
  * Examples: "£15-25", "£20-30", "Moderate", "$$"

- £££ (Upscale): £30-60 per person
  * Fine dining, upscale restaurants
  * Premium gastropubs, high-end bistros
  * Examples: "£35-50", "£40-60", "Expensive", "$$$"

- ££££ (Luxury): £60+ per person
  * Michelin-starred, luxury fine dining
  * Exclusive high-end establishments
  * Examples: "£80+", "£100+", "Very Expensive", "$$$$"

Decision Logic:
1. Parse apify_output.price for price ranges or symbols
2. If menu_data exists, analyze average main course prices
3. Cross-reference with restaurant category (Fine Dining → likely £££ or ££££)
4. Consider Michelin stars, awards → automatically ££££
5. If uncertain, default to ££ (moderate)

Output: Single string matching EXACTLY one of: "£", "££", "£££", "££££"

=== PHONE NUMBER ===
Extract the restaurant's phone number from the provided data.

1. Check apify_output.phone or apify_output.phoneUnformatted
2. Check firecrawl_output for phone numbers in scraped content
3. Format with international dialing code (e.g., +44 for UK)
4. If not found in data, return null

Examples:
- "020 7123 4567" → "+44 20 7123 4567"
- "+44 20 7123 4567" → "+44 20 7123 4567" (already formatted)
- "07123 456789" → "+44 7123 456789"
- Not found → null

=== SOCIAL MEDIA URLS ===
Extract social media URLs from the provided data.

1. Check firecrawl_output.scrapes for social media links (scrapes with keys like "social_instagram", "social_facebook", etc.)
2. Look for Instagram, Facebook, TikTok, Twitter/X URLs in scraped markdown content
3. Return full URLs (not shortened links)
4. Return null for any platforms not found

Search Locations:
- firecrawl_output.scrapes.social_instagram.markdown
- firecrawl_output.scrapes.social_facebook.markdown
- firecrawl_output.scrapes.social_tiktok.markdown
- Any other scraped content that may contain social media links

URL Format Examples:
- Instagram: "https://instagram.com/restaurantname" or "https://www.instagram.com/restaurantname"
- Facebook: "https://facebook.com/restaurantname" or "https://www.facebook.com/restaurantname"
- TikTok: "https://tiktok.com/@restaurantname" or "https://www.tiktok.com/@restaurantname"
- Twitter: "https://twitter.com/restaurantname" or "https://x.com/restaurantname"

Output Format:
{
  "instagram": "https://instagram.com/username" or null,
  "facebook": "https://facebook.com/pagename" or null,
  "tiktok": "https://tiktok.com/@username" or null,
  "twitter": "https://twitter.com/username" or null
}

=== SLUG GENERATION ===
Format: {restaurant-name} OR {restaurant-name}-{location}

Decision Logic:
1. Analyze "people also search for" data from Apify to detect if multiple locations exist
2. Check if restaurant name is a common chain (e.g., "Wimpy", "Pret", "Costa")
3. If uncertain → DEFAULT to including location (safer)

Location Hierarchy:
1. Neighbourhood (preferred) - from apify_output.address or neighborhood
2. City (if neighbourhood unavailable)

Formatting Rules:
- Lowercase only
- Alphanumeric + hyphens only
- Remove apostrophes WITHOUT adding hyphen: "It's Bagels" → "its-bagels" (NOT "it-s-bagels")
- Replace "&" with "and": "Fish & Chips" → "fish-and-chips"
- Remove common suffixes: "restaurant", "cafe", "pub", "bar" (unless part of brand)
- Max length: 60 characters

Examples:
- "Abuelo Cafe", Camden → "abuelo-camden"
- "The Wimpy", Borehamwood → "wimpy-borehamwood"
- "It's Bagels", Primrose Hill → "its-bagels-primrose-hill"
- "Jamie's Italian", Covent Garden → "jamies-italian-covent-garden"

=== RESTAURANT CUISINES ===
1. Analyze apify_output.categoryName, menu items, and reviews
2. PREFER existing names from AVAILABLE CUISINES list (use EXACT case)
3. Only suggest NEW cuisines for legitimately unique styles (e.g., "Nepalese", "Peruvian")
4. Maximum 3 cuisines, ordered by prominence
5. Don't create micro-categories: "Neapolitan Pizza" → use "Italian"
6. Don't confuse categories with cuisines: "Fine Dining" is a category, not a cuisine

Examples:
- Japanese restaurant → ["Japanese"]
- Japanese fusion → ["Japanese", "Asian Fusion"]
- Argentinian steakhouse → ["Latin American"]
- Thai BBQ → ["Thai"]

=== RESTAURANT CATEGORIES ===
1. Analyze apify_output.categoryName, price, description, and reviews
2. PREFER existing names from AVAILABLE CATEGORIES list (use EXACT case)
3. Select 1-2 establishment types + 0-2 occasion/vibe categories
4. Minimum 1 category, Maximum 4 categories total
5. Always include at least 1 establishment type (Fine Dining, Casual Dining, Gastropub, Pub, Cafe, etc.)

Establishment Type Selection:
- Fine Dining: price £££-££££, elegant/upscale keywords, tasting menus
- Gastropub: categoryName "Pub" + elevated food, price ££-£££
- Pub: categoryName "Pub" + traditional food, price £-££
- Casual Dining: categoryName "Restaurant", price ££, relaxed
- Cafe/Bistro: categoryName matches, appropriate menu

Occasion/Vibe Detection (optional, add 0-2):
- Romantic: reviews mention "date night", "romantic", "intimate"
- Family Friendly: reviews mention "kids", "children", "family"
- Date Night: upscale casual or fine dining, good drinks
- Special Occasion: reviews mention "birthday", "anniversary", "celebration"

Examples:
- Fine dining steakhouse → ["Fine Dining", "Date Night", "Special Occasion"]
- Traditional pub → ["Pub", "Family Friendly"]
- Casual Indian restaurant → ["Casual Dining", "Family Friendly"]
- Award-winning gastropub → ["Gastropub"]

=== NEIGHBOURHOOD ===
Extract the neighbourhood/area name from apify_output.address

1. Analyze the full address string
2. PREFER existing names from AVAILABLE NEIGHBOURHOODS list (use EXACT case)
3. Extract the neighbourhood, NOT the street name or postcode
4. Common patterns in London addresses:
   - "123 Street Name, NEIGHBOURHOOD, London"
   - "Street Name, NEIGHBOURHOOD, Postcode"

Examples of extraction:
- "Spaniards Rd, Hampstead, London NW3 7JJ" → "Hampstead"
- "14 Blenheim Crescent, Notting Hill, London" → "Notting Hill"
- "Upper Street, Islington, London N1" → "Islington"
- "King's Road, Chelsea, London SW3" → "Chelsea"
- "Old Compton St, Soho, London W1D" → "Soho"

If address doesn't clearly indicate neighbourhood:
- Check apify_output.neighborhood field if available
- Look for area mentions in description
- If truly uncertain, suggest closest major area or leave as null

Output single string (NOT an array):
- "Camden Town" ✓
- "Shoreditch" ✓
- null (if genuinely unclear) ✓

=== RESTAURANT FEATURES ===
Analyze the restaurant data and identify applicable features from the list below.
Return EXACT feature names (case-sensitive) from this list only.

Data Sources (in priority order):
1. apify_output.additionalInfo (most reliable - Google Places data)
2. firecrawl_output special_diets, reviews, scraped content
3. Menu analysis (menu_data) for dietary options
4. Review keywords and descriptions

AVAILABLE FEATURES (match EXACT names):

DOG AMENITIES:
- Dog Water Bowls
- Dog Menu
- Dog Treats
- Dog Beds Available
- Dog Washing Station
- Dog Waste Bags Provided
- Dog-Friendly Indoor Seating
- Dog-Friendly Outdoor Seating
- Lead Hooks

OUTDOOR DINING:
- Beer Garden
- Patio
- Terrace
- Rooftop Seating
- Garden Seating
- Waterside Seating
- Heated Outdoor Area
- Covered Outdoor Area

DIETARY OPTIONS:
- Vegan Options
- Vegetarian Options
- Gluten-Free Options
- Dairy-Free Options
- Halal Options
- Kosher Options
- Nut-Free Options

DINING OPTIONS:
- Breakfast Served
- Brunch Served
- Lunch Served
- Dinner Served
- All Day Dining
- Late Night Dining
- Sunday Roast
- Tasting Menu

ATMOSPHERE:
- Family-Friendly
- Romantic Setting
- Casual Atmosphere
- Upscale Dining
- Lively Atmosphere
- Quiet Atmosphere
- Live Music
- Sports Viewing

ACCESSIBILITY:
- Wheelchair Accessible
- Step-Free Entry
- Accessible Restroom
- Accessible Parking
- Braille Menu

AMENITIES:
- Free WiFi
- Parking Available
- Valet Parking
- Bar Area
- Private Dining Room

SERVICES:
- Takeaway Available
- Delivery Service
- Online Booking
- Reservations Recommended
- Walk-ins Welcome

PAYMENT:
- Card Payments Accepted
- Contactless Payments
- Cash Only
- Service Charge Included

POLICIES:
- BYO Wine Allowed
- No Corkage Fee

Detection Rules:
1. DOG AMENITIES: Check apify_output.additionalInfo.Pets for "Dogs allowed"
   - If true, add "Dog-Friendly Indoor Seating" at minimum
   - Check for outdoor seating → add "Dog-Friendly Outdoor Seating"
   - Look for mentions of water bowls, treats, dog menu in reviews

2. OUTDOOR SEATING: Check apify_output.additionalInfo.Amenities
   - "Outdoor seating" → determine type (Beer Garden, Patio, Terrace)
   - British pubs with outdoor → likely "Beer Garden"
   - Restaurants with outdoor → "Patio" or "Terrace"

3. DIETARY: Check firecrawl_output special_diets + menu_data
   - "Vegetarian Friendly" → "Vegetarian Options"
   - "Vegan Options" → "Vegan Options"
   - Menu items marked vegetarian/vegan → include those options

4. ACCESSIBILITY: Check apify_output.additionalInfo.Accessibility
   - "Wheelchair accessible entrance" → "Wheelchair Accessible" + "Step-Free Entry"

5. PAYMENTS: Check apify_output.additionalInfo.Payments
   - "Credit cards" or "Debit cards" → "Card Payments Accepted"
   - Modern restaurants → likely "Contactless Payments"

6. RESERVATIONS: Check apify_output.additionalInfo.Planning
   - "Accepts reservations" → "Reservations Recommended"

7. ATMOSPHERE/DINING: Infer from category and reviews
   - Category "Fine Dining" → "Upscale Dining" + "Reservations Recommended"
   - Category "Gastropub" → "Sunday Roast" (UK pubs)
   - Reviews mention family/kids → "Family-Friendly"
   - Operating hours include breakfast → "Breakfast Served"

8. SERVICES:
   - Check firecrawl_output for delivery mentions → "Delivery Service", "Takeaway Available"
   - Check for online booking links → "Online Booking"

Output: Array of feature name strings (maximum 15 features, prioritize most relevant)

Examples:
- Gastropub: ["Dog-Friendly Outdoor Seating", "Beer Garden", "Sunday Roast", "Family-Friendly", "Card Payments Accepted"]
- Fine Dining: ["Upscale Dining", "Reservations Recommended", "Tasting Menu", "Valet Parking", "Romantic Setting"]
- Casual Cafe: ["Casual Atmosphere", "Walk-ins Welcome", "Vegetarian Options", "Free WiFi", "Takeaway Available"]

=== FAQS ===
Generate 5 SEO-optimised FAQs about this restaurant using ONLY factual data from provided sources.

Data Sources:
- apify_output - for general restaurant info, reviews, photos
- firecrawl_output - for website content, booking info
- menu_data - for dishes and prices
- Generated fields - for neighbourhood, price_range, hours, etc.

Requirements:
1. **FIRST FAQ (MANDATORY):** Dog-friendly question
   - Always ask about dog-friendliness as the first question
   - Format: "Are dogs allowed at [Restaurant Name]?" or "Is [Restaurant Name] dog-friendly?"
   - Answer MUST mention:
     * Whether dogs allowed (inside/outside/both)
     * Any restrictions (e.g., certain times only, outdoor only)
     * Dog amenities if available (water bowls, dog menu, treats)
     * Any booking considerations when bringing dogs
   - Use 2-4 sentences

2. **Remaining 4 FAQs:** Choose from these topics based on available data:
   - **Cuisine:** "What type of cuisine does [Restaurant Name] serve?" (if cuisine data available)
   - **Price:** "How much does a typical meal at [Restaurant Name] cost?" (if price range available)
   - **Reservations:** "Do I need to make a reservation at [Restaurant Name]?" (if reservations data available)
   - **Popular Dishes:** "What are the most popular dishes at [Restaurant Name]?" (if menu/review data available)
   - **Dress Code:** "What is the dress code at [Restaurant Name]?" (if dress code data available)
   - **Parking:** "Where can I park near [Restaurant Name]?" (if parking/location data available)
   - **Opening Hours:** "What are the opening hours at [Restaurant Name]?" (if hours data available)
   - **Location:** "Where is [Restaurant Name] located?" (if neighbourhood/address available)

Question Selection Logic:
- Prioritise questions where you have detailed, factual answers
- Skip topics with insufficient data
- Choose questions that potential customers would actually ask
- Mix practical questions (parking, reservations) with experience questions (cuisine, dishes)

Output Format:
{
  "faqs": [
    {
      "question": "Are dogs allowed at [Restaurant Name]?",
      "answer": "Factual answer with specific details (2-4 sentences)"
    },
    {
      "question": "SEO-optimised question including restaurant name",
      "answer": "Factual answer (2-4 sentences)"
    },
    {
      "question": "SEO-optimised question including restaurant name",
      "answer": "Factual answer (2-4 sentences)"
    },
    {
      "question": "SEO-optimised question including restaurant name",
      "answer": "Factual answer (2-4 sentences)"
    },
    {
      "question": "SEO-optimised question including restaurant name",
      "answer": "Factual answer (2-4 sentences)"
    }
  ]
}

Writing Guidelines:
- **British English spelling** throughout (e.g., "recognised", "neighbourhood", "flavour")
- **Include restaurant name** in every question for SEO value
- **Answers: 2-4 sentences**, factual, conversational tone
- **Use ONLY information** from provided data sources - no fabrication
- **If data unavailable** for a topic, choose a different question
- **Avoid AI clichés** ("culinary journey", "nestled", "delight", "elevate")
- **Be specific** - mention actual dishes, prices, locations
- **Conversational tone** - write as if answering a real customer

Dog-Friendly FAQ Examples:

Example 1 - Dogs welcome everywhere:
Q: "Are dogs allowed at England's Grace?"
A: "Yes, England's Grace welcomes dogs both inside and outside the restaurant. The team is happy to provide water bowls for four-legged guests, and dogs are welcome throughout the day. It's advisable to mention you're bringing your dog when booking to ensure the best seating arrangement."

Example 2 - Outdoor only:
Q: "Is The Ivy Chelsea Garden dog-friendly?"
A: "Yes, dogs are welcome in the outdoor terrace area at The Ivy Chelsea Garden. The restaurant provides water bowls and treats for canine guests. Please note that dogs aren't permitted in the indoor dining areas. It's recommended to book ahead and specify you'll have a dog with you."

Example 3 - Limited information:
Q: "Are dogs allowed at [Restaurant Name]?"
A: "Dogs are welcome at [Restaurant Name], making it a great choice for dining with your four-legged friend. It's best to call ahead when booking to confirm the current policy and ensure the most suitable seating arrangement."

Complete FAQ Set Example (England's Grace):
[
  {
    "question": "Are dogs allowed at England's Grace?",
    "answer": "Yes, England's Grace welcomes dogs both inside and outside the restaurant. The team is happy to provide water bowls for four-legged guests, and dogs are welcome throughout the day. It's advisable to mention you're bringing your dog when booking to ensure the best seating arrangement."
  },
  {
    "question": "What type of cuisine does England's Grace serve?",
    "answer": "England's Grace serves modern European cuisine with Antipodean influences, blending British seasonal ingredients with Australian dining sensibilities. The menu moves seamlessly from breakfast through to dinner, featuring dishes like soy-braised beef cheek, cured salmon gravlax, and slow-braised beef pappardelle. The kitchen demonstrates serious culinary ambition whilst maintaining a relaxed, neighbourhood restaurant atmosphere."
  },
  {
    "question": "How much does a typical meal at England's Grace cost?",
    "answer": "England's Grace is in the £££ price range, with mains typically ranging from £18-£28. Breakfast and brunch options are more affordable, starting around £8-£15, whilst the dinner menu represents good value for the quality and presentation. Many guests find it worth the price for the exceptional food quality and attentive service."
  },
  {
    "question": "Do I need to make a reservation at England's Grace?",
    "answer": "Reservations are recommended, especially for dinner and weekend brunch. You can book through OpenTable or contact the restaurant directly on +44 20 3161 7614. Walk-ins are sometimes accommodated at quieter times, but booking ahead ensures you secure a table, particularly if you're bringing your dog."
  },
  {
    "question": "Where can I park near England's Grace?",
    "answer": "For sat nav, use postcode NW8 7SH. There's metered parking available on St John's Wood High Street with time restrictions during the day. The nearest car park is the Q-Park on Circus Road, about a 5-minute walk away. Alternatively, the restaurant is a 5-minute walk from St John's Wood Underground station."
  }
]

Output: Array of exactly 5 FAQ objects, with the first always about dog-friendliness

GLOBAL RULES:
1. LANGUAGE: Use British English (UK) spelling and terminology throughout
   - "flavour" not "flavor"
   - "neighbourhood" not "neighborhood"
   - "recognise" not "recognize"
   - Use British food terminology and phrasing
2. Use ONLY data from provided sources (no fabrication)
3. For missing data, use null or empty arrays
4. Use natural, conversational language for "about" (avoid AI clichés like "nestled", "culinary journey", "delightful")
5. Be specific and concrete
6. For cuisines: PREFER existing names from list, use EXACT case
7. For categories: PREFER existing names from list, use EXACT case, minimum 1, maximum 4
8. For neighbourhood: PREFER existing names from list, use EXACT case, extract from address

OUTPUT: Valid JSON matching the schema above. Return ONLY the JSON, no markdown formatting, no code blocks.`

    console.log('[Generate Content] Calling Anthropic API...')

    // Call Anthropic with 1M context window (enabled via defaultHeaders)
    // Using prompt caching to cache static content (neighbourhoods, cuisines, categories, instructions)
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: prompt,
          cache_control: { type: 'ephemeral' } // 5-minute TTL, auto-refresh on use
        }
      ],
      messages: [
        {
          role: 'user',
          content: 'Generate content for this restaurant following the instructions above.'
        }
      ]
    })

    console.log('[Generate Content] Anthropic response received')

    // Extract and parse JSON response
    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : ''

    console.log('[Generate Content] Raw response:', responseText.substring(0, 200) + '...')

    // Parse JSON (remove markdown code blocks if present)
    let generatedContent
    try {
      const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      generatedContent = JSON.parse(cleanedResponse)
      console.log('[Generate Content] Parsed content:', {
        slug: generatedContent.slug,
        aboutLength: generatedContent.about?.length,
        cuisines: generatedContent.cuisines,
        categories: generatedContent.categories,
        neighbourhood: generatedContent.neighbourhood
      })
    } catch (parseError) {
      console.error('[Generate Content] Failed to parse JSON:', parseError)
      // Log more context for debugging
      const errorMatch = parseError.message?.match(/position (\d+)/)
      if (errorMatch) {
        const errorPos = parseInt(errorMatch[1])
        const start = Math.max(0, errorPos - 200)
        const end = Math.min(cleanedResponse.length, errorPos + 200)
        console.error('[Generate Content] Context around error position:', cleanedResponse.substring(start, end))
      }
      console.error('[Generate Content] Full response length:', cleanedResponse.length)
      console.error('[Generate Content] First 1000 chars:', cleanedResponse.substring(0, 1000))
      console.error('[Generate Content] Last 500 chars:', cleanedResponse.substring(cleanedResponse.length - 500))
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', details: responseText.substring(0, 500) },
        { status: 500 }
      )
    }

    // Store raw output and populate live columns in database
    console.log('[Generate Content] Updating database with generated content...')

    // Prepare the update object with all direct columns
    const updateData: any = {
      anthropic_generated_content: generatedContent,
      phone: generatedContent.phone || restaurant.phone,
      price_range: generatedContent.price_range || restaurant.price_range,
      latitude: generatedContent.coordinates?.latitude || restaurant.latitude,
      longitude: generatedContent.coordinates?.longitude || restaurant.longitude,
      hours: generatedContent.hours || restaurant.hours,
      dress_code: generatedContent.dress_code || restaurant.dress_code,
      reservations_url: generatedContent.reservations_url || restaurant.reservations_url,
      reservations_required: generatedContent.reservations_required ?? restaurant.reservations_required,
      best_times_buzzing: generatedContent.best_times_buzzing || restaurant.best_times_buzzing,
      best_times_relaxed: generatedContent.best_times_relaxed || restaurant.best_times_relaxed,
      best_times_with_dogs: generatedContent.best_times_with_dogs || restaurant.best_times_with_dogs,
      best_times_description: generatedContent.best_times_description || restaurant.best_times_description,
      getting_there_public: generatedContent.getting_there_public || restaurant.getting_there_public,
      getting_there_car: generatedContent.getting_there_car || restaurant.getting_there_car,
      nearest_dog_parks: generatedContent.nearest_dog_parks || restaurant.nearest_dog_parks,
      public_review_sentiment: generatedContent.public_review_sentiment || restaurant.public_review_sentiment,
      sentiment_score: generatedContent.sentiment_score ?? restaurant.sentiment_score,
      accessibility_features: generatedContent.accessibility_features || restaurant.accessibility_features,
      social_media_urls: generatedContent.social_media_urls || restaurant.social_media_urls,
      about: generatedContent.about || restaurant.about,
      faqs: generatedContent.faqs || restaurant.faqs,
      updated_at: new Date().toISOString()
    }

    const { error: storeError } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', restaurantId)

    if (storeError) {
      console.error('[Generate Content] Failed to update database:', storeError)
      return NextResponse.json(
        { error: 'Failed to update database', details: storeError.message },
        { status: 500 }
      )
    }

    console.log('[Generate Content] Database updated successfully')
    console.log('[Generate Content] Updated columns:', Object.keys(updateData).join(', '))

    // Return the raw content (no database mapping/updates)
    return NextResponse.json({
      success: true,
      restaurant_id: restaurantId,
      restaurant_name: restaurant.name,
      raw_anthropic_output: generatedContent,
      columns_updated: Object.keys(updateData),
      tokens_used: message.usage,
      model: message.model
    })

  } catch (error) {
    console.error('[Generate Content] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate content',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
