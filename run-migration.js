const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://zhsceyvwaikdxajtiydj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpoc2NleXZ3YWlrZHhhanRpeWRqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzI1MDYwOCwiZXhwIjoyMDcyODI2NjA4fQ.0KhkJnTpO6c_8C1YZTm-QH8sRaznDKlPnQrqLkL7bH0'
);

async function runMigration() {
  console.log('Reading migration file...');
  const sql = fs.readFileSync('./migrations/create_neighbourhoods_table.sql', 'utf8');

  console.log('Executing migration...');

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement.includes('SELECT COUNT(*)')) {
      // Query statement
      const { data, error } = await supabase.rpc('exec_sql', { query: statement });
      if (error) {
        console.error('Error:', error);
      } else {
        console.log('Result:', data);
      }
    }
  }

  // Verify with direct query
  const { data, error, count } = await supabase
    .from('neighbourhoods')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error checking neighbourhoods:', error);
  } else {
    console.log(`✅ Successfully created ${count} neighbourhoods!`);
  }
}

runMigration().catch(console.error);
