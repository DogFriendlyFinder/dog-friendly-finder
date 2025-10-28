import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const restaurantId = params.id
    const body = await request.json()
    const { mapped_data, direct_fields } = body

    if (!mapped_data || !direct_fields) {
      return NextResponse.json(
        { error: 'Missing mapped_data or direct_fields in request body' },
        { status: 400 }
      )
    }

    console.log(`[Upload to Database] Starting upload for restaurant ID: ${restaurantId}`)

    // STEP 1: Update restaurant record with all direct fields
    console.log('[Upload to Database] Updating restaurant record...')

    const restaurantUpdate = {
      slug: direct_fields.slug,
      phone: direct_fields.phone,
      price_range: direct_fields.price_range,
      latitude: direct_fields.latitude,
      longitude: direct_fields.longitude,
      hours: direct_fields.hours,
      dress_code: direct_fields.dress_code,
      reservations_url: direct_fields.reservations_url,
      reservations_required: direct_fields.reservations_required,
      best_times_buzzing: direct_fields.best_times_buzzing,
      best_times_relaxed: direct_fields.best_times_relaxed,
      best_times_with_dogs: direct_fields.best_times_with_dogs,
      best_times_description: direct_fields.best_times_description,
      getting_there_public: direct_fields.getting_there_public,
      getting_there_car: direct_fields.getting_there_car,
      nearest_dog_parks: direct_fields.nearest_dog_parks,
      public_review_sentiment: direct_fields.public_review_sentiment,
      sentiment_score: direct_fields.sentiment_score,
      restaurant_awards: direct_fields.restaurant_awards,
      accessibility_features: direct_fields.accessibility_features,
      social_media_urls: direct_fields.social_media_urls,
      about: direct_fields.about,
      neighbourhood_id: direct_fields.neighbourhood_id,
      michelin_guide_award_id: direct_fields.michelin_award_id,
      michelin_stars: direct_fields.michelin_stars,
      published: true, // Mark as published
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('restaurants')
      .update(restaurantUpdate)
      .eq('id', restaurantId)

    if (updateError) {
      console.error('[Upload to Database] Failed to update restaurant:', updateError)
      return NextResponse.json(
        { error: 'Failed to update restaurant record', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Upload to Database] Restaurant record updated successfully')

    // Note: Coordinates column (if present) should be populated by database triggers or computed column
    // Latitude and longitude are already stored separately above

    // STEP 2: Delete existing junction table links
    console.log('[Upload to Database] Deleting existing junction table links...')

    const { error: deleteCuisinesError } = await supabase
      .from('restaurant_cuisine_links')
      .delete()
      .eq('restaurant_id', restaurantId)

    const { error: deleteCategoriesError } = await supabase
      .from('restaurant_category_links')
      .delete()
      .eq('restaurant_id', restaurantId)

    const { error: deleteFeaturesError } = await supabase
      .from('restaurant_feature_links')
      .delete()
      .eq('restaurant_id', restaurantId)

    if (deleteCuisinesError || deleteCategoriesError || deleteFeaturesError) {
      console.error('[Upload to Database] Failed to delete junction links:', {
        deleteCuisinesError,
        deleteCategoriesError,
        deleteFeaturesError
      })
      // Continue anyway - we'll still insert new links
    } else {
      console.log('[Upload to Database] Existing junction links deleted')
    }

    // STEP 3: Create new junction table links
    let cuisineLinksCreated = 0
    let categoryLinksCreated = 0
    let featureLinksCreated = 0

    // Insert cuisine links
    if (mapped_data.cuisine_ids && mapped_data.cuisine_ids.length > 0) {
      const cuisineLinks = mapped_data.cuisine_ids.map((cuisineId: string) => ({
        restaurant_id: restaurantId,
        cuisine_id: cuisineId
      }))

      const { error: insertCuisinesError } = await supabase
        .from('restaurant_cuisine_links')
        .insert(cuisineLinks)

      if (insertCuisinesError) {
        console.error('[Upload to Database] Failed to insert cuisine links:', insertCuisinesError)
      } else {
        cuisineLinksCreated = cuisineLinks.length
        console.log(`[Upload to Database] Created ${cuisineLinksCreated} cuisine links`)
      }
    }

    // Insert category links
    if (mapped_data.category_ids && mapped_data.category_ids.length > 0) {
      const categoryLinks = mapped_data.category_ids.map((categoryId: string) => ({
        restaurant_id: restaurantId,
        category_id: categoryId
      }))

      const { error: insertCategoriesError } = await supabase
        .from('restaurant_category_links')
        .insert(categoryLinks)

      if (insertCategoriesError) {
        console.error('[Upload to Database] Failed to insert category links:', insertCategoriesError)
      } else {
        categoryLinksCreated = categoryLinks.length
        console.log(`[Upload to Database] Created ${categoryLinksCreated} category links`)
      }
    }

    // Insert feature links
    if (mapped_data.feature_ids && mapped_data.feature_ids.length > 0) {
      const featureLinks = mapped_data.feature_ids.map((featureId: string) => ({
        restaurant_id: restaurantId,
        feature_id: featureId
      }))

      const { error: insertFeaturesError } = await supabase
        .from('restaurant_feature_links')
        .insert(featureLinks)

      if (insertFeaturesError) {
        console.error('[Upload to Database] Failed to insert feature links:', insertFeaturesError)
      } else {
        featureLinksCreated = featureLinks.length
        console.log(`[Upload to Database] Created ${featureLinksCreated} feature links`)
      }
    }

    console.log('[Upload to Database] Upload complete:', {
      restaurantId,
      cuisineLinks: cuisineLinksCreated,
      categoryLinks: categoryLinksCreated,
      featureLinks: featureLinksCreated,
      published: true
    })

    // Return success response
    return NextResponse.json({
      success: true,
      restaurant_id: restaurantId,
      updated_fields: Object.keys(restaurantUpdate),
      links_created: {
        cuisines: cuisineLinksCreated,
        categories: categoryLinksCreated,
        features: featureLinksCreated
      }
    })

  } catch (error) {
    console.error('[Upload to Database] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to upload to database',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
