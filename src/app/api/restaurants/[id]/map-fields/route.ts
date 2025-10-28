import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: Match or create cuisines
async function matchOrCreateCuisines(cuisineNames: string[]): Promise<{ ids: string[], newlyCreated: string[] }> {
  const ids: string[] = []
  const newlyCreated: string[] = []

  for (const name of cuisineNames) {
    // Try to find existing cuisine (case-insensitive)
    const { data: existing } = await supabase
      .from('restaurant_cuisines')
      .select('id')
      .ilike('name', name)
      .single()

    if (existing) {
      ids.push(existing.id)
      console.log(`[Map Fields] Matched existing cuisine: ${name} (${existing.id})`)
    } else {
      // Create new cuisine with slug
      const slug = name.replace(/'/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const { data: newCuisine, error } = await supabase
        .from('restaurant_cuisines')
        .insert({
          name,
          slug
        })
        .select('id')
        .single()

      if (newCuisine && !error) {
        ids.push(newCuisine.id)
        newlyCreated.push(name)
        console.log(`[Map Fields] Created new cuisine: ${name} (${newCuisine.id}) with slug: ${slug}`)
      } else {
        console.error(`[Map Fields] Failed to create cuisine: ${name}`, error)
      }
    }
  }

  return { ids, newlyCreated }
}

// Helper: Match or create categories
async function matchOrCreateCategories(categoryNames: string[]): Promise<{ ids: string[], newlyCreated: string[] }> {
  const ids: string[] = []
  const newlyCreated: string[] = []

  for (const name of categoryNames) {
    // Try to find existing category (case-insensitive)
    const { data: existing } = await supabase
      .from('restaurant_categories')
      .select('id')
      .ilike('name', name)
      .single()

    if (existing) {
      ids.push(existing.id)
      console.log(`[Map Fields] Matched existing category: ${name} (${existing.id})`)
    } else {
      // Create new category
      const { data: newCategory, error } = await supabase
        .from('restaurant_categories')
        .insert({ name })
        .select('id')
        .single()

      if (newCategory && !error) {
        ids.push(newCategory.id)
        newlyCreated.push(name)
        console.log(`[Map Fields] Created new category: ${name} (${newCategory.id})`)
      } else {
        console.error(`[Map Fields] Failed to create category: ${name}`, error)
      }
    }
  }

  return { ids, newlyCreated }
}

// Helper: Match or create features
async function matchOrCreateFeatures(featureNames: string[]): Promise<{ ids: string[], newlyCreated: string[] }> {
  const ids: string[] = []
  const newlyCreated: string[] = []

  for (const name of featureNames) {
    // Try to find existing feature (case-insensitive)
    const { data: existing } = await supabase
      .from('restaurant_features')
      .select('id')
      .ilike('name', name)
      .single()

    if (existing) {
      ids.push(existing.id)
      console.log(`[Map Fields] Matched existing feature: ${name} (${existing.id})`)
    } else {
      // Create new feature with slug
      const slug = name.replace(/'/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const { data: newFeature, error } = await supabase
        .from('restaurant_features')
        .insert({
          name,
          slug
        })
        .select('id')
        .single()

      if (newFeature && !error) {
        ids.push(newFeature.id)
        newlyCreated.push(name)
        console.log(`[Map Fields] Created new feature: ${name} (${newFeature.id}) with slug: ${slug}`)
      } else {
        console.error(`[Map Fields] Failed to create feature: ${name}`, error)
      }
    }
  }

  return { ids, newlyCreated }
}

// Helper: Match or create neighbourhood
async function matchOrCreateNeighbourhood(
  neighbourhoodName: string | null,
  city: string = 'London'
): Promise<{ id: string | null, created: boolean }> {
  if (!neighbourhoodName) {
    return { id: null, created: false }
  }

  // Try to find existing neighbourhood (case-insensitive)
  const { data: existing } = await supabase
    .from('neighbourhoods')
    .select('id')
    .ilike('name', neighbourhoodName)
    .eq('city', city)
    .single()

  if (existing) {
    console.log(`[Map Fields] Matched existing neighbourhood: ${neighbourhoodName} (${existing.id})`)
    return { id: existing.id, created: false }
  }

  // Create new neighbourhood
  const { data: newNeighbourhood, error } = await supabase
    .from('neighbourhoods')
    .insert({
      name: neighbourhoodName,
      city,
      slug: neighbourhoodName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    })
    .select('id')
    .single()

  if (newNeighbourhood && !error) {
    console.log(`[Map Fields] Created new neighbourhood: ${neighbourhoodName} (${newNeighbourhood.id})`)
    return { id: newNeighbourhood.id, created: true }
  }

  console.error(`[Map Fields] Failed to create neighbourhood: ${neighbourhoodName}`, error)
  return { id: null, created: false }
}

// Helper: Match Michelin award
async function matchMichelinAward(awardName: string | null): Promise<{ id: string | null, stars: number | null }> {
  if (!awardName) {
    return { id: null, stars: null }
  }

  // Try to find existing award (case-insensitive)
  const { data: existing } = await supabase
    .from('michelin_guide_awards')
    .select('id, stars')
    .ilike('name', awardName)
    .single()

  if (existing) {
    console.log(`[Map Fields] Matched Michelin award: ${awardName} (${existing.id}, ${existing.stars} stars)`)
    return { id: existing.id, stars: existing.stars }
  }

  console.warn(`[Map Fields] Michelin award not found: ${awardName}`)
  return { id: null, stars: null }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const restaurantId = params.id
    const body = await request.json()
    const anthropicOutput = body.anthropic_output

    if (!anthropicOutput) {
      return NextResponse.json(
        { error: 'Missing anthropic_output in request body' },
        { status: 400 }
      )
    }

    console.log(`[Map Fields] Starting field mapping for restaurant ID: ${restaurantId}`)

    // Process cuisines
    const cuisinesResult = anthropicOutput.cuisines && anthropicOutput.cuisines.length > 0
      ? await matchOrCreateCuisines(anthropicOutput.cuisines)
      : { ids: [], newlyCreated: [] }

    // Process categories
    const categoriesResult = anthropicOutput.categories && anthropicOutput.categories.length > 0
      ? await matchOrCreateCategories(anthropicOutput.categories)
      : { ids: [], newlyCreated: [] }

    // Process features
    const featuresResult = anthropicOutput.features && anthropicOutput.features.length > 0
      ? await matchOrCreateFeatures(anthropicOutput.features)
      : { ids: [], newlyCreated: [] }

    // Process neighbourhood
    const neighbourhoodResult = await matchOrCreateNeighbourhood(anthropicOutput.neighbourhood)

    // Process Michelin award
    const michelinResult = await matchMichelinAward(anthropicOutput.michelin_guide_award)

    console.log('[Map Fields] Field mapping complete:', {
      cuisines: cuisinesResult.ids.length,
      newCuisines: cuisinesResult.newlyCreated.length,
      categories: categoriesResult.ids.length,
      newCategories: categoriesResult.newlyCreated.length,
      features: featuresResult.ids.length,
      newFeatures: featuresResult.newlyCreated.length,
      neighbourhood: neighbourhoodResult.id ? 'matched/created' : 'null',
      michelin: michelinResult.id ? 'matched' : 'null'
    })

    // Prepare direct fields (fields that go directly to restaurant table)
    const directFields = {
      slug: anthropicOutput.slug,
      phone: anthropicOutput.phone,
      price_range: anthropicOutput.price_range,
      latitude: anthropicOutput.coordinates?.latitude,
      longitude: anthropicOutput.coordinates?.longitude,
      hours: anthropicOutput.hours,
      dress_code: anthropicOutput.dress_code,
      reservations_url: anthropicOutput.reservations_url,
      reservations_required: anthropicOutput.reservations_required,
      best_times_buzzing: anthropicOutput.best_times_buzzing,
      best_times_relaxed: anthropicOutput.best_times_relaxed,
      best_times_with_dogs: anthropicOutput.best_times_with_dogs,
      best_times_description: anthropicOutput.best_times_description,
      getting_there_public: anthropicOutput.getting_there_public,
      getting_there_car: anthropicOutput.getting_there_car,
      nearest_dog_parks: anthropicOutput.nearest_dog_parks,
      public_review_sentiment: anthropicOutput.public_review_sentiment,
      sentiment_score: anthropicOutput.sentiment_score,
      restaurant_awards: anthropicOutput.restaurant_awards,
      accessibility_features: anthropicOutput.accessibility_features,
      social_media_urls: anthropicOutput.social_media_urls,
      about: anthropicOutput.about,
      neighbourhood_id: neighbourhoodResult.id,
      michelin_guide_award_id: michelinResult.id,
      michelin_stars: michelinResult.stars
    }

    // Return mapped data
    return NextResponse.json({
      success: true,
      restaurant_id: restaurantId,
      mapped_data: {
        cuisine_ids: cuisinesResult.ids,
        newly_created_cuisines: cuisinesResult.newlyCreated,
        category_ids: categoriesResult.ids,
        newly_created_categories: categoriesResult.newlyCreated,
        feature_ids: featuresResult.ids,
        newly_created_features: featuresResult.newlyCreated,
        neighbourhood_id: neighbourhoodResult.id,
        neighbourhood_created: neighbourhoodResult.created,
        michelin_award_id: michelinResult.id,
        michelin_stars: michelinResult.stars
      },
      direct_fields: directFields
    })

  } catch (error) {
    console.error('[Map Fields] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to map fields',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
