import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Helper: Match or create cuisines
async function matchOrCreateCuisines(cuisineNames: string[], restaurantId: string) {
  const cuisineIds: string[] = []
  const newlyCreated: string[] = []

  for (const name of cuisineNames) {
    try {
      // Try exact match (case-insensitive)
      const { data: existing } = await supabase
        .from('restaurant_cuisines')
        .select('id, name')
        .ilike('name', name)
        .single()

      if (existing) {
        console.log(`[Cuisines] Matched existing: ${existing.name}`)
        cuisineIds.push(existing.id)
      } else {
        // Create new cuisine
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        console.log(`[Cuisines] Creating new cuisine: ${name}`)

        const { data: newCuisine, error: createError } = await supabase
          .from('restaurant_cuisines')
          .insert({
            name: name,
            slug: slug,
            meta_title: `${name} Restaurants | Dog Friendly Finder`,
            meta_description: `Discover dog-friendly ${name} restaurants across the UK.`
          })
          .select('id')
          .single()

        if (createError) {
          console.error(`[Cuisines] Failed to create "${name}":`, createError)
          // Skip this cuisine on error
          continue
        }

        if (newCuisine) {
          cuisineIds.push(newCuisine.id)
          newlyCreated.push(name)
        }
      }
    } catch (error) {
      console.error(`[Cuisines] Error processing "${name}":`, error)
      // Skip this cuisine on error
      continue
    }
  }

  return { cuisineIds, newlyCreated }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    const cuisinesList = availableCuisines?.map(c => c.name).join(', ') || 'No cuisines available'
    console.log(`[Generate Content] Available cuisines: ${cuisinesList.substring(0, 100)}...`)

    // Construct the prompt
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

TASK: Generate structured content for this restaurant.

OUTPUT FORMAT (JSON):
{
  "slug": "string (URL-friendly identifier)",
  "about": "string (200-300 words)",
  "cuisines": ["string", "string"]
}

FIELD-SPECIFIC RULES:

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

GLOBAL RULES:
1. Use ONLY data from provided sources (no fabrication)
2. For missing data, use null or empty arrays
3. Use natural, conversational language for "about" (avoid AI clichés like "nestled", "culinary journey", "delightful")
4. Be specific and concrete
5. For cuisines: PREFER existing names from list, use EXACT case

OUTPUT: Valid JSON matching the schema above. Return ONLY the JSON, no markdown formatting, no code blocks.`

    console.log('[Generate Content] Calling Anthropic API...')

    // Call Anthropic
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
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
        cuisines: generatedContent.cuisines
      })
    } catch (parseError) {
      console.error('[Generate Content] Failed to parse JSON:', parseError)
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', details: responseText.substring(0, 500) },
        { status: 500 }
      )
    }

    // Process cuisines (match or create)
    let cuisineIds: string[] = []
    let newlyCreatedCuisines: string[] = []

    if (generatedContent.cuisines && Array.isArray(generatedContent.cuisines) && generatedContent.cuisines.length > 0) {
      console.log('[Generate Content] Processing cuisines:', generatedContent.cuisines)
      const cuisineResult = await matchOrCreateCuisines(generatedContent.cuisines, restaurantId)
      cuisineIds = cuisineResult.cuisineIds
      newlyCreatedCuisines = cuisineResult.newlyCreated
    }

    // Create cuisine links if we have any
    if (cuisineIds.length > 0) {
      console.log(`[Generate Content] Creating ${cuisineIds.length} cuisine links...`)

      // First, delete existing links to avoid duplicates
      await supabase
        .from('restaurant_cuisine_links')
        .delete()
        .eq('restaurant_id', restaurantId)

      // Insert new links
      const { error: linksError } = await supabase
        .from('restaurant_cuisine_links')
        .insert(
          cuisineIds.map(cuisineId => ({
            restaurant_id: restaurantId,
            cuisine_id: cuisineId
          }))
        )

      if (linksError) {
        console.error('[Generate Content] Failed to create cuisine links:', linksError)
        // Continue anyway - skip on error
      } else {
        console.log('[Generate Content] Cuisine links created successfully')
      }
    }

    // Update restaurant record with slug and about
    console.log('[Generate Content] Updating restaurant record...')
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        slug: generatedContent.slug,
        about: generatedContent.about,
        updated_at: new Date().toISOString()
      })
      .eq('id', restaurantId)

    if (updateError) {
      console.error('[Generate Content] Failed to update restaurant:', updateError)
      return NextResponse.json(
        { error: 'Failed to update restaurant', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Generate Content] Restaurant updated successfully')

    // Return the result
    return NextResponse.json({
      success: true,
      restaurant_id: restaurantId,
      restaurant_name: restaurant.name,
      generated_content: {
        slug: generatedContent.slug,
        about: generatedContent.about,
        cuisines: generatedContent.cuisines
      },
      processing_summary: {
        cuisines_linked: cuisineIds.length,
        newly_created_cuisines: newlyCreatedCuisines
      },
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
