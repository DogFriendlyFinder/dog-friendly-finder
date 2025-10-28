import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY!
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
})

// Helper function to parse menu sections from markdown/html
function parseMenuSections(markdown: string, html: string) {
  const sections: any[] = []

  // Comprehensive list of menu section keywords (English + French + common variations)
  const sectionKeywords = [
    // Main meal times
    'breakfast', 'brunch', 'lunch', 'dinner', 'supper', 'all day', 'all-day',
    // Course types (English)
    'starters', 'appetizers', 'appetisers', 'small plates', 'sharing plates',
    'mains', 'main courses', 'entrees', 'entrées', 'large plates',
    'sides', 'side dishes', 'accompaniments',
    'desserts', 'sweets', 'puddings',
    // Course types (French)
    'amuses', 'amuse-bouche', 'amuse bouche',
    'hors doeuvres', 'hors d oeuvres',
    'entrées', 'entrees',
    'salades', 'salads',
    'soupes', 'soups',
    'poissons', 'fish', 'seafood',
    'viandes', 'meat', 'grill', 'from the grill',
    'plats principaux', 'plats', 'main dishes',
    'accompagnements', 'garnitures',
    'fromages', 'cheese',
    'desserts', 'patisserie',
    // Drinks
    'drinks', 'beverages', 'boissons',
    'cocktails', 'mocktails',
    'wine', 'vins', 'wine list',
    'beer', 'bières', 'craft beer',
    'spirits', 'liqueurs',
    'coffee', 'café', 'tea', 'thé',
    // Special menus
    'set menu', 'prix fixe', 'tasting menu', 'chef menu',
    'à la carte', 'a la carte',
    'vegetarian', 'vegan', 'gluten free',
    // Other
    'specials', 'daily specials'
  ]

  // Clean up markdown - remove navigation elements
  let cleanedMarkdown = markdown
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      // Skip empty lines, links, images, and navigation
      return trimmed.length > 0 &&
        !trimmed.startsWith('[') &&
        !trimmed.startsWith('!') &&
        !trimmed.startsWith('Open Menu') &&
        !trimmed.startsWith('Close Menu') &&
        !trimmed.includes('Skip to Content')
    })
    .join('\n')

  const lines = cleanedMarkdown.split('\n')
  let currentSection: any = null
  let currentDish: any = null
  let pendingPrice: number | null = null
  let pendingDescription: string = ''

  console.log(`\n=== PARSING MENU ===`)
  console.log(`Total lines to parse: ${lines.length}`)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Check if this is an ALL CAPS section header
    const isAllCaps = line === line.toUpperCase() && line.length > 2
    const lineLower = line.toLowerCase().replace(/['']/g, '\'')

    // Check if it matches any section keyword
    const matchedKeyword = sectionKeywords.find(keyword => {
      const keywordLower = keyword.toLowerCase()
      return lineLower === keywordLower ||
             lineLower.includes(keywordLower) ||
             // Handle concatenated sections (LUNCHDINNERDESSERTS)
             (isAllCaps && line.includes(keyword.toUpperCase()))
    })

    if (isAllCaps && matchedKeyword && line.length < 50) {
      // Save previous section if it has items
      if (currentSection && currentSection.items.length > 0) {
        sections.push(currentSection)
        console.log(`✓ Saved section: ${currentSection.name} (${currentSection.items.length} items)`)
      }

      // Start new section - capitalize first letter of each word
      const sectionName = line
        .split(' ')
        .map(word => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' ')

      currentSection = {
        name: sectionName,
        items: []
      }
      currentDish = null
      pendingPrice = null
      pendingDescription = ''
      console.log(`\n→ New section: ${sectionName}`)
      continue
    }

    // Only process items if we're in a section
    if (!currentSection) continue

    // Pattern 1: Standalone price (£10, $15, €20)
    const priceOnlyMatch = line.match(/^[£$€]\s*(\d+(?:\.\d{1,2})?)$/)
    if (priceOnlyMatch) {
      const price = parseFloat(priceOnlyMatch[1])

      if (currentDish && !currentDish.price) {
        // This is the closing price for the current dish
        currentDish.price = price
        console.log(`  ✓ ${currentDish.name} - £${price}`)
        currentDish = null
      } else {
        // This is an opening price for the next dish
        pendingPrice = price
      }
      continue
    }

    // Pattern 2: Dish name with price inline (Dish Name £10 or Dish Name - £10)
    const dishWithPriceMatch = line.match(/^(.+?)\s*[-–—]?\s*[£$€]\s*(\d+(?:\.\d{1,2})?)$/)
    if (dishWithPriceMatch) {
      const dishName = dishWithPriceMatch[1].trim()
      const price = parseFloat(dishWithPriceMatch[2])

      const newDish = {
        name: dishName,
        price: price,
        description: pendingDescription
      }
      currentSection.items.push(newDish)
      console.log(`  ✓ ${dishName} - £${price}`)

      currentDish = null
      pendingPrice = null
      pendingDescription = ''
      continue
    }

    // Pattern 3: Text that looks like a dish name or description
    // Skip obvious non-menu items
    if (line.toLowerCase().includes('add ') ||
        line.includes('|') ||
        line.match(/^\+\d+/) ||
        line.length > 200) {
      continue
    }

    // If we have a pending price, this is likely a dish name
    if (pendingPrice !== null && !currentDish) {
      currentDish = {
        name: line,
        price: pendingPrice,
        description: ''
      }
      currentSection.items.push(currentDish)
      pendingPrice = null
      continue
    }

    // If we have a current dish without a description, this might be the description
    if (currentDish && !currentDish.description && line.length > 10) {
      currentDish.description = line
      pendingDescription = ''
      continue
    }

    // Otherwise, if it looks like a dish name (reasonable length, starts with capital)
    if (line.length >= 3 && line.length <= 150 && line[0] === line[0].toUpperCase()) {
      // Check if this is actually a description by looking ahead
      const nextLine = i + 1 < lines.length ? lines[i + 1].trim() : ''
      const nextIsPrice = nextLine.match(/^[£$€]\s*\d+/)

      if (nextIsPrice || currentDish) {
        // This is a new dish name
        if (currentDish && !currentDish.description) {
          // Previous line was actually a description
          currentDish.description = pendingDescription
        }

        currentDish = {
          name: line,
          price: null,
          description: ''
        }
        currentSection.items.push(currentDish)
        pendingDescription = ''
      } else {
        // This might be a description
        pendingDescription = line
      }
    }
  }

  // Save the last section
  if (currentSection && currentSection.items.length > 0) {
    sections.push(currentSection)
    console.log(`✓ Saved section: ${currentSection.name} (${currentSection.items.length} items)`)
  }

  // Clean up: remove items without names or with invalid data
  sections.forEach(section => {
    section.items = section.items.filter((item: any) =>
      item.name &&
      item.name.length >= 2 &&
      item.name.length <= 200 &&
      item.price !== null &&
      item.price > 0
    )
  })

  // Remove empty sections
  const filteredSections = sections.filter(s => s.items.length > 0)

  const totalItems = filteredSections.reduce((sum, s) => sum + s.items.length, 0)
  console.log(`\n=== PARSING COMPLETE ===`)
  console.log(`Sections: ${filteredSections.length}`)
  console.log(`Total items: ${totalItems}`)

  filteredSections.forEach((section, idx) => {
    console.log(`  ${idx + 1}. ${section.name}: ${section.items.length} items`)
  })

  return filteredSections
}

// AI-powered menu extraction using Anthropic Claude
async function extractMenuWithAI(markdown: string, restaurantName: string, sourceUrl: string) {
  console.log('\n=== AI MENU EXTRACTION ===')
  console.log(`Restaurant: ${restaurantName}`)
  console.log(`Source: ${sourceUrl}`)
  console.log(`Content length: ${markdown.length} characters`)

  try {
    const prompt = `You are a menu extraction specialist. Analyze the following web content and extract the restaurant menu in structured format.

Restaurant: ${restaurantName}
Source URL: ${sourceUrl}

IMPORTANT INSTRUCTIONS:
1. Extract ONLY factual menu items with their prices
2. Organize items into logical sections (Starters, Mains, Desserts, Drinks, etc.)
3. Include item descriptions if available
4. Convert all prices to decimal numbers (e.g., "£15" becomes 15.00, "$22.50" becomes 22.50)
5. If no menu is found, return an empty sections array
6. Ignore navigation elements, footers, headers, and promotional text
7. Focus on actual food/drink items with prices

Web Content:
${markdown.slice(0, 50000)}

Return your response as valid JSON in this exact format:
{
  "sections": [
    {
      "name": "Section Name",
      "description": "Optional section description",
      "items": [
        {
          "name": "Item Name",
          "description": "Item description",
          "price": 15.00
        }
      ]
    }
  ]
}

If no menu items are found, return: {"sections": []}`

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: prompt
      }]
    })

    // Extract the text content from the response
    const textContent = message.content.find((block: any) => block.type === 'text') as any
    if (!textContent || !textContent.text) {
      console.error('No text content in AI response')
      return { sections: [] }
    }

    let responseText = textContent.text as string

    // Clean up the response - remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    // Parse the JSON response
    const menuData = JSON.parse(responseText)

    const totalSections = menuData.sections?.length || 0
    const totalItems = menuData.sections?.reduce((sum: number, section: any) => sum + (section.items?.length || 0), 0) || 0

    console.log(`✓ AI extraction complete`)
    console.log(`  Sections found: ${totalSections}`)
    console.log(`  Total items: ${totalItems}`)

    if (totalSections > 0) {
      menuData.sections.forEach((section: any, idx: number) => {
        console.log(`  ${idx + 1}. ${section.name}: ${section.items?.length || 0} items`)
      })
    }

    return menuData

  } catch (error) {
    console.error('AI menu extraction error:', error)
    return { sections: [], error: error instanceof Error ? error.message : String(error) }
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params

  try {
    const { restaurant_name, address, website } = await request.json()

    if (!restaurant_name || !address) {
      return NextResponse.json(
        { error: "Restaurant name and address are required" },
        { status: 400 }
      )
    }

    if (!FIRECRAWL_API_KEY) {
      return NextResponse.json(
        { error: "Firecrawl API key not configured" },
        { status: 500 }
      )
    }

    console.log('Starting Firecrawl scraping for:', restaurant_name)
    console.log('Address:', address)
    console.log('Website:', website || 'Not provided')

    // Extract location from address (neighborhood or city)
    const addressParts = address.split(',').map((p: string) => p.trim())
    // Try to get neighborhood (usually before city) or fall back to city
    let location = addressParts.length > 2 ? addressParts[addressParts.length - 3] : addressParts[0]
    // Remove postcode if present
    location = location.replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/i, '').trim()

    console.log('Extracted location:', location)

    const baseQuery = `${restaurant_name} ${location}`
    console.log('Base search query:', baseQuery)

    // Build all search queries
    const searches = {
      social_media: {
        instagram: `${baseQuery} instagram`,
        facebook: `${baseQuery} facebook`,
        tiktok: `${baseQuery} tiktok`
      },
      review_sites: {
        tripadvisor: `${baseQuery} tripadvisor`,
        opentable: `${baseQuery} opentable`
      },
      awards: {
        general: `${baseQuery} awards`,
        michelin: `${baseQuery} michelin`
      },
      homepage: website || null
    }

    // Function to scrape a URL with Firecrawl
    async function scrapeWithFirecrawl(url: string, label: string) {
      console.log(`Scraping ${label}:`, url)

      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify({
            url,
            formats: ['markdown'],
            onlyMainContent: true,
            waitFor: 2000
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to scrape ${label}:`, errorText)
          return {
            success: false,
            error: errorText,
            url
          }
        }

        const data = await response.json()
        console.log(`✓ Successfully scraped ${label}`)

        return {
          success: true,
          url,
          markdown: data.data?.markdown || '',
          metadata: data.data?.metadata || {}
        }
      } catch (error) {
        console.error(`Error scraping ${label}:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          url
        }
      }
    }

    // Prepare all scrape tasks
    const scrapeTasks: Promise<any>[] = []
    const scrapeMap: { [key: string]: string } = {}

    // Social media searches
    Object.entries(searches.social_media).forEach(([platform, query]) => {
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
      scrapeMap[`social_${platform}`] = googleSearchUrl
      scrapeTasks.push(
        scrapeWithFirecrawl(googleSearchUrl, `Social Media - ${platform}`)
          .then(result => ({ key: `social_${platform}`, result }))
      )
    })

    // Review sites searches
    Object.entries(searches.review_sites).forEach(([site, query]) => {
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
      scrapeMap[`review_${site}`] = googleSearchUrl
      scrapeTasks.push(
        scrapeWithFirecrawl(googleSearchUrl, `Review Site - ${site}`)
          .then(result => ({ key: `review_${site}`, result }))
      )
    })

    // Awards searches
    Object.entries(searches.awards).forEach(([type, query]) => {
      const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`
      scrapeMap[`awards_${type}`] = googleSearchUrl
      scrapeTasks.push(
        scrapeWithFirecrawl(googleSearchUrl, `Awards - ${type}`)
          .then(result => ({ key: `awards_${type}`, result }))
      )
    })

    // Homepage scrape (if website available)
    if (website) {
      scrapeMap['homepage'] = website
      scrapeTasks.push(
        scrapeWithFirecrawl(website, 'Homepage')
          .then(result => ({ key: 'homepage', result }))
      )
    }

    // Execute all scrapes in parallel
    console.log(`Executing ${scrapeTasks.length} scrapes in parallel...`)
    const scrapeResults = await Promise.all(scrapeTasks)

    // Organize results
    const firecrawlOutput: any = {
      scraped_at: new Date().toISOString(),
      restaurant_name,
      location,
      scrapes: {}
    }

    scrapeResults.forEach(({ key, result }) => {
      firecrawlOutput.scrapes[key] = {
        query: scrapeMap[key],
        success: result.success,
        markdown: result.markdown || '',
        metadata: result.metadata || {},
        error: result.error || null
      }
    })

    console.log(`Completed ${scrapeResults.length} scrapes`)

    // Menu scraping with intelligent discovery using Firecrawl v2
    console.log('=== MENU SCRAPING (Firecrawl v2) ===')
    let menuData: any = {
      scraped_at: new Date().toISOString(),
      menu_url: null,
      menus: [],
      raw_markdown: '',
      scrape_method: null
    }

    // Function to search for menu URLs using Firecrawl v2 search
    async function searchWithFirecrawlV2(query: string, label: string) {
      console.log(`Searching with Firecrawl v2 (${label}): "${query}"`)

      try {
        const response = await fetch('https://api.firecrawl.dev/v2/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify({
            query,
            limit: 3
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Firecrawl v2 search failed for ${label}:`, errorText)
          return {
            success: false,
            error: errorText,
            results: []
          }
        }

        const data = await response.json()
        const results = data.data?.web || []

        console.log(`✓ Firecrawl v2 search returned ${results.length} results`)
        results.forEach((result: any, idx: number) => {
          console.log(`  ${idx + 1}. ${result.title}`)
          console.log(`     ${result.url}`)
        })

        return {
          success: true,
          results,
          creditsUsed: data.creditsUsed || 0
        }
      } catch (error) {
        console.error(`Error with Firecrawl v2 search for ${label}:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          results: []
        }
      }
    }

    // Function to scrape menu with structured extraction (v1 scrape endpoint)
    async function scrapeMenuWithStructure(url: string, label: string) {
      console.log(`Scraping menu content from ${label}:`, url)

      try {
        const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
          },
          body: JSON.stringify({
            url,
            formats: ['markdown', 'html'],
            onlyMainContent: false,
            waitFor: 3000,
            actions: [
              {
                type: 'wait',
                milliseconds: 2000
              }
            ]
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`Failed to scrape menu from ${label}:`, errorText)
          return {
            success: false,
            error: errorText,
            url
          }
        }

        const data = await response.json()
        const markdown = data.data?.markdown || ''
        const html = data.data?.html || ''

        console.log(`✓ Successfully scraped menu from ${label}`)
        console.log(`Markdown length: ${markdown.length} characters`)

        return {
          success: true,
          url,
          markdown,
          html,
          metadata: data.data?.metadata || {}
        }
      } catch (error) {
        console.error(`Error scraping menu from ${label}:`, error)
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          url
        }
      }
    }

    // Helper function to extract menu links from markdown
    function extractMenuLinks(markdown: string, baseUrl: string): string[] {
      const menuLinks: string[] = []
      const menuKeywords = ['menu', 'food', 'eat', 'dining', 'lunch', 'dinner', 'breakfast', 'brunch']

      // Extract all markdown links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match

      while ((match = linkRegex.exec(markdown)) !== null) {
        const linkText = match[1].toLowerCase()
        const linkUrl = match[2]

        // Check if link text contains menu-related keywords
        if (menuKeywords.some(keyword => linkText.includes(keyword))) {
          // Make relative URLs absolute
          let absoluteUrl = linkUrl
          if (!linkUrl.startsWith('http')) {
            try {
              const base = new URL(baseUrl)
              absoluteUrl = new URL(linkUrl, base.origin).href
            } catch (e) {
              console.log(`Failed to parse URL: ${linkUrl}`)
              continue
            }
          }
          console.log(`Found menu link from navigation: "${linkText}" -> ${absoluteUrl}`)
          menuLinks.push(absoluteUrl)
        }
      }

      return menuLinks
    }

    let menuFound = false

    // STRATEGY 1: Firecrawl v2 Search (Dubai tutorial approach)
    console.log('\n--- STRATEGY 1: Firecrawl v2 Search ---')

    // Define search query variations (based on Dubai tutorial + delivery platforms)
    const searchQueries = [
      // Official website menu
      `${restaurant_name} ${location} menu`,
      `${restaurant_name} ${location} food menu`,
      `${restaurant_name} ${location} lunch dinner menu`,
      `${restaurant_name} menu`,
      // Delivery platforms (guaranteed to have menus)
      `${restaurant_name} ${location} deliveroo`,
      `${restaurant_name} ${location} ubereats`,
      `${restaurant_name} ${location} just eat`,
      `${restaurant_name} deliveroo menu`,
      `${restaurant_name} ubereats menu`,
      `${restaurant_name} just eat menu`
    ]

    for (const searchQuery of searchQueries) {
      if (menuFound) break

      const searchResult = await searchWithFirecrawlV2(searchQuery, 'Menu Search')

      if (searchResult.success && searchResult.results.length > 0) {
        console.log(`Found ${searchResult.results.length} potential menu URLs`)

        // Try each URL from search results
        for (const result of searchResult.results) {
          if (menuFound) break

          console.log(`Trying: ${result.title}`)
          const scrapeResult = await scrapeMenuWithStructure(result.url, 'v2 Search Result')

          if (scrapeResult.success && scrapeResult.markdown) {
            // Use AI to extract menu from scraped content
            const aiMenuData = await extractMenuWithAI(scrapeResult.markdown, restaurant_name, result.url)
            const totalItems = aiMenuData.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0
            console.log(`AI extracted ${aiMenuData.sections?.length || 0} sections with ${totalItems} items`)

            if (totalItems > 0) {
              console.log(`✓ Successfully found menu via Firecrawl v2 search at ${result.url}`)
              menuData.menu_url = result.url
              menuData.raw_markdown = scrapeResult.markdown
              menuData.raw_html = scrapeResult.html
              menuData.scrape_method = 'firecrawl_v2_search_ai'
              menuData.metadata = scrapeResult.metadata
              menuData.menus = aiMenuData.sections
              menuFound = true
              break
            }
          }
        }
      }
    }

    // STRATEGY 2: Extract menu links from homepage navigation
    if (!menuFound && website) {
      console.log('\n--- STRATEGY 2: Homepage Link Extraction ---')

      // Check if we already scraped the homepage
      const homepageScrape = firecrawlOutput.scrapes['homepage']

      if (homepageScrape && homepageScrape.success && homepageScrape.markdown) {
        console.log('Analyzing homepage navigation for menu links...')
        const menuLinksFromHomepage = extractMenuLinks(homepageScrape.markdown, website)

        for (const menuLink of menuLinksFromHomepage) {
          console.log(`Trying homepage menu link: ${menuLink}`)
          const linkResult = await scrapeMenuWithStructure(menuLink, 'Homepage Link')

          if (linkResult.success && linkResult.markdown) {
            // Use AI to extract menu from scraped content
            const aiMenuData = await extractMenuWithAI(linkResult.markdown, restaurant_name, menuLink)
            const totalItems = aiMenuData.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0
            console.log(`AI extracted ${aiMenuData.sections?.length || 0} sections with ${totalItems} items`)

            if (totalItems > 0) {
              console.log(`✓ Successfully found menu via homepage link at ${menuLink}`)
              menuData.menu_url = menuLink
              menuData.raw_markdown = linkResult.markdown
              menuData.raw_html = linkResult.html
              menuData.scrape_method = 'homepage_navigation_ai'
              menuData.metadata = linkResult.metadata
              menuData.menus = aiMenuData.sections
              menuFound = true
              break
            }
          }
        }
      }
    }

    // STRATEGY 3: Fallback - try common menu path patterns
    if (!menuFound && website) {
      console.log('\n--- STRATEGY 3: Common Menu Paths ---')
      const menuPaths = ['/menu', '/menus', '/food', '/eat', '/pages/menu', '/pages/lunch-menu']

      // Normalize website URL
      let baseUrl = website
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`
      }

      for (const path of menuPaths) {
        const menuUrl = baseUrl.endsWith('/') ? `${baseUrl}${path.substring(1)}` : `${baseUrl}${path}`
        console.log(`Trying common path: ${menuUrl}`)

        const pathResult = await scrapeMenuWithStructure(menuUrl, `Path - ${path}`)

        if (pathResult.success && pathResult.markdown && pathResult.metadata?.statusCode !== 404) {
          // Use AI to extract menu from scraped content
          const aiMenuData = await extractMenuWithAI(pathResult.markdown, restaurant_name, menuUrl)
          const totalItems = aiMenuData.sections?.reduce((sum, s) => sum + (s.items?.length || 0), 0) || 0
          console.log(`AI extracted ${aiMenuData.sections?.length || 0} sections with ${totalItems} items`)

          if (totalItems > 0) {
            console.log(`✓ Successfully found menu at common path ${menuUrl}`)
            menuData.menu_url = menuUrl
            menuData.raw_markdown = pathResult.markdown
            menuData.raw_html = pathResult.html
            menuData.scrape_method = 'common_path_ai'
            menuData.metadata = pathResult.metadata
            menuData.menus = aiMenuData.sections
            menuFound = true
            break
          }
        }
      }
    }

    if (!menuFound) {
      console.log('⚠️  Unable to find menu after trying all strategies')
      menuData.error = 'Menu not found after exhaustive search'
    }

    // Update the restaurant record with firecrawl_output and menu_data
    console.log('Updating restaurant in database...')

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const updateResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/restaurants?id=eq.${params.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          firecrawl_output: firecrawlOutput,
          menu_data: menuData
        })
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Failed to update restaurant:', errorText)
      return NextResponse.json(
        { error: 'Failed to update restaurant with Firecrawl data', details: errorText },
        { status: 500 }
      )
    }

    console.log('✓ Restaurant updated successfully with Firecrawl data')

    return NextResponse.json({
      success: true,
      restaurant_id: params.id,
      firecrawl_output: firecrawlOutput,
      menu_data: menuData,
      summary: {
        total_scrapes: scrapeResults.length + 1, // +1 for menu
        successful_scrapes: scrapeResults.filter(r => r.result.success).length + (menuData.raw_markdown ? 1 : 0),
        failed_scrapes: scrapeResults.filter(r => !r.result.success).length + (menuData.raw_markdown ? 0 : 1)
      }
    })

  } catch (error) {
    console.error("Firecrawl API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
