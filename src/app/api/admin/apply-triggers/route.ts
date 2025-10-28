import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/admin/apply-triggers
 *
 * Applies the photos JSON sync triggers to the database
 * This only needs to be run once during setup
 */
export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Read the SQL migration file
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', 'sync_photos_json.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('🔧 Applying photos JSON sync triggers...')

    // Execute the SQL using Supabase's query method
    // We need to execute each statement separately
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    const results = []
    const errors = []

    for (const statement of statements) {
      try {
        const { data, error } = await supabase.rpc('exec', { query: statement })

        if (error) {
          console.error('Error executing statement:', error)
          errors.push({ statement: statement.substring(0, 100) + '...', error: error.message })
        } else {
          results.push({ success: true })
        }
      } catch (err) {
        console.error('Exception executing statement:', err)
        errors.push({
          statement: statement.substring(0, 100) + '...',
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Some statements failed to execute',
          executed: results.length,
          failed: errors.length,
          errors
        },
        { status: 500 }
      )
    }

    console.log('✅ Triggers applied successfully!')

    return NextResponse.json({
      success: true,
      message: 'Photos JSON sync triggers applied successfully',
      executed: results.length,
      triggers: [
        'sync_restaurant_photos() function',
        'sync_photos_on_insert trigger',
        'sync_photos_on_update trigger',
        'sync_photos_on_delete trigger'
      ]
    })

  } catch (error) {
    console.error('Failed to apply triggers:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to apply triggers',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
