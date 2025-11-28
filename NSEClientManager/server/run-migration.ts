/**
 * Database Migration Runner
 * Executes SQL migrations on Supabase PostgreSQL
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  console.log('🚀 Starting Supabase migration...\n');

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xnfscozxsooaunugyxdu.supabase.co';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZnNjb3p4c29vYXVudWd5eGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzOTAwNTgsImV4cCI6MjA3ODk2NjA1OH0.d2o9SitDN9klSoMs8AwvLybpsreL70fgkecdIMPinjM';

    console.log('📡 Connecting to Supabase:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Read the migration SQL file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '003_complete_schema_with_trading_data.sql');
    console.log('📄 Reading migration file:', migrationPath);
    
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    console.log('✅ Migration SQL loaded (' + migrationSQL.length + ' bytes)\n');

    console.log('⚠️  IMPORTANT:');
    console.log('   SQL migrations cannot be run directly via Supabase JS client.');
    console.log('   You must use the Supabase Dashboard SQL Editor.\n');

    console.log('📋 Manual Migration Steps:');
    console.log('━'.repeat(60));
    console.log('1. Go to: https://supabase.com/dashboard/project/xnfscozxsooaunugyxdu/sql');
    console.log('2. Click "New Query"');
    console.log('3. Copy contents from:');
    console.log('   server/supabase/migrations/003_complete_schema_with_trading_data.sql');
    console.log('4. Paste into SQL editor');
    console.log('5. Click "Run" or press Ctrl+Enter');
    console.log('━'.repeat(60));

    console.log('\n✅ After running the SQL, your database will have:');
    console.log('   • users table with 3 test accounts');
    console.log('   • stocks table with 10 blue-chip stocks + trading data fields');
    console.log('   • results_calendar, quarterly_results tables');
    console.log('   • candlestick_data, delivery_volume tables');
    console.log('   • All necessary indexes for performance\n');

    console.log('🔄 To verify migration worked, run:');
    console.log('   npm run dev');
    console.log('   Then check server logs for stock data fetch.\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
runMigration()
  .then(() => {
    console.log('📖 See SUPABASE_SETUP.md for detailed instructions.\n');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

