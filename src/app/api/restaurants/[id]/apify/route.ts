import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  try {
    const { place_id } = await request.json()

    if (!place_id) {
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

    console.log('Starting Apify actor run for place ID:', place_id)

    // Start the Apify actor
    const actorInput = {
      includeWebResults: false,
      language: "en",
      maxCrawledPlacesPerSearch: 1,
      maxImages: 20,
      maximumLeadsEnrichmentRecords: 0,
      placeIds: [place_id],
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

    if (!results || results.length === 0) {
      return NextResponse.json(
        { error: 'No data returned from Apify' },
        { status: 404 }
      )
    }

    const apifyData = results[0]

    // Update restaurant in database
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Prepare data for update
    const updateData: any = {
      apify_output: apifyData,
      last_scraped_at: new Date().toISOString()
    }

    // Populate basic fields from Apify data
    if (apifyData.title) updateData.name = apifyData.title
    if (apifyData.address) updateData.address = apifyData.address
    if (apifyData.phone) updateData.phone = apifyData.phone
    if (apifyData.website) updateData.website = apifyData.website

    // Convert price range from $ to £ format
    if (apifyData.price) {
      const priceMap: { [key: string]: string } = {
        '$': '£',
        '$$': '££',
        '$$$': '£££',
        '$$$$': '££££'
      }
      updateData.price_range = priceMap[apifyData.price] || null
    }

    // Convert opening hours
    if (apifyData.openingHours && Array.isArray(apifyData.openingHours)) {
      const hours: any = {}
      const dayMap: { [key: string]: string } = {
        'Monday': 'monday',
        'Tuesday': 'tuesday',
        'Wednesday': 'wednesday',
        'Thursday': 'thursday',
        'Friday': 'friday',
        'Saturday': 'saturday',
        'Sunday': 'sunday'
      }

      apifyData.openingHours.forEach((item: any) => {
        const dayKey = dayMap[item.day]
        if (dayKey) {
          if (item.hours === 'Closed') {
            hours[dayKey] = { closed: true }
          } else {
            // Parse time ranges like "12:00 PM - 11:00 PM"
            const timeMatch = item.hours.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/)
            if (timeMatch) {
              hours[dayKey] = { open: timeMatch[1], close: timeMatch[2] }
            }
          }
        }
      })

      updateData.hours = hours
    }

    // Store popular times
    if (apifyData.popularTimesHistogram) {
      updateData.popular_times_raw = apifyData.popularTimesHistogram
    }

    console.log('Attempting to update restaurant ID:', params.id)
    console.log('Update data keys:', Object.keys(updateData))

    const { data: updatedRestaurant, error: updateError } = await supabase
      .from('restaurants')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (updateError) {
      console.error('=== DATABASE UPDATE ERROR ===')
      console.error('Error object:', JSON.stringify(updateError, null, 2))
      console.error('Error message:', updateError.message)
      console.error('Error details:', updateError.details)
      console.error('Error hint:', updateError.hint)
      console.error('Error code:', updateError.code)
      return NextResponse.json(
        {
          error: 'Failed to update restaurant in database',
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint
        },
        { status: 500 }
      )
    }

    console.log('=== RESTAURANT UPDATED SUCCESSFULLY ===')
    console.log('Updated restaurant ID:', updatedRestaurant.id)

    return NextResponse.json({
      success: true,
      data: apifyData,
      restaurant_id: params.id,
      runId,
      datasetId: defaultDatasetId
    })

  } catch (error) {
    console.error("Apify fetch API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
