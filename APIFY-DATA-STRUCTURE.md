# Apify Data Structure Analysis
**Restaurant:** The Wells Tavern, Hampstead
**Test Date:** 2025-10-19

## Workflow Confirmed Working ✓

1. Google Places API → Found place_id: `ChIJP_cx9mIadkgRYFS2LDApgQE`
2. Apify Actor Run → Completed in ~12 seconds
3. Results Retrieved → Full restaurant data returned

---

## Key Data Fields Available from Apify

### Basic Information
```json
{
  "title": "The Wells Tavern",
  "description": "Modern European gastropub in Georgian house...",
  "categoryName": "Pub",
  "address": "30 Well Walk, London NW3 1BX, United Kingdom",
  "street": "30 Well Walk",
  "city": "London",
  "postalCode": "NW3 1BX",
  "countryCode": "GB",
  "phone": "+44 20 7794 3785",
  "website": "http://thewellshampstead.co.uk/",
  "placeId": "ChIJP_cx9mIadkgRYFS2LDApgQE",
  "location": {
    "lat": 51.5587432,
    "lng": -0.1736439
  }
}
```

### Ratings & Reviews
```json
{
  "totalScore": 4.4,
  "reviewsCount": 1186,
  "reviewsDistribution": {
    "oneStar": 37,
    "twoStar": 24,
    "threeStar": 86,
    "fourStar": 290,
    "fiveStar": 749
  }
}
```

### Pricing
```json
{
  "price": "$$"  // Will be converted to "££" for our DB
}
```

### Opening Hours
```json
{
  "openingHours": [
    { "day": "Monday", "hours": "12 to 11 PM" },
    { "day": "Tuesday", "hours": "12 to 11 PM" },
    { "day": "Wednesday", "hours": "12 to 11 PM" },
    { "day": "Thursday", "hours": "12 to 11 PM" },
    { "day": "Friday", "hours": "12 to 11 PM" },
    { "day": "Saturday", "hours": "12 to 11 PM" },
    { "day": "Sunday", "hours": "12 to 10:30 PM" }
  ]
}
```

### Popular Times Histogram ⭐ KEY FEATURE
```json
{
  "popularTimesHistogram": {
    "Su": [
      { "hour": 12, "occupancyPercent": 62 },
      { "hour": 13, "occupancyPercent": 82 },
      { "hour": 14, "occupancyPercent": 87 },
      { "hour": 15, "occupancyPercent": 88 }
      // ... etc for all hours
    ],
    "Mo": [ /* ... */ ],
    "Tu": [ /* ... */ ],
    // etc.
  }
}
```

**Busiest Time:** Saturday at 5 PM (100% occupancy)
**Quietest Time:** Tuesday at 3 PM (17% occupancy)

### Dog-Friendly Information ⭐ CRITICAL
```json
{
  "additionalInfo": {
    "Pets": [
      { "Dogs allowed": true }
    ]
  }
}
```

### Reviews Tags (Popular Dishes/Topics)
```json
{
  "reviewsTags": [
    { "title": "dog", "count": 67 },
    { "title": "sunday roast", "count": 58 },
    { "title": "walk", "count": 16 },
    { "title": "salad", "count": 14 },
    { "title": "chateaubriand", "count": 8 },
    { "title": "roast beef", "count": 8 },
    { "title": "bangers and mash", "count": 8 }
  ]
}
```

### Accessibility Features
```json
{
  "additionalInfo": {
    "Accessibility": [
      { "Wheelchair accessible entrance": true },
      { "Wheelchair accessible restroom": true },
      { "Wheelchair accessible seating": true }
    ]
  }
}
```

### Service Options & Amenities
```json
{
  "additionalInfo": {
    "Service options": [
      { "Outdoor seating": true },
      { "Dine-in": true },
      { "Delivery": false },
      { "Takeout": false }
    ],
    "Amenities": [
      { "Restroom": true },
      { "Wi-Fi": true },
      { "Free Wi-Fi": true }
    ],
    "Atmosphere": [
      { "Casual": true },
      { "Cozy": true },
      { "Romantic": true },
      { "Trendy": true },
      { "Upscale": true }
    ]
  }
}
```

### Reservations
```json
{
  "additionalInfo": {
    "Planning": [
      { "Accepts reservations": true }
    ]
  },
  "tableReservationLinks": [
    {
      "name": "thewellshampstead.co.uk",
      "url": "https://thewellshampstead.co.uk/#book"
    }
  ]
}
```

---

## Database Mapping

### Direct Field Mappings
| Apify Field | Database Column | Transformation |
|-------------|----------------|----------------|
| `title` | `name` | Direct |
| `address` | `address` | Direct |
| `phone` | `phone` | Direct |
| `website` | `website` | Direct |
| `location.lat` | `latitude` | Direct |
| `location.lng` | `longitude` | Direct |
| `city` | `city` | Direct |
| `price` | `price_range` | Convert $ to £ |
| `placeId` | `google_place_id` | Direct |

### JSONB Storage
| Apify Data | Database Column | Purpose |
|------------|----------------|---------|
| **Complete Response** | `apify_output` | Full audit trail |
| `popularTimesHistogram` | `popular_times_raw` | For calculating best times |
| `openingHours` | `hours` | Converted to structured format |

### Structured Hour Conversion
```javascript
// Input from Apify
"openingHours": [
  { "day": "Monday", "hours": "12 to 11 PM" }
]

// Output to DB
"hours": {
  "monday": { "open": "12:00 PM", "close": "11:00 PM" }
}
```

### Extracted Features
From `additionalInfo`, we can extract:
- **Dog amenities:** "Dogs allowed" → `restaurant_features` table
- **Outdoor seating** → `restaurant_features` table
- **WiFi** → `restaurant_features` table
- **Wheelchair accessibility** → `accessibility_features` array
- **Accepts reservations** → `reservations_required` boolean

### Popular Dishes
From `reviewsTags`, we can identify popular items:
- "sunday roast" (58 mentions)
- "chateaubriand" (8 mentions)
- "roast beef" (8 mentions)
- "bangers and mash" (8 mentions)

These should be matched to the `restaurant_dishes` table and marked with `popular = true`.

---

## Implementation Status

✅ **Working:**
- Google Places API search
- Apify actor execution
- Results retrieval
- Complete data structure confirmed

⚠️ **Needs Fixing:**
- UI display of apifyData (currently not showing)
- Price range conversion ($ to £) - **IMPLEMENTED**
- Opening hours parsing - **IMPLEMENTED**
- Popular times storage - **IMPLEMENTED**

🔜 **Next Steps:**
1. Fix UI to display apifyData after fetch completes
2. Verify all data shows correctly in localhost
3. Test with multiple restaurants
4. Implement Firecrawl stages (menu scraping)
5. Implement Anthropic content generation

---

## Notes

- **Dogs allowed:** 67 reviews mention "dog" - very dog-friendly!
- **Reservation link:** Available at `thewellshampstead.co.uk/#book`
- **Busiest:** Saturdays (peak 100% at 5 PM)
- **Best for dogs:** Tuesday 3 PM (quietest at 17%)
- **Menu URL:** Not provided by Apify (will need Firecrawl)
