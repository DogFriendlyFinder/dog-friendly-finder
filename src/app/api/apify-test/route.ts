import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { placeId } = await request.json()

    if (!placeId) {
      return NextResponse.json(
        { error: "Place ID is required" },
        { status: 400 }
      )
    }

    const apifyApiKey = process.env.APIFY_API_KEY

    if (!apifyApiKey) {
      return NextResponse.json(
        { error: "Apify API key not configured" },
        { status: 500 }
      )
    }

    console.log('Starting Apify actor run for place ID:', placeId)

    // Start the Apify actor
    const actorInput = {
      includeWebResults: false,
      language: "en",
      maxCrawledPlacesPerSearch: 1,
      maxImages: 0,
      maximumLeadsEnrichmentRecords: 0,
      placeIds: [placeId],
      scrapeContacts: false,
      scrapeDirectories: false,
      scrapeImageAuthors: false,
      scrapePlaceDetailPage: false,
      scrapeReviewsPersonalData: true,
      scrapeTableReservationProvider: false,
      skipClosedPlaces: false,
      searchMatching: "all",
      placeMinimumStars: "",
      website: "allPlaces",
      maxQuestions: 0,
      maxReviews: 0,
      reviewsSort: "newest",
      reviewsFilterString: "",
      reviewsOrigin: "all",
      allPlacesNoSearchAction: ""
    }

    console.log('Apify actor input:', JSON.stringify(actorInput, null, 2))

    // Call Apify API to run the actor
    const runResponse = await fetch(
      'https://api.apify.com/v2/acts/compass~crawler-google-places/runs',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apifyApiKey}`
        },
        body: JSON.stringify(actorInput)
      }
    )

    if (!runResponse.ok) {
      const errorText = await runResponse.text()
      console.error('Apify run error:', errorText)
      return NextResponse.json(
        { error: 'Failed to start Apify actor', details: errorText },
        { status: runResponse.status }
      )
    }

    const runData = await runResponse.json()
    console.log('Apify run started:', runData)

    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId

    // Wait for the run to complete
    console.log('Waiting for Apify run to complete...')
    let runStatus = 'RUNNING'
    let attempts = 0
    const maxAttempts = 60 // 60 attempts * 2 seconds = 2 minutes max

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds

      const statusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}`,
        {
          headers: {
            'Authorization': `Bearer ${apifyApiKey}`
          }
        }
      )

      if (!statusResponse.ok) {
        console.error('Failed to check run status')
        break
      }

      const statusData = await statusResponse.json()
      runStatus = statusData.data.status
      console.log(`Run status (attempt ${attempts + 1}):`, runStatus)
      attempts++
    }

    if (runStatus !== 'SUCCEEDED') {
      return NextResponse.json(
        { error: 'Apify run did not complete successfully', status: runStatus },
        { status: 500 }
      )
    }

    // Get the results from the dataset
    console.log('Fetching results from dataset:', defaultDatasetId)
    const resultsResponse = await fetch(
      `https://api.apify.com/v2/datasets/${defaultDatasetId}/items`,
      {
        headers: {
          'Authorization': `Bearer ${apifyApiKey}`
        }
      }
    )

    if (!resultsResponse.ok) {
      const errorText = await resultsResponse.text()
      console.error('Failed to fetch results:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch results', details: errorText },
        { status: resultsResponse.status }
      )
    }

    const results = await resultsResponse.json()
    console.log('=== APIFY RESULTS ===')
    console.log(JSON.stringify(results, null, 2))
    console.log('=== END APIFY RESULTS ===')

    return NextResponse.json({
      success: true,
      data: results,
      runId,
      datasetId: defaultDatasetId
    })

  } catch (error) {
    console.error("Apify test API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
