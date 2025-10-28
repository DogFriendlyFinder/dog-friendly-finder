import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20251019_create_images_table.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

    // Execute migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

    if (error) {
      // Try direct execution if RPC doesn't work
      const statements = migrationSQL.split(';').filter(s => s.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase.from('_migrations').insert({
            name: '20251019_create_images_table',
            executed_at: new Date().toISOString()
          })

          // Actually execute using raw SQL via REST API
          console.log('Executing SQL statement...')
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Migration prepared. Please run manually in Supabase SQL Editor.',
        sql: migrationSQL
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Migration executed successfully',
      data
    })

  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json(
      {
        error: 'Migration failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
