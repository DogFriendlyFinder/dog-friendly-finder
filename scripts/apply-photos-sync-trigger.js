#!/usr/bin/env node

/**
 * Script to apply the photos JSON sync trigger to Supabase
 *
 * This creates database triggers that automatically sync the photos JSON field
 * in the restaurants table whenever images are added, updated, or deleted.
 *
 * Usage:
 *   node scripts/apply-photos-sync-trigger.js
 */

const fs = require('fs')
const path = require('path')

// Read the SQL migration file
const sqlPath = path.join(__dirname, '../supabase/migrations/sync_photos_json.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

// Supabase connection details
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗')
  process.exit(1)
}

console.log('🔧 Applying photos JSON sync triggers...\n')
console.log('Supabase URL:', SUPABASE_URL)
console.log('SQL file:', sqlPath)
console.log('')

// Execute SQL via Supabase REST API
async function executeSql() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Failed to execute SQL:')
      console.error('Status:', response.status)
      console.error('Error:', error)
      process.exit(1)
    }

    const result = await response.json()
    console.log('✅ Triggers created successfully!')
    console.log('')
    console.log('Created:')
    console.log('  - sync_restaurant_photos() function')
    console.log('  - sync_photos_on_insert trigger')
    console.log('  - sync_photos_on_update trigger')
    console.log('  - sync_photos_on_delete trigger')
    console.log('')
    console.log('📝 All existing restaurant photos have been synced')
    console.log('')
    console.log('ℹ️  The photos JSON field will now automatically update when:')
    console.log('   • Images are added to the images table')
    console.log('   • Images are modified')
    console.log('   • Images are deleted')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

executeSql()
