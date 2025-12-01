/**
 * Simple SQL executor to add missing columns
 * Uses raw SQL query through Supabase
 */

import { supabase } from './supabase/config/supabase-client';

async function addMissingColumns() {
  console.log('Adding missing columns to quarterly_results table...\n');

  const columns = [
    { name: 'operating_profit', type: 'DECIMAL(15, 2)' },
    { name: 'operating_profit_margin', type: 'DECIMAL(5, 2)' },
    { name: 'pat_margin', type: 'DECIMAL(5, 2)' },
    { name: 'prev_revenue', type: 'DECIMAL(15, 2)' },
    { name: 'prev_profit', type: 'DECIMAL(15, 2)' },
    { name: 'prev_eps', type: 'DECIMAL(10, 4)' },
    { name: 'prev_operating_profit', type: 'DECIMAL(15, 2)' },
    { name: 'year_ago_revenue', type: 'DECIMAL(15, 2)' },
    { name: 'year_ago_profit', type: 'DECIMAL(15, 2)' },
    { name: 'year_ago_eps', type: 'DECIMAL(10, 4)' },
    { name: 'year_ago_operating_profit', type: 'DECIMAL(15, 2)' },
    { name: 'operating_profit_qoq', type: 'DECIMAL(5, 2)' },
    { name: 'operating_profit_margin_qoq', type: 'DECIMAL(5, 2)' },
    { name: 'operating_profit_yoy', type: 'DECIMAL(5, 2)' },
    { name: 'operating_profit_margin_yoy', type: 'DECIMAL(5, 2)' },
  ];

  // First, check what columns currently exist
  const { data: existingData, error: checkError } = await supabase
    .from('quarterly_results')
    .select('*')
    .limit(1);

  if (checkError) {
    console.error('❌ Error checking table:', checkError.message);
    return;
  }

  const existingColumns = existingData && existingData.length > 0 
    ? Object.keys(existingData[0]) 
    : [];

  console.log('📊 Existing columns:', existingColumns.join(', '));
  console.log();

  const missingColumns = columns.filter(col => !existingColumns.includes(col.name));

  if (missingColumns.length === 0) {
    console.log('✅ All columns already exist!');
    return;
  }

  console.log(`⚠️  Missing ${missingColumns.length} columns:`);
  missingColumns.forEach(col => console.log(`   - ${col.name}`));
  console.log();
  console.log('❌ Cannot automatically add columns via Supabase JS client.');
  console.log();
  console.log('📋 MANUAL STEPS REQUIRED:');
  console.log('='.repeat(80));
  console.log();
  console.log('1. Go to your Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Run this SQL:');
  console.log();
  console.log('-'.repeat(80));
  
  missingColumns.forEach(col => {
    console.log(`ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
  });
  
  console.log('-'.repeat(80));
  console.log();
  console.log('5. After running the SQL, run: npx tsx server/update-tcs-q2-complete.ts');
  console.log();
  console.log('='.repeat(80));
}

addMissingColumns();
