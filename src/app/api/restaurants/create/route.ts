import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  console.log('=== CREATE RESTAURANT ENDPOINT CALLED ===')

  try {
    const { google_place_id, name, address, latitude, longitude } = await request.json()

    console.log('Received data:', { google_place_id, name, address, latitude, longitude })

    if (!google_place_id || !name || !address || !latitude || !longitude) {
      console.error('Missing required fields:', { google_place_id, name, address, latitude, longitude })
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    console.log('Supabase URL:', supabaseUrl)
    console.log('Supabase Key exists:', !!supabaseKey)
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extract city from address (remove postcode pattern)
    const addressParts = address.split(',')
    let city = addressParts.length > 1
      ? addressParts[addressParts.length - 2].trim()
      : addressParts[0].trim()

    // Remove UK postcode pattern from city (e.g., "London WC2E 7RS" -> "London")
    // UK postcode pattern: 1-2 letters, 1-2 digits, optional letter, space, digit, 2 letters
    city = city.replace(/\s+[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\s*$/i, '').trim()

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    console.log('Extracted city:', city)
    console.log('Generated slug:', slug)

    const insertData = {
      google_place_id,
      name,
      address,
      latitude,
      longitude,
      city,
      slug,
      country: 'United Kingdom',
      published: false,
      apify_output: null,
      firecrawl_output: null,
      menu_data: null
    }

    console.log('Attempting to insert:', insertData)

    // Create restaurant record
    const { data, error } = await supabase
      .from('restaurants')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('=== SUPABASE INSERT ERROR ===')
      console.error('Error object:', JSON.stringify(error, null, 2))
      console.error('Error message:', error.message)
      console.error('Error details:', error.details)
      console.error('Error hint:', error.hint)
      console.error('Error code:', error.code)

      // Check if it's a duplicate restaurant
      if (error.code === '23505' && error.details?.includes('slug')) {
        return NextResponse.json(
          {
            error: 'Restaurant already exists',
            details: 'This restaurant has already been added to the database',
            code: error.code,
            isDuplicate: true
          },
          { status: 409 } // 409 Conflict
        )
      }

      return NextResponse.json(
        {
          error: 'Failed to create restaurant',
          details: error.message,
          code: error.code,
          hint: error.hint,
          supabaseError: error
        },
        { status: 500 }
      )
    }

    console.log('=== RESTAURANT CREATED SUCCESSFULLY ===')
    console.log('Created restaurant:', data)

    return NextResponse.json({
      success: true,
      restaurant_id: data.id,
      message: 'Restaurant created successfully'
    })

  } catch (error) {
    console.error("Create restaurant API error:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
