import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
// Use service role key for storage uploads (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const anthropicApiKey = process.env.ANTHROPIC_API_KEY!

interface ImageAnalysisOutput {
  category: 'interior' | 'food' | 'exterior' | 'ambiance'
  descriptor: string
  altText: string
  title: string
  caption: string
  aiDescription: string
  isDogFriendlyRelevant: boolean
  dogAmenityType: string | null
  confidence: number
}

/**
 * POST /api/restaurants/[id]/images/upload
 *
 * Complete image processing pipeline:
 * 1. Get restaurant data (extract neighborhood if missing)
 * 2. Extract images using apify-images endpoint
 * 3. Download each image to memory
 * 4. Analyze with Claude Vision API
 * 5. Generate SEO-optimized filename
 * 6. Upload to Supabase Storage
 * 7. Save metadata to images table
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params
  const restaurantId = params.id

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('=== IMAGE UPLOAD PIPELINE START ===')
    console.log('Restaurant ID:', restaurantId)

    // STEP 1: Get restaurant data
    console.log('\n--- STEP 1: FETCHING RESTAURANT DATA ---')
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id, name, slug, address, city, neighborhood, website, apify_output')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    console.log('Restaurant:', restaurant.name)
    console.log('Slug:', restaurant.slug)
    console.log('City:', restaurant.city)
    console.log('Neighborhood (before):', restaurant.neighborhood)

    // Extract neighborhood from apify_output if missing
    let neighborhood = restaurant.neighborhood

    if (!neighborhood && restaurant.apify_output) {
      console.log('\n--- EXTRACTING NEIGHBORHOOD FROM APIFY DATA ---')
      const apifyData = restaurant.apify_output as any

      neighborhood =
        apifyData.neighborhood ||
        apifyData.sublocality ||
        apifyData.location?.neighborhood ||
        apifyData.addressComponents?.find((c: any) => c.types?.includes('sublocality'))?.longText ||
        apifyData.addressComponents?.find((c: any) => c.types?.includes('neighborhood'))?.longText ||
        null

      console.log('Extracted neighborhood:', neighborhood)

      // Update restaurant with extracted neighborhood
      if (neighborhood) {
        const { error: updateError } = await supabase
          .from('restaurants')
          .update({ neighborhood })
          .eq('id', restaurantId)

        if (!updateError) {
          console.log('✓ Updated restaurant with neighborhood:', neighborhood)
        }
      }
    }

    if (!neighborhood) {
      console.warn('⚠️  Warning: No neighborhood found, using city as fallback')
      neighborhood = restaurant.city
    }

    // Prepare location strings
    // Avoid duplication if neighborhood equals city
    const location = neighborhood === restaurant.city
      ? restaurant.city
      : `${neighborhood}, ${restaurant.city}`

    const locationSlug = neighborhood === restaurant.city
      ? slugify(restaurant.city)
      : `${slugify(neighborhood)}-${slugify(restaurant.city)}`

    const folderPath = `${restaurant.slug}_${locationSlug}`

    console.log('Location:', location)
    console.log('Location slug:', locationSlug)
    console.log('Folder path:', folderPath)

    // STEP 2: Extract images using apify-images endpoint
    console.log('\n--- STEP 2: EXTRACTING IMAGES ---')

    const extractResponse = await fetch(
      `${request.nextUrl.origin}/api/restaurants/${restaurantId}/apify-images`,
      { method: 'POST' }
    )

    if (!extractResponse.ok) {
      throw new Error('Failed to extract images')
    }

    const extractData = await extractResponse.json()
    const images = extractData.images || []

    console.log(`Found ${images.length} images to process`)

    if (images.length === 0) {
      return NextResponse.json(
        { error: 'No images found' },
        { status: 404 }
      )
    }

    // STEP 3-7: Process each image (max 15)
    const maxImages = Math.min(images.length, 15)
    const uploadedImages = []
    const errors = []

    for (let i = 0; i < maxImages; i++) {
      const image = images[i]
      console.log(`\n--- PROCESSING IMAGE ${i + 1}/${maxImages} ---`)
      console.log('URL:', image.imageUrl)
      console.log('Source:', image.source)
      console.log('Score:', image.score)

      try {
        // STEP 3: Download image to memory
        console.log('Downloading image...')
        const imageResponse = await fetch(image.imageUrl)

        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.statusText}`)
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        const imageSizeKB = Math.round(imageBuffer.byteLength / 1024)
        console.log(`✓ Downloaded (${imageSizeKB} KB)`)

        // Detect media type from buffer
        const mediaType = detectMediaType(imageBuffer, image.imageUrl)
        console.log('Detected media type:', mediaType)

        // STEP 4: Analyze with Claude Vision API
        console.log('Analyzing with Claude Vision API...')
        const analysis = await analyzeImageWithClaude({
          imageBuffer,
          mediaType,
          restaurantName: restaurant.name,
          location,
          originalTitle: image.title || '',
          originalSource: image.origin || ''
        })

        console.log('✓ AI Analysis complete')
        console.log('  Category:', analysis.category)
        console.log('  Descriptor:', analysis.descriptor)
        console.log('  Dog-friendly:', analysis.isDogFriendlyRelevant)
        console.log('  Confidence:', analysis.confidence + '%')

        // STEP 5: Generate SEO-optimized filename
        const filename = generateSEOFilename({
          slug: restaurant.slug,
          locationSlug,
          descriptor: analysis.descriptor,
          index: i
        })

        console.log('✓ Generated filename:', filename)

        // STEP 6: Upload to Supabase Storage
        console.log('Uploading to storage...')
        const storagePath = `restaurants/${folderPath}/images/${filename}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('places')
          .upload(storagePath, imageBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          })

        if (uploadError) {
          throw new Error(`Storage upload failed: ${uploadError.message}`)
        }

        console.log('✓ Uploaded to:', storagePath)

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('places')
          .getPublicUrl(storagePath)

        console.log('✓ Public URL:', publicUrl)

        // STEP 7: Save metadata to images table
        console.log('Saving metadata to database...')
        const { data: dbData, error: dbError } = await supabase
          .from('images')
          .insert({
            place_type: 'restaurant',
            place_id: restaurantId,
            storage_path: storagePath,
            public_url: publicUrl,
            original_url: image.imageUrl,
            filename,
            alt_text: analysis.altText,
            title: analysis.title,
            caption: analysis.caption,
            category: analysis.category,
            descriptor: analysis.descriptor,
            ai_description: analysis.aiDescription,
            is_dog_friendly_relevant: analysis.isDogFriendlyRelevant,
            dog_amenity_type: analysis.dogAmenityType,
            source: image.source,
            quality_score: image.score,
            width: parseInt(image.imageWidth || '0'),
            height: parseInt(image.imageHeight || '0'),
            is_primary: i === 0,
            display_order: i
          })
          .select()
          .single()

        if (dbError) {
          throw new Error(`Database insert failed: ${dbError.message}`)
        }

        console.log('✓ Saved to database')

        uploadedImages.push(dbData)

      } catch (error) {
        console.error(`✗ Error processing image ${i + 1}:`, error)
        errors.push({
          index: i,
          url: image.imageUrl,
          error: error instanceof Error ? error.message : String(error)
        })
        // Continue with next image
      }
    }

    console.log('\n=== UPLOAD PIPELINE COMPLETE ===')
    console.log(`Successfully uploaded: ${uploadedImages.length}/${maxImages}`)
    console.log(`Errors: ${errors.length}`)

    // STEP 8: Update photos JSON field in restaurants table
    console.log('\n--- STEP 8: UPDATING PHOTOS JSON FIELD ---')

    if (uploadedImages.length > 0) {
      const photosData = uploadedImages.map(img => ({
        id: img.id,
        storage_path: img.storage_path,
        public_url: img.public_url,
        filename: img.filename,
        alt_text: img.alt_text,
        title: img.title,
        caption: img.caption,
        category: img.category,
        descriptor: img.descriptor,
        is_primary: img.is_primary,
        display_order: img.display_order,
        width: img.width,
        height: img.height,
        quality_score: img.quality_score
      }))

      const { error: photosUpdateError } = await supabase
        .from('restaurants')
        .update({ photos: photosData })
        .eq('id', restaurantId)

      if (photosUpdateError) {
        console.error('⚠️  Failed to update photos JSON field:', photosUpdateError)
      } else {
        console.log(`✓ Updated photos JSON field with ${photosData.length} images`)
      }
    }

    return NextResponse.json({
      success: true,
      restaurant_id: restaurantId,
      restaurant_name: restaurant.name,
      location,
      folder_path: folderPath,
      total_processed: maxImages,
      uploaded_count: uploadedImages.length,
      error_count: errors.length,
      images: uploadedImages,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Upload pipeline error:', error)
    return NextResponse.json(
      {
        error: 'Upload pipeline failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * Detect media type from image buffer
 */
function detectMediaType(buffer: ArrayBuffer, url: string): string {
  const bytes = new Uint8Array(buffer.slice(0, 12))

  // Check magic numbers
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png'
  }

  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg'
  }

  // WebP: RIFF .... WEBP
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return 'image/webp'
  }

  // GIF: 47 49 46
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif'
  }

  // Fallback to URL extension
  const ext = url.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/)?.[1]
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg'
  if (ext === 'png') return 'image/png'
  if (ext === 'webp') return 'image/webp'
  if (ext === 'gif') return 'image/gif'

  // Default to JPEG
  return 'image/jpeg'
}

/**
 * Analyze image with Claude Vision API
 */
async function analyzeImageWithClaude(input: {
  imageBuffer: ArrayBuffer
  mediaType: string
  restaurantName: string
  location: string
  originalTitle: string
  originalSource: string
}): Promise<ImageAnalysisOutput> {
  const anthropic = new Anthropic({ apiKey: anthropicApiKey })

  // Convert ArrayBuffer to base64
  const base64Image = Buffer.from(input.imageBuffer).toString('base64')

  const prompt = `You are an expert at analyzing restaurant images for SEO optimization.

Restaurant: ${input.restaurantName}
Location: ${input.location}
Original Title: ${input.originalTitle}
Source: ${input.originalSource}

Analyze this image and provide:

1. CATEGORY: Choose one:
   - interior (dining room, bar area, seating, decor)
   - food (dishes, menu items, presentation)
   - exterior (building facade, entrance, signage, outdoor seating)
   - ambiance (table settings, lighting, atmosphere)

2. DESCRIPTOR: A specific kebab-case descriptor (e.g., 'dining-room', 'signature-duck-dish', 'front-facade', 'bar-area', 'outdoor-terrace')

3. ALT TEXT: SEO-optimized alt text following this pattern:
   "{Descriptor} at {Restaurant Name}, {Location}"
   Example: "Elegant dining room at The Duck & Rice, Soho, London"

4. TITLE: SEO-optimized title attribute:
   "{Restaurant Name} - {Descriptor} | Dog Friendly Finder"
   Example: "The Duck & Rice - Interior Dining Room | Dog Friendly Finder"

5. CAPTION: Short user-facing caption (1-2 sentences)
   Example: "The beautifully restored Victorian interior features original tilework and cozy booth seating."

6. AI DESCRIPTION: Full analysis (2-3 sentences describing what you see)

7. DOG-FRIENDLY RELEVANCE:
   - Is this image relevant to dog owners? (shows outdoor seating, dog bowls, dogs visible, spacious floor area, etc.)
   - If yes, what amenity type? Choose: 'outdoor-seating', 'water-bowl', 'dog-menu', 'spacious-interior', or null

Return ONLY valid JSON with this structure:
{
  "category": "interior",
  "descriptor": "dining-room",
  "altText": "Elegant dining room at The Duck & Rice, Soho, London",
  "title": "The Duck & Rice - Interior Dining Room | Dog Friendly Finder",
  "caption": "The beautifully restored Victorian interior features original tilework and cozy booth seating.",
  "aiDescription": "The image shows a traditional pub interior with dark wood paneling, Victorian-era tile work, and intimate booth seating. The space has warm lighting and a cozy, historic atmosphere.",
  "isDogFriendlyRelevant": false,
  "dogAmenityType": null,
  "confidence": 95
}`

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: input.mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64Image
          }
        },
        {
          type: 'text',
          text: prompt
        }
      ]
    }]
  })

  const responseText = message.content[0].type === 'text'
    ? message.content[0].text
    : ''

  return JSON.parse(responseText)
}

/**
 * Generate SEO-optimized filename
 */
function generateSEOFilename(params: {
  slug: string
  locationSlug: string
  descriptor: string
  index: number
}): string {
  const { slug, locationSlug, descriptor, index } = params
  return `${slug}_${locationSlug}_${descriptor}_${String(index + 1).padStart(2, '0')}.jpg`
}

/**
 * Convert string to slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}
