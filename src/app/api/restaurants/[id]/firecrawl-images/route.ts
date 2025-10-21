import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY!

const openai = new OpenAI({ apiKey: openaiApiKey })

/**
 * GET /api/restaurants/[id]/images
 * Extract image URLs from all available sources
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, address, apify_output, firecrawl_output')
      .eq('id', params.id)
      .single()

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    console.log('=== MULTI-SOURCE IMAGE EXTRACTION ===')
    console.log('Restaurant:', restaurant.name)
    console.log('Restaurant ID:', restaurant.id)

    const allImageUrls: string[] = []

    // Source 1: Apify Google Places images
    const apifyOutput = restaurant.apify_output as any
    const apifyImages = apifyOutput?.imageUrls || []
    console.log(`Source 1 (Apify): ${apifyImages.length} images`)
    allImageUrls.push(...apifyImages)

    // Source 2: Firecrawl scraped images from website/social media
    const firecrawlOutput = restaurant.firecrawl_output as any
    const firecrawlImages: string[] = []

    if (firecrawlOutput?.scrapes) {
      // Extract image URLs from Firecrawl markdown
      Object.entries(firecrawlOutput.scrapes).forEach(([key, scrape]: [string, any]) => {
        if (scrape.markdown) {
          // Match markdown image syntax: ![alt](url)
          const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g
          const matches = scrape.markdown.matchAll(imageRegex)
          for (const match of matches) {
            if (match[1] && !firecrawlImages.includes(match[1])) {
              firecrawlImages.push(match[1])
            }
          }

          // Match HTML img tags: <img src="url">
          const htmlRegex = /<img[^>]+src=["']([^"']+)["']/g
          const htmlMatches = scrape.markdown.matchAll(htmlRegex)
          for (const match of htmlMatches) {
            if (match[1] && !firecrawlImages.includes(match[1])) {
              firecrawlImages.push(match[1])
            }
          }
        }
      })
    }
    console.log(`Source 2 (Firecrawl): ${firecrawlImages.length} images`)
    allImageUrls.push(...firecrawlImages)

    // Deduplicate
    const uniqueImages = [...new Set(allImageUrls)]
    console.log(`Total unique images: ${uniqueImages.length}`)

    console.log('\n=== IMAGE URLS ===')
    uniqueImages.forEach((url, index) => {
      console.log(`Image ${index + 1}: ${url}`)
    })
    console.log('=== END IMAGE URLS ===\n')

    return NextResponse.json({
      success: true,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      total_images: uniqueImages.length,
      sources: {
        apify: apifyImages.length,
        firecrawl: firecrawlImages.length
      },
      image_urls: uniqueImages
    })

  } catch (error) {
    console.error("Image extraction error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/restaurants/[id]/images
 * Process images: download, score with OpenAI Vision, upload to Supabase Storage
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params

  try {
    const body = await request.json()
    const {
      skip_quality_check = false,
      quality_threshold = 7.0,
      max_images = 15
    } = body

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, address, apify_output, firecrawl_output')
      .eq('id', params.id)
      .single()

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    console.log('=== IMAGE PROCESSING PIPELINE ===')
    console.log('Restaurant:', restaurant.name)
    console.log('Quality check:', skip_quality_check ? 'Disabled' : `Enabled (threshold: ${quality_threshold})`)
    console.log('Max images:', max_images)

    // Get all image URLs
    const allImageUrls: string[] = []
    const apifyOutput = restaurant.apify_output as any
    const apifyImages = apifyOutput?.imageUrls || []
    allImageUrls.push(...apifyImages)

    const uniqueImages = [...new Set(allImageUrls)]
    console.log(`Total images to process: ${uniqueImages.length}`)

    if (uniqueImages.length === 0) {
      return NextResponse.json(
        { error: 'No images found for this restaurant' },
        { status: 404 }
      )
    }

    // STAGE 1: Download images to scraped/ folder
    console.log('\n=== STAGE 1: DOWNLOADING IMAGES ===')
    const folderName = restaurant.slug || restaurant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const scrapedPath = `restaurants/${folderName}/scraped`

    const downloadedImages: any[] = []

    for (let i = 0; i < Math.min(uniqueImages.length, max_images + 5); i++) {
      const imageUrl = uniqueImages[i]
      console.log(`Downloading image ${i + 1}...`)

      try {
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          console.error(`Failed to download image ${i + 1}`)
          continue
        }

        const imageBuffer = await imageResponse.arrayBuffer()
        const imageBlob = new Blob([imageBuffer])

        // Determine file extension
        const contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg'
        const fileName = `${String(i + 1).padStart(2, '0')}.${extension}`
        const fullPath = `${scrapedPath}/${fileName}`

        // Upload to scraped/ folder
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('places')
          .upload(fullPath, imageBlob, {
            contentType,
            upsert: true
          })

        if (uploadError) {
          console.error(`Upload error for image ${i + 1}:`, uploadError)
          continue
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('places')
          .getPublicUrl(fullPath)

        downloadedImages.push({
          index: i + 1,
          original_url: imageUrl,
          storage_path: fullPath,
          public_url: publicUrlData.publicUrl,
          file_name: fileName
        })

        console.log(`✓ Downloaded image ${i + 1}`)
      } catch (error) {
        console.error(`Error downloading image ${i + 1}:`, error)
      }
    }

    console.log(`Downloaded ${downloadedImages.length} images to ${scrapedPath}`)

    // STAGE 2: Analyze images with OpenAI Vision API
    console.log('\n=== STAGE 2: ANALYZING IMAGE QUALITY ===')
    const analyzedImages: any[] = []

    for (const image of downloadedImages) {
      if (skip_quality_check) {
        analyzedImages.push({
          ...image,
          quality_score: null,
          quality_notes: 'Quality check skipped'
        })
        continue
      }

      console.log(`Analyzing image ${image.index}...`)

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Evaluate this restaurant image on a scale of 0-10.

AUTOMATIC REJECTIONS (score 0):
- Logos, icons, or brand graphics
- Small images or thumbnails (< 500px width)
- Text-heavy images (menus as images, signs only)
- Screenshots or UI elements
- Low resolution or very blurry images

SCORING CRITERIA (if not rejected):
- Resolution and sharpness (clear, not blurry)
- Lighting and composition (well-lit, good framing)
- Relevance to restaurant (food, interior, exterior, ambiance)
- Professional quality (not amateur/low-quality)
- Shows actual restaurant experience (not stock photos)

Respond ONLY with a JSON object in this exact format:
{"score": 8.5, "notes": "High quality interior shot, excellent lighting and composition", "rejected": false}

Or for rejections:
{"score": 0, "notes": "Logo/icon image, not suitable", "rejected": true}`
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image.public_url
                  }
                }
              ]
            }
          ],
          max_tokens: 150
        })

        const content = response.choices[0].message.content || '{}'
        const analysis = JSON.parse(content)

        analyzedImages.push({
          ...image,
          quality_score: analysis.score,
          quality_notes: analysis.notes
        })

        console.log(`✓ Image ${image.index}: Score ${analysis.score}/10`)
      } catch (error) {
        console.error(`Error analyzing image ${image.index}:`, error)
        analyzedImages.push({
          ...image,
          quality_score: 0,
          quality_notes: 'Analysis failed'
        })
      }
    }

    // STAGE 3: Select high-quality images and move to selected/ folder
    console.log('\n=== STAGE 3: SELECTING HIGH-QUALITY IMAGES ===')
    const selectedImages = analyzedImages
      .filter(img => skip_quality_check || (img.quality_score && img.quality_score >= quality_threshold))
      .sort((a, b) => (b.quality_score || 0) - (a.quality_score || 0))
      .slice(0, max_images)

    console.log(`Selected ${selectedImages.length} images with score >= ${quality_threshold}`)

    const selectedPath = `restaurants/${folderName}/selected`
    const finalImages: any[] = []

    for (let i = 0; i < selectedImages.length; i++) {
      const image = selectedImages[i]
      const newFileName = `${String(i + 1).padStart(2, '0')}.${image.file_name.split('.')[1]}`
      const newPath = `${selectedPath}/${newFileName}`

      console.log(`Moving image ${image.index} to selected folder...`)

      try {
        // Copy from scraped to selected
        const { data: downloadData } = await supabase.storage
          .from('places')
          .download(image.storage_path)

        if (downloadData) {
          const { error: uploadError } = await supabase.storage
            .from('places')
            .upload(newPath, downloadData, {
              contentType: downloadData.type,
              upsert: true
            })

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('places')
              .getPublicUrl(newPath)

            finalImages.push({
              url: publicUrlData.publicUrl,
              photo_type: i === 0 ? 'hero' : 'gallery',
              caption: '',
              alt_text: `${restaurant.name} - Image ${i + 1}`,
              display_order: i + 1,
              quality_score: image.quality_score,
              quality_notes: image.quality_notes
            })

            console.log(`✓ Moved to ${newPath}`)
          }
        }
      } catch (error) {
        console.error(`Error moving image ${image.index}:`, error)
      }
    }

    // STAGE 4: Update restaurant record with selected photos
    console.log('\n=== STAGE 4: UPDATING DATABASE ===')
    const photosForDb = finalImages.map(img => ({
      url: img.url,
      photo_type: img.photo_type,
      caption: img.caption,
      alt_text: img.alt_text,
      display_order: img.display_order
    }))

    const { error: updateError } = await supabase
      .from('restaurants')
      .update({ photos: photosForDb })
      .eq('id', params.id)

    if (updateError) {
      console.error('Failed to update restaurant photos:', updateError)
    } else {
      console.log(`✓ Updated restaurant record with ${photosForDb.length} photos`)
    }

    console.log('\n=== PIPELINE COMPLETE ===')

    return NextResponse.json({
      success: true,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      pipeline_stats: {
        total_found: uniqueImages.length,
        downloaded: downloadedImages.length,
        analyzed: analyzedImages.length,
        selected: finalImages.length
      },
      storage_paths: {
        scraped: scrapedPath,
        selected: selectedPath
      },
      selected_images: finalImages
    })

  } catch (error) {
    console.error("Image processing error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
