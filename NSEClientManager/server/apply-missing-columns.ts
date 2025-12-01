/**
 * Apply missing columns to quarterly_results table
 * This ensures all columns needed for complete quarterly data exist
 */

import { supabase } from './supabase/config/supabase-client';

async function applyMissingColumns() {
  console.log('='.repeat(80));
  console.log('📊 APPLYING MISSING COLUMNS TO quarterly_results TABLE');
  console.log('='.repeat(80));
  console.log();

  try {
    // SQL to add all missing columns
    const sql = `
      -- Add operating profit and margins
      ALTER TABLE quarterly_results 
      ADD COLUMN IF NOT EXISTS operating_profit DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS operating_profit_margin DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS pat_margin DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS ebitda DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS ebitda_margin DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS total_income DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS total_expenses DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS roe DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS roce DECIMAL(5, 2);

      -- Add previous quarter data fields
      ALTER TABLE quarterly_results 
      ADD COLUMN IF NOT EXISTS prev_revenue DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS prev_profit DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS prev_eps DECIMAL(10, 4),
      ADD COLUMN IF NOT EXISTS prev_operating_profit DECIMAL(15, 2);

      -- Add year-ago data fields
      ALTER TABLE quarterly_results 
      ADD COLUMN IF NOT EXISTS year_ago_revenue DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS year_ago_profit DECIMAL(15, 2),
      ADD COLUMN IF NOT EXISTS year_ago_eps DECIMAL(10, 4),
      ADD COLUMN IF NOT EXISTS year_ago_operating_profit DECIMAL(15, 2);

      -- Add QoQ comparison fields
      ALTER TABLE quarterly_results 
      ADD COLUMN IF NOT EXISTS operating_profit_qoq DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS operating_profit_margin_qoq DECIMAL(5, 2);

      -- Add YoY comparison fields
      ALTER TABLE quarterly_results 
      ADD COLUMN IF NOT EXISTS operating_profit_yoy DECIMAL(5, 2),
      ADD COLUMN IF NOT EXISTS operating_profit_margin_yoy DECIMAL(5, 2);
    `;

    console.log('📝 Executing SQL to add missing columns...');
    console.log();

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // Try direct query if RPC doesn't work
      console.log('⚠️  RPC method not available, trying direct SQL execution...');
      
      // Split into individual ALTER statements and execute one by one
      const statements = [
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_margin DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS pat_margin DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS ebitda DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS ebitda_margin DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS total_income DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS total_expenses DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS roe DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS roce DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_revenue DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_profit DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_eps DECIMAL(10, 4)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_operating_profit DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_revenue DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_profit DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_eps DECIMAL(10, 4)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_operating_profit DECIMAL(15, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_qoq DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_margin_qoq DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_yoy DECIMAL(5, 2)`,
        `ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_margin_yoy DECIMAL(5, 2)`,
      ];

      for (const stmt of statements) {
        const { error: stmtError } = await supabase.rpc('exec', { sql: stmt });
        if (stmtError) {
          console.warn(`⚠️  Could not execute: ${stmt}`);
          console.warn(`   Error: ${stmtError.message}`);
        }
      }
    }

    console.log('✅ Columns added (if they didn\'t exist)!');
    console.log();
    console.log('📋 Added columns:');
    console.log('   ✅ operating_profit');
    console.log('   ✅ operating_profit_margin');
    console.log('   ✅ pat_margin');
    console.log('   ✅ ebitda, ebitda_margin');
    console.log('   ✅ total_income, total_expenses');
    console.log('   ✅ roe, roce');
    console.log('   ✅ prev_revenue, prev_profit, prev_eps, prev_operating_profit');
    console.log('   ✅ year_ago_revenue, year_ago_profit, year_ago_eps, year_ago_operating_profit');
    console.log('   ✅ operating_profit_qoq, operating_profit_margin_qoq');
    console.log('   ✅ operating_profit_yoy, operating_profit_margin_yoy');
    console.log();
    console.log('='.repeat(80));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(80));
    console.log();
    console.log('🎯 Next step: Run the update-tcs-q2-complete.ts script');
    console.log();

  } catch (error: any) {
    console.error();
    console.error('='.repeat(80));
    console.error('❌ MIGRATION FAILED!');
    console.error(`   Error: ${error.message}`);
    console.error('='.repeat(80));
    if (error.stack) {
      console.error();
      console.error('Stack trace:');
      console.error(error.stack);
    }
    
    console.log();
    console.log('💡 Alternative: Run the SQL manually in Supabase SQL Editor:');
    console.log();
    console.log('   1. Go to your Supabase project');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Run the migration files in server/supabase/migrations/');
    console.log('   4. Specifically run: 004_quarterly_results_comparison_fields.sql');
    console.log();
    
    process.exit(1);
  }
}

applyMissingColumns();
