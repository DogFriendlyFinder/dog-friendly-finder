import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const apifyApiKey = process.env.APIFY_API_KEY!

/**
 * POST /api/restaurants/[id]/apify-images
 * Extract images using Apify Google Images Scraper, then filter to best 15
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get restaurant data
    const { data: restaurant, error } = await supabase
      .from('restaurants')
      .select('id, name, slug, address, city, neighborhood, website, apify_output')
      .eq('id', params.id)
      .single()

    if (error || !restaurant) {
      return NextResponse.json(
        { error: 'Restaurant not found' },
        { status: 404 }
      )
    }

    console.log('=== COMBINED IMAGE EXTRACTION (GOOGLE IMAGES + FIRECRAWL) ===')
    console.log('Restaurant:', restaurant.name)
    console.log('Website:', restaurant.website || 'Not available')

    // Build search query: "restaurant name + address" (more specific than city)
    const searchQuery = `${restaurant.name} ${restaurant.address}`.trim()
    console.log('Search query:', searchQuery)

    // STEP 1: Run Apify Google Images Scraper
    console.log('\n--- RUNNING APIFY GOOGLE IMAGES SCRAPER ---')
    const actorInput = {
      queries: [searchQuery],
      maxResultsPerQuery: 50 // Get 50 images, we'll filter to top 15
    }

    const runResponse = await fetch(
      'https://api.apify.com/v2/acts/hooli~google-images-scraper/runs',
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
    const runId = runData.data.id
    const defaultDatasetId = runData.data.defaultDatasetId

    console.log('Apify run started:', runId)

    // Wait for run to complete
    console.log('Waiting for Apify run to complete...')
    let runStatus = 'RUNNING'
    let attempts = 0
    const maxAttempts = 60 // 2 minutes max

    while (runStatus === 'RUNNING' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))

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

    // Get results
    console.log('\n--- FETCHING RESULTS ---')
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
    console.log(`Google Images Scraper found: ${results.length} images`)

    // STEP 2: Scrape restaurant website with Firecrawl (if available)
    const websiteImages: any[] = []
    if (restaurant.website) {
      console.log('\n--- SCRAPING RESTAURANT WEBSITE ---')
      try {
        const firecrawlApiKey = process.env.FIRECRAWL_API_KEY!
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firecrawlApiKey}`
          },
          body: JSON.stringify({
            url: restaurant.website,
            formats: ['markdown', 'html'],
            onlyMainContent: false,
            waitFor: 3000
          })
        })

        if (scrapeResponse.ok) {
          const scrapeData = await scrapeResponse.json()
          const markdown = scrapeData.data?.markdown || ''
          const html = scrapeData.data?.html || ''

          // Extract image URLs from markdown
          const markdownRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g
          const baseUrl = new URL(restaurant.website)

          for (const match of markdown.matchAll(markdownRegex)) {
            let url = match[1]

            // Convert relative URLs to absolute
            if (url.startsWith('/')) {
              url = `${baseUrl.protocol}//${baseUrl.host}${url}`
            } else if (!url.startsWith('http')) {
              url = `${baseUrl.protocol}//${baseUrl.host}/${url}`
            }

            // Skip if already in results or invalid
            if (!url.includes('.svg') && !url.includes('logo') && !url.includes('icon')) {
              websiteImages.push({
                query: searchQuery,
                imageUrl: url,
                thumbnailUrl: url,
                imageWidth: '800', // Assume good quality from website
                imageHeight: '600',
                title: `From ${restaurant.name} website`,
                contentUrl: restaurant.website,
                origin: baseUrl.hostname
              })
            }
          }

          // Extract from HTML img tags
          const htmlRegex = /<img[^>]+src=["']([^"']+)["']/g
          for (const match of html.matchAll(htmlRegex)) {
            let url = match[1]

            // Convert relative URLs to absolute
            if (url.startsWith('/')) {
              url = `${baseUrl.protocol}//${baseUrl.host}${url}`
            } else if (!url.startsWith('http')) {
              url = `${baseUrl.protocol}//${baseUrl.host}/${url}`
            }

            if (!url.includes('.svg') && !url.includes('logo') && !url.includes('icon')) {
              websiteImages.push({
                query: searchQuery,
                imageUrl: url,
                thumbnailUrl: url,
                imageWidth: '800',
                imageHeight: '600',
                title: `From ${restaurant.name} website`,
                contentUrl: restaurant.website,
                origin: baseUrl.hostname
              })
            }
          }

          console.log(`Firecrawl images found: ${websiteImages.length}`)
        }
      } catch (error) {
        console.error('Error scraping website:', error)
      }
    }

    // STEP 3: Combine both sources
    const allImages = [...results, ...websiteImages]
    console.log(`\n=== COMBINED SOURCES ===`)
    console.log(`Google Images Scraper: ${results.length}`)
    console.log(`Website photos: ${websiteImages.length}`)
    console.log(`Total images from both sources: ${allImages.length}`)

    if (allImages.length === 0) {
      return NextResponse.json(
        { error: 'No images found' },
        { status: 404 }
      )
    }

    // DEDUPLICATION: Remove duplicate URLs
    const seenUrls = new Set<string>()
    const uniqueImages = allImages.filter((img: any) => {
      const url = (img.imageUrl || img.thumbnailUrl || '').toLowerCase()
      if (seenUrls.has(url)) {
        return false
      }
      seenUrls.add(url)
      return true
    })
    console.log(`After deduplication: ${uniqueImages.length} unique images`)

    // FILTERING: Apply smart URL pattern analysis
    console.log('\n--- FILTERING & RANKING IMAGES ---')
    const analyzedImages = uniqueImages.map((img: any, index: number) => {
      const analysis = analyzeGoogleImage(img, restaurant.name, restaurant.website || '')

      // Log detailed analysis for first 3 images
      if (index < 3) {
        console.log(`\nImage ${index + 1}:`)
        console.log(`  URL: ${img.imageUrl?.substring(0, 80)}...`)
        console.log(`  Valid: ${analysis.isValid}`)
        if (analysis.isValid) {
          console.log(`  Score: ${analysis.score}/100`)
          console.log(`  Breakdown:`, analysis.breakdown)
          console.log(`  Reasons: ${analysis.reason.join(', ')}`)
        } else {
          console.log(`  Rejected: ${analysis.reason.join(', ')}`)
        }
      }

      return {
        ...img,
        score: analysis.score,
        reason: analysis.reason.join('; '),
        quality: analysis.quality,
        isValid: analysis.isValid,
        source: analysis.source,
        breakdown: analysis.breakdown
      }
    })

    // Filter and sort
    const validImages = analyzedImages
      .filter((img: any) => img.isValid)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 15) // Top 15

    console.log(`\n=== FILTERING RESULTS ===`)
    console.log(`Total images: ${uniqueImages.length}`)
    console.log(`Valid images: ${validImages.length}`)
    console.log(`Rejected: ${uniqueImages.length - validImages.length}`)

    // Show top 5 scored images
    console.log(`\nTop 5 images by score:`)
    validImages.slice(0, 5).forEach((img: any, i: number) => {
      console.log(`  ${i + 1}. Score: ${img.score}/100 (${img.source}) - ${img.reason}`)
    })

    // Summary stats
    const originCounts = validImages.reduce((acc: any, img: any) => {
      acc[img.origin] = (acc[img.origin] || 0) + 1
      return acc
    }, {})

    console.log('\n=== FILTERING SUMMARY ===')
    console.log(`Google Images: ${results.length}`)
    console.log(`Website: ${websiteImages.length}`)
    console.log(`Total found: ${allImages.length}`)
    console.log(`After filtering: ${validImages.length}`)
    console.log('\nBy origin:')
    Object.entries(originCounts).forEach(([origin, count]) => {
      console.log(`  ${origin}: ${count}`)
    })

    return NextResponse.json({
      success: true,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      search_query: searchQuery,
      sources: {
        google_images: results.length,
        website: websiteImages.length,
        total: allImages.length
      },
      filtered_count: validImages.length,
      images: validImages,
      summary: {
        by_origin: originCounts
      }
    })

  } catch (error) {
    console.error("Apify image scraping error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

/**
 * Analyze Google Image result quality with comprehensive ranking
 * Based on tutorial scoring system with adaptations for UK restaurants
 */
function analyzeGoogleImage(img: any, restaurantName: string, restaurantWebsite: string) {
  const result = {
    isValid: true,
    score: 0, // Start from 0, build up score
    reason: [] as string[],
    quality: 'medium' as 'high' | 'medium' | 'low',
    source: 'google_images' as string,
    breakdown: {} as Record<string, number>
  }

  const imageUrl = (img.imageUrl || img.thumbnailUrl || '').toLowerCase()
  const title = (img.title || '').toLowerCase()
  const origin = (img.origin || '').toLowerCase()
  const contentUrl = (img.contentUrl || '').toLowerCase()
  const urlParts = imageUrl.split('/').pop() || ''
  const restaurantNameNormalized = restaurantName.toLowerCase().replace(/\s+/g, '').replace(/&/g, '')

  // === STAGE 1: BASIC VALIDATION ===

  // Must have imageUrl, width, height
  if (!img.imageUrl || !img.imageWidth || !img.imageHeight) {
    result.isValid = false
    result.reason.push('Missing basic data (imageUrl, width, or height)')
    return result
  }

  // Encrypted thumbnails (low quality Google thumbnails)
  if (imageUrl.includes('encrypted-tbn')) {
    result.isValid = false
    result.reason.push('Encrypted thumbnail (low quality)')
    return result
  }

  // === STAGE 2: SIZE REQUIREMENTS ===

  const width = parseInt(img.imageWidth || '0')
  const height = parseInt(img.imageHeight || '0')
  const totalPixels = width * height

  // Minimum 200x200
  if (width < 200 || height < 200) {
    result.isValid = false
    result.reason.push(`Too small: ${width}x${height}`)
    return result
  }

  // Total pixels minimum 30,000 (e.g., 200x150)
  if (totalPixels < 30000) {
    result.isValid = false
    result.reason.push(`Insufficient pixels: ${totalPixels.toLocaleString()} (min 30k)`)
    return result
  }

  // === STAGE 3: CONTENT BLOCKING ===

  // Profile pictures - often circular, contain "profile" in URL
  if (imageUrl.includes('profile') ||
      title.includes('profile picture') ||
      title.includes('avatar')) {
    result.isValid = false
    result.reason.push('Profile picture')
    return result
  }

  // Logo detection
  if (imageUrl.includes('logo') ||
      imageUrl.includes('/icon') ||
      urlParts.includes('plus.png') ||
      urlParts.includes('plus.svg') ||
      urlParts === `${restaurantNameNormalized}.png` ||
      urlParts === `${restaurantNameNormalized}.svg` ||
      urlParts.includes('favicon')) {
    result.isValid = false
    result.reason.push('Logo or icon')
    return result
  }

  // Map images
  if (imageUrl.includes('-map.') ||
      imageUrl.includes('_map.') ||
      imageUrl.includes('/map.') ||
      (title.includes('map') && title.includes('location'))) {
    result.isValid = false
    result.reason.push('Map or location image')
    return result
  }

  // Social media video content
  if (origin.includes('youtube') ||
      origin.includes('tiktok') ||
      contentUrl.includes('/reel/') ||
      contentUrl.includes('/video/') ||
      contentUrl.includes('/watch?v=')) {
    result.isValid = false
    result.reason.push('Social media / video content')
    return result
  }

  // Skip job posting filter - not needed for UK restaurants

  // Generic guides/lists
  if (title.includes('restaurants in') ||
      title.includes('best restaurants') ||
      title.includes('top restaurants') ||
      contentUrl.includes('guide.michelin.com')) {
    result.isValid = false
    result.reason.push('Generic guide/list')
    return result
  }

  // Error pages (404, etc.)
  if (imageUrl.includes('404') ||
      title.includes('404') ||
      title.includes('not found') ||
      title.includes('error')) {
    result.isValid = false
    result.reason.push('Error page')
    return result
  }

  // === STAGE 4: ASPECT RATIO CHECK ===

  const aspectRatio = width / height

  // Aspect ratio between 0.3 and 3 (not extremely wide/tall)
  if (aspectRatio > 3 || aspectRatio < 0.33) {
    result.isValid = false
    result.reason.push(`Unusual aspect ratio: ${aspectRatio.toFixed(2)} (banner or vertical ad)`)
    return result
  }

  // === PASSED ALL EXCLUSIONS - NOW SCORE ===

  // === SCORING CATEGORY 1: SIZE (0-30 points) ===

  let sizeScore = 0
  if (totalPixels >= 2000000) {  // 2MP+ (e.g., 2000x1000)
    sizeScore = 30
  } else if (totalPixels >= 1000000) {  // 1MP+ (e.g., 1200x800)
    sizeScore = 25
  } else if (totalPixels >= 500000) {  // 500k+ (e.g., 750x667)
    sizeScore = 20
  } else if (totalPixels >= 200000) {  // 200k+ (e.g., 500x400)
    sizeScore = 15
  } else {
    sizeScore = 10
  }
  result.score += sizeScore
  result.breakdown['size'] = sizeScore

  // === SCORING CATEGORY 2: ASPECT RATIO (0-15 points) ===

  let ratioScore = 0
  // Perfect ratio for restaurants: 0.8-1.5 (close to square or landscape)
  if (aspectRatio >= 0.8 && aspectRatio <= 1.5) {
    ratioScore = 15
  } else if (aspectRatio >= 0.6 && aspectRatio <= 2.0) {
    ratioScore = 10
  } else {
    ratioScore = 5
  }
  result.score += ratioScore
  result.breakdown['ratio'] = ratioScore

  // === SCORING CATEGORY 3: SOURCE AUTHORITY (0-25 points) ===

  let sourceScore = 0
  const websiteDomain = restaurantWebsite ? new URL(restaurantWebsite).hostname.replace('www.', '') : ''

  // Official restaurant website (highest priority)
  if (websiteDomain && origin.includes(websiteDomain)) {
    sourceScore = 25
    result.quality = 'high'
    result.source = 'website'
    result.reason.push('Official website')
  }
  // UK premium review platforms
  else if (origin.includes('opentable.co.uk') ||
           origin.includes('opentable.com')) {
    sourceScore = 20
    result.quality = 'high'
    result.reason.push('OpenTable')
  }
  else if (origin.includes('tripadvisor')) {
    sourceScore = 18
    result.quality = 'high'
    result.reason.push('TripAdvisor')
  }
  else if (origin.includes('timeout.com') ||
           origin.includes('hot-dinners.com') ||
           origin.includes('hardens.com') ||
           origin.includes('squaremeal.co.uk')) {
    sourceScore = 16
    result.quality = 'high'
    result.reason.push('UK restaurant media')
  }
  // Food blogs
  else if (origin.includes('thehungryhuy.com') ||
           origin.includes('eater.com') ||
           origin.includes('seriouseats.com')) {
    sourceScore = 12
    result.quality = 'medium'
    result.reason.push('Food blog')
  }
  // Design/architecture (professional photography)
  else if (origin.includes('designboom') ||
           origin.includes('dexigner') ||
           origin.includes('archello')) {
    sourceScore = 14
    result.quality = 'high'
    result.reason.push('Design/architecture')
  }
  // Instagram (if passed video filter)
  else if (origin.includes('instagram') || origin.includes('cdninstagram')) {
    sourceScore = 10
    result.quality = 'medium'
    result.reason.push('Instagram')
  }
  // Generic/unknown source
  else {
    sourceScore = 5
    result.reason.push('Generic source')
  }

  result.score += sourceScore
  result.breakdown['source'] = sourceScore

  // === SCORING CATEGORY 4: CONTENT RELEVANCE (0-20 points) ===

  let contentScore = 0

  // Check if title/content mentions restaurant name
  const nameWords = restaurantName.toLowerCase().split(/\s+/)
  const nameInTitle = nameWords.some(word => word.length > 3 && title.includes(word))
  const nameInContent = nameWords.some(word => word.length > 3 && contentUrl.includes(word))

  if (nameInTitle && nameInContent) {
    contentScore += 15
    result.reason.push('Strong name match')
  } else if (nameInTitle || nameInContent) {
    contentScore += 10
    result.reason.push('Name match')
  }

  // Food/restaurant keywords in title
  const goodKeywords = ['food', 'dish', 'menu', 'dining', 'restaurant', 'kitchen', 'interior', 'ambiance']
  const hasGoodKeyword = goodKeywords.some(kw => title.includes(kw))
  if (hasGoodKeyword) {
    contentScore += 5
    result.reason.push('Relevant content')
  }

  result.score += contentScore
  result.breakdown['content'] = contentScore

  // === SCORING CATEGORY 5: CONTENT TYPE (0-10 points) ===

  let typeScore = 0

  // Check title for content type indicators
  if (title.includes('interior') || title.includes('ambiance') || title.includes('decor')) {
    typeScore = 10
    result.reason.push('Interior/ambiance')
  } else if (title.includes('food') || title.includes('dish') || title.includes('plate')) {
    typeScore = 9
    result.reason.push('Food/dish')
  } else if (title.includes('exterior') || title.includes('facade') || title.includes('entrance')) {
    typeScore = 8
    result.reason.push('Exterior')
  } else {
    typeScore = 5
    result.reason.push('General restaurant')
  }

  result.score += typeScore
  result.breakdown['type'] = typeScore

  // === FINAL QUALITY ASSESSMENT ===

  // Total possible: 100 points
  // 85-100: Premium sources (official site, major review sites)
  // 50-84: Good sources (food blogs, decent resolution)
  // Below 50: Low quality (usually filtered out)

  if (result.score >= 85) {
    result.quality = 'high'
  } else if (result.score >= 60) {
    result.quality = 'medium'
  } else {
    result.quality = 'low'
  }

  return result
}
