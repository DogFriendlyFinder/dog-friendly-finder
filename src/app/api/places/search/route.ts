import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      )
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Places API key not configured" },
        { status: 500 }
      )
    }

    // Using Google Places API Text Search
    const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json")
    url.searchParams.append("query", query)
    url.searchParams.append("type", "restaurant")
    url.searchParams.append("key", apiKey)

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error("Failed to fetch from Google Places API")
    }

    const data = await response.json()

    if (data.status === "ZERO_RESULTS") {
      return NextResponse.json({ results: [] })
    }

    if (data.status !== "OK") {
      return NextResponse.json(
        { error: `Google Places API error: ${data.status}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ results: data.results })
  } catch (error) {
    console.error("Places search error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
