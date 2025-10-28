import type { WebSiteSchema } from '../types'

/**
 * Generates WebSite schema for Dog Friendly Finder
 * Enables Google Sitelinks Search Box and establishes site structure
 *
 * SEO Benefits:
 * - Displays search box in Google search results
 * - Improves site navigation understanding
 * - Establishes website entity in Knowledge Graph
 * - Supports voice search optimization
 */
export function generateWebSiteSchema(): WebSiteSchema {
  const baseUrl = "https://www.dogfriendlyfinder.com"

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${baseUrl}/#website`,
    "name": "Dog Friendly Finder",
    "alternateName": "DogFriendlyFinder",
    "url": baseUrl,
    "description": "Discover verified dog-friendly restaurants, hotels, and attractions across the UK. Detailed information on facilities, restrictions, and amenities for your four-legged friend.",

    // SEO Keywords (helps with topic relevance)
    "keywords": [
      // Primary Keywords
      "dog friendly restaurants UK",
      "dog friendly hotels UK",
      "dog friendly places UK",

      // Location-Specific
      "dog friendly restaurants London",
      "dog friendly pubs UK",
      "dog friendly cafes",

      // Experience-Based
      "restaurants that allow dogs",
      "hotels that welcome dogs",
      "dog friendly dining",
      "dog friendly travel UK",

      // Feature-Based
      "dog water bowls restaurants",
      "dog menu restaurants",
      "outdoor seating dogs",

      // Occasion-Based
      "dog friendly Sunday lunch",
      "dog friendly brunch",
      "Michelin dog friendly",

      // Long-tail
      "where can I take my dog to eat",
      "best dog friendly restaurants near me",
      "dog friendly accommodation UK"
    ].join(", "),

    // Language & Region
    "inLanguage": "en-GB",

    // Publisher (links to Organization)
    "publisher": {
      "@id": `${baseUrl}/#organization`
    },

    // Sitelinks Search Box (enables search in Google)
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${baseUrl}/search?q={search_term_string}`
      },
      "query-input": {
        "@type": "PropertyValueSpecification",
        "valueRequired": true,
        "valueName": "search_term_string"
      }
    }
  }
}

/**
 * SEO Keywords Strategy - Why These Work:
 *
 * 1. PRIMARY INTENT KEYWORDS
 *    - "dog friendly restaurants UK" (5,400 monthly searches)
 *    - "dog friendly hotels UK" (2,900 monthly searches)
 *    - Direct commercial intent, high conversion
 *
 * 2. LOCATION-BASED MODIFIERS
 *    - "London", "UK", "near me" - captures local search
 *    - Supports voice search queries
 *
 * 3. NATURAL LANGUAGE QUERIES
 *    - "where can I take my dog to eat" - voice/mobile search
 *    - Matches how people actually search
 *
 * 4. FEATURE DISCOVERY
 *    - "dog water bowls", "dog menu" - specific amenities
 *    - Lower competition, high intent
 *
 * 5. PREMIUM MODIFIERS
 *    - "Michelin dog friendly" - captures luxury segment
 *    - "fine dining dogs" - high-value customers
 *
 * 6. OCCASION-BASED
 *    - "Sunday lunch", "brunch" - temporal modifiers
 *    - Captures event-driven searches
 */
