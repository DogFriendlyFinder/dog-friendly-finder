import { NextRequest, NextResponse } from "next/server"
import Firecrawl from "@mendable/firecrawl-js"

interface ScrapeResult {
  source: string
  data: any
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const { placeId, name, website, address } = await request.json()

    if (!placeId || !name) {
      return NextResponse.json(
        { error: "Place ID and name are required" },
        { status: 400 }
      )
    }

    const firecrawlApiKey = process.env.FIRECRAWL_API_KEY
    const googlePlacesApiKey = process.env.GOOGLE_PLACES_API_KEY

    if (!firecrawlApiKey) {
      return NextResponse.json(
        { error: "Firecrawl API key not configured" },
        { status: 500 }
      )
    }

    // Initialize Firecrawl v2
    const firecrawl = new Firecrawl({ apiKey: firecrawlApiKey })

    const scrapeResults: ScrapeResult[] = []

    // === 1. GOOGLE BUSINESS PROFILE (Highest Priority) ===
    if (googlePlacesApiKey && placeId) {
      try {
        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,price_level,rating,user_ratings_total,photos,reviews,editorial_summary,business_status,url&key=${googlePlacesApiKey}`

        const response = await fetch(placeDetailsUrl)
        const googleData = await response.json()

        scrapeResults.push({
          source: "google_business_profile",
          data: googleData.result || googleData,
        })
      } catch (error) {
        console.error("Google Places Details error:", error)
        scrapeResults.push({
          source: "google_business_profile",
          data: null,
          error: "Failed to fetch Google Business Profile"
        })
      }
    }

    // === 2. GOOGLE MAPS PLACE PAGE (Highest Priority for Busy Periods & Reviews) ===
    if (placeId) {
      try {
        const googleMapsUrl = `https://www.google.com/maps?q=place_id:${placeId}`
        const googleMapsResult = await firecrawl.scrape(googleMapsUrl, {
          formats: ["markdown", "html"],
          onlyMainContent: true,
          waitFor: 2000,
        })
        scrapeResults.push({
          source: "google_maps_page",
          data: googleMapsResult,
        })
      } catch (error) {
        console.error("Google Maps page scrape error:", error)
        scrapeResults.push({
          source: "google_maps_page",
          data: null,
          error: "Failed to scrape Google Maps page"
        })
      }
    }

    // === 3. OFFICIAL RESTAURANT WEBSITE (High Priority for Content) ===
    if (website) {
      try {
        const websiteResult = await firecrawl.scrape(website, {
          formats: ["markdown", "html"],
          onlyMainContent: true,
          waitFor: 2000,
        })
        scrapeResults.push({
          source: "official_website",
          data: websiteResult,
        })
      } catch (error) {
        console.error("Website scrape error:", error)
        scrapeResults.push({
          source: "official_website",
          data: null,
          error: "Failed to scrape official website"
        })
      }
    }

    // === 4. DELIVERY PLATFORMS ===

    // Deliveroo
    try {
      const deliverooSearchUrl = `https://deliveroo.co.uk/search?q=${encodeURIComponent(name)}`
      const deliverooResult = await firecrawl.scrape(deliverooSearchUrl, {
        formats: ["markdown"],
        onlyMainContent: true,
      })
      scrapeResults.push({
        source: "deliveroo",
        data: deliverooResult,
      })
    } catch (error) {
      console.error("Deliveroo scrape error:", error)
      scrapeResults.push({
        source: "deliveroo",
        data: null,
        error: "Failed to scrape Deliveroo"
      })
    }

    // Uber Eats
    try {
      const uberEatsSearchUrl = `https://www.ubereats.com/gb/search?q=${encodeURIComponent(name)}`
      const uberEatsResult = await firecrawl.scrape(uberEatsSearchUrl, {
        formats: ["markdown"],
        onlyMainContent: true,
      })
      scrapeResults.push({
        source: "uber_eats",
        data: uberEatsResult,
      })
    } catch (error) {
      console.error("Uber Eats scrape error:", error)
      scrapeResults.push({
        source: "uber_eats",
        data: null,
        error: "Failed to scrape Uber Eats"
      })
    }

    // Just Eat
    try {
      const justEatSearchUrl = `https://www.just-eat.co.uk/search?q=${encodeURIComponent(name)}`
      const justEatResult = await firecrawl.scrape(justEatSearchUrl, {
        formats: ["markdown"],
        onlyMainContent: true,
      })
      scrapeResults.push({
        source: "just_eat",
        data: justEatResult,
      })
    } catch (error) {
      console.error("Just Eat scrape error:", error)
      scrapeResults.push({
        source: "just_eat",
        data: null,
        error: "Failed to scrape Just Eat"
      })
    }

    // === 5. REVIEW SITES ===

    // TripAdvisor
    try {
      const tripAdvisorSearchUrl = `https://www.tripadvisor.co.uk/Search?q=${encodeURIComponent(name)}`
      const tripAdvisorResult = await firecrawl.scrape(tripAdvisorSearchUrl, {
        formats: ["markdown"],
        onlyMainContent: true,
      })
      scrapeResults.push({
        source: "tripadvisor",
        data: tripAdvisorResult,
      })
    } catch (error) {
      console.error("TripAdvisor scrape error:", error)
      scrapeResults.push({
        source: "tripadvisor",
        data: null,
        error: "Failed to scrape TripAdvisor"
      })
    }

    // OpenTable
    try {
      const openTableSearchUrl = `https://www.opentable.co.uk/s?term=${encodeURIComponent(name)}`
      const openTableResult = await firecrawl.scrape(openTableSearchUrl, {
        formats: ["markdown"],
        onlyMainContent: true,
      })
      scrapeResults.push({
        source: "opentable",
        data: openTableResult,
      })
    } catch (error) {
      console.error("OpenTable scrape error:", error)
      scrapeResults.push({
        source: "opentable",
        data: null,
        error: "Failed to scrape OpenTable"
      })
    }

    // The Fork
    try {
      const theForkSearchUrl = `https://www.thefork.co.uk/search?term=${encodeURIComponent(name)}`
      const theForkResult = await firecrawl.scrape(theForkSearchUrl, {
        formats: ["markdown"],
        onlyMainContent: true,
      })
      scrapeResults.push({
        source: "the_fork",
        data: theForkResult,
      })
    } catch (error) {
      console.error("The Fork scrape error:", error)
      scrapeResults.push({
        source: "the_fork",
        data: null,
        error: "Failed to scrape The Fork"
      })
    }

    // === 6. SOCIAL MEDIA ===
    // Note: Social media scraping is limited due to authentication requirements
    // We'll primarily rely on Google Business Profile for social media links
    // and use those links if needed for additional context

    return NextResponse.json({
      success: true,
      data: scrapeResults,
      placeId,
      name,
      totalSources: scrapeResults.length,
      successfulSources: scrapeResults.filter(r => !r.error).length,
      failedSources: scrapeResults.filter(r => r.error).length,
    })
  } catch (error) {
    console.error("Scrape API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
