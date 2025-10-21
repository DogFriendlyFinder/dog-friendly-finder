import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY!

/**
 * POST /api/restaurants/[id]/images/extract
 * Extract images from multiple sources with smart URL pattern recognition
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, address, website, apify_output, firecrawl_output')
      .eq('id', params.id)
      .single()

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    console.log('=== SMART IMAGE EXTRACTION ===')
    console.log('Restaurant:', restaurant.name)
    console.log('Website:', restaurant.website || 'Not available')

    const allImageUrls: any[] = []

    // STEP 1: Scrape restaurant website for images (PRIMARY SOURCE)
    if (restaurant.website) {
      console.log('\n--- SCRAPING RESTAURANT WEBSITE ---')

      try {
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firecrawlApiKey}`
          },
          body: JSON.stringify({
            url: restaurant.website,
            formats: ['markdown', 'html'],
            onlyMainContent: false, // Get all images including headers/footers
            waitFor: 3000
          })
        })

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json()
          const markdown = scrapeData.data?.markdown || ''
          const html = scrapeData.data?.html || ''

          // Extract image URLs from markdown and HTML
          const websiteImages: string[] = []

          // Markdown images: ![alt](url)
          const markdownRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g
          for (const match of markdown.matchAll(markdownRegex)) {
            websiteImages.push(match[1])
          }

          // HTML img tags: <img src="url">
          const htmlRegex = /<img[^>]+src=["']([^"']+)["']/g
          for (const match of html.matchAll(htmlRegex)) {
            let url = match[1]
            // Handle relative URLs
            if (url.startsWith('/')) {
              const baseUrl = new URL(restaurant.website)
              url = `${baseUrl.protocol}//${baseUrl.host}${url}`
            }
            websiteImages.push(url)
          }

          console.log(`Found ${websiteImages.length} images on website`)

          // Analyze and score each URL
          websiteImages.forEach(url => {
            const score = analyzeImageUrl(url, 'website')
            if (score.isValid) {
              allImageUrls.push({
                url,
                source: 'website',
                score: score.score,
                reason: score.reason,
                quality: score.quality,
                fileType: score.fileType
              })
            }
          })
        }
      } catch (error) {
        console.error('Error scraping website:', error)
      }
    }

    // STEP 2: Extract from Firecrawl social media scrapes (SECONDARY SOURCE)
    console.log('\n--- EXTRACTING FROM SOCIAL MEDIA ---')
    const firecrawlOutput = restaurant.firecrawl_output as any
    if (firecrawlOutput?.scrapes) {
      const socialScrapes = ['social_instagram', 'social_facebook']

      socialScrapes.forEach(key => {
        const scrape = firecrawlOutput.scrapes[key]
        if (scrape?.markdown) {
          const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g
          for (const match of scrape.markdown.matchAll(imageRegex)) {
            const url = match[1]
            const score = analyzeImageUrl(url, key.replace('social_', ''))
            if (score.isValid) {
              allImageUrls.push({
                url,
                source: key.replace('social_', ''),
                score: score.score,
                reason: score.reason,
                quality: score.quality,
                fileType: score.fileType
              })
            }
          }
        }
      })
    }

    // STEP 3: Review sites (TERTIARY SOURCE)
    console.log('\n--- EXTRACTING FROM REVIEW SITES ---')
    if (firecrawlOutput?.scrapes) {
      const reviewScrapes = ['review_tripadvisor', 'review_opentable']

      reviewScrapes.forEach(key => {
        const scrape = firecrawlOutput.scrapes[key]
        if (scrape?.markdown) {
          const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g
          for (const match of scrape.markdown.matchAll(imageRegex)) {
            const url = match[1]
            const score = analyzeImageUrl(url, key.replace('review_', ''))
            if (score.isValid) {
              allImageUrls.push({
                url,
                source: key.replace('review_', ''),
                score: score.score,
                reason: score.reason,
                quality: score.quality,
                fileType: score.fileType
              })
            }
          }
        }
      })
    }

    // STEP 4: Google Places (LAST RESORT)
    console.log('\n--- EXTRACTING FROM GOOGLE PLACES ---')
    const apifyOutput = restaurant.apify_output as any
    const googleImages = apifyOutput?.imageUrls || []
    googleImages.forEach((url: string) => {
      const score = analyzeImageUrl(url, 'google_places')
      if (score.isValid) {
        allImageUrls.push({
          url,
          source: 'google_places',
          score: score.score,
          reason: score.reason,
          quality: score.quality,
          fileType: score.fileType
        })
      }
    })

    // STEP 5: Deduplicate and sort by score
    const uniqueImages = deduplicateImages(allImageUrls)
    const sortedImages = uniqueImages.sort((a, b) => b.score - a.score)

    console.log('\n=== EXTRACTION SUMMARY ===')
    console.log(`Total images found: ${allImageUrls.length}`)
    console.log(`After deduplication: ${uniqueImages.length}`)
    console.log(`\nBy source:`)
    const bySource = uniqueImages.reduce((acc: any, img) => {
      acc[img.source] = (acc[img.source] || 0) + 1
      return acc
    }, {})
    Object.entries(bySource).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`)
    })

    console.log(`\nBy quality:`)
    const byQuality = uniqueImages.reduce((acc: any, img) => {
      acc[img.quality] = (acc[img.quality] || 0) + 1
      return acc
    }, {})
    Object.entries(byQuality).forEach(([quality, count]) => {
      console.log(`  ${quality}: ${count}`)
    })

    return NextResponse.json({
      success: true,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      total_found: allImageUrls.length,
      unique_images: uniqueImages.length,
      images: sortedImages,
      summary: {
        by_source: bySource,
        by_quality: byQuality
      }
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
 * Analyze image URL quality and validity
 */
function analyzeImageUrl(url: string, source: string) {
  const result = {
    isValid: true,
    score: 50,
    reason: '',
    quality: 'medium' as 'high' | 'medium' | 'low',
    fileType: '' as string
  }

  const urlLower = url.toLowerCase()
  const filename = urlLower.split('/').pop() || ''

  // EXCLUSIONS (invalid images)

  // 1. SVGs, badges, icons, logos
  if (urlLower.endsWith('.svg') ||
      urlLower.includes('/badge') ||
      urlLower.includes('/icon') ||
      urlLower.includes('logo') ||
      urlLower.includes('award') ||
      urlLower.includes('diners-choice') ||
      urlLower.includes('qr-') ||
      filename.includes('qr')) {
    result.isValid = false
    result.reason = 'SVG/badge/icon/logo'
    return result
  }

  // 2. Landing page redirects
  if (urlLower.includes('redirect') || urlLower.includes('landing')) {
    result.isValid = false
    result.reason = 'Redirect/landing page'
    return result
  }

  // 3. Transparent/placeholder images
  if (urlLower.includes('transparent') ||
      urlLower.includes('placeholder') ||
      urlLower.includes('blank') ||
      filename.startsWith('dec0') || // Decorative elements
      filename.startsWith('dec1')) {
    result.isValid = false
    result.reason = 'Transparent/placeholder/decorative'
    return result
  }

  // 4. Small dimension indicators in filename
  const sizeMatch = filename.match(/(\d+)x(\d+)/)
  if (sizeMatch) {
    const width = parseInt(sizeMatch[1])
    const height = parseInt(sizeMatch[2])
    if (width < 600 || height < 400) {
      result.isValid = false
      result.reason = `Small dimensions: ${width}x${height}`
      return result
    }
  }

  // 5. Thumbnails and small images keywords
  if (urlLower.includes('thumb') ||
      urlLower.includes('_small') ||
      urlLower.includes('_tiny') ||
      urlLower.includes('-150x') ||
      urlLower.includes('-300x')) {
    result.isValid = false
    result.reason = 'Thumbnail/small image'
    return result
  }

  // 6. Dynamic optimization URLs without proper file extensions
  if (!urlLower.match(/\.(jpg|jpeg|png|webp|gif)($|\?|#)/i)) {
    // Allow if it's from a known CDN that doesn't use extensions
    if (!urlLower.includes('googleusercontent.com') &&
        !urlLower.includes('cloudinary.com') &&
        !urlLower.includes('imgix.net') &&
        !urlLower.includes('cdninstagram.com')) {
      result.isValid = false
      result.reason = 'No proper file extension'
      return result
    }
  }

  // QUALITY SCORING & FILE TYPE DETECTION

  // Detect file type
  if (urlLower.match(/\.jpe?g($|\?|#)/i)) {
    result.fileType = 'JPG'
    result.score += 5 // Best for restaurant photos
  } else if (urlLower.match(/\.webp($|\?|#)/i)) {
    result.fileType = 'WebP'
    result.score += 3
  } else if (urlLower.match(/\.png($|\?|#)/i)) {
    result.fileType = 'PNG'
    result.score += 2
  } else {
    result.fileType = 'Unknown'
  }

  // Source priority
  if (source === 'website') {
    result.score += 30 // Highest priority: restaurant's own website
    result.quality = 'high'
  } else if (source === 'instagram' || source === 'facebook') {
    result.score += 15 // Good quality from social media
    result.quality = 'medium'
  } else if (source === 'tripadvisor' || source === 'opentable') {
    result.score += 10 // Decent quality from review sites
    result.quality = 'medium'
  } else if (source === 'google_places') {
    result.score += 5 // Last resort
    result.quality = 'medium'
  }

  // Restaurant CDN patterns (very high quality)
  if (urlLower.includes('/wp-content/uploads/') ||
      urlLower.includes('uploads/content') ||
      urlLower.includes('/media/') ||
      urlLower.includes('cloudinary.com') ||
      urlLower.includes('imgix.net')) {
    result.score += 20
    result.quality = 'high'
    result.reason = result.reason || 'Professional CDN'
  }

  // High resolution indicators in URL
  if (urlLower.includes('1920') ||
      urlLower.includes('2048') ||
      urlLower.includes('2560') ||
      urlLower.includes('w1920') ||
      urlLower.includes('large') ||
      urlLower.includes('original') ||
      urlLower.includes('full')) {
    result.score += 15
    result.quality = 'high'
  }

  // Penalize questionable dynamic image URLs
  if (urlLower.includes('?') && urlLower.split('?')[1].length > 100) {
    result.score -= 5 // Long query strings often indicate tracking/optimization
  }

  return result
}

/**
 * Deduplicate images based on URL similarity
 */
function deduplicateImages(images: any[]) {
  const seen = new Set<string>()
  const unique: any[] = []

  images.forEach(img => {
    // Normalize URL for comparison (remove query params for dedup)
    const normalizedUrl = img.url.split('?')[0].split('#')[0]

    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl)
      unique.push(img)
    }
  })

  return unique
}
