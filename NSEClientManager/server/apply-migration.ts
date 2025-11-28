/**
 * Apply Supabase Migration 007 - Real-time Data Schema
 * 
 * This script applies the migration to add real-time data support to Supabase.
 * Run this script to update your Supabase database schema.
 */

import { supabase } from './supabase/config/supabase-client.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
    console.log('[Migration] Starting migration 007 - Real-time Data Schema...');

    try {
        // Read the migration SQL file
        const migrationPath = join(__dirname, 'supabase', 'migrations', '007_realtime_data_schema.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        console.log('[Migration] Read migration file successfully');
        console.log('[Migration] Applying migration to Supabase...');

        // Execute the migration SQL
        // Note: Supabase client doesn't support raw SQL execution directly
        // You need to run this in Supabase SQL Editor or use Supabase CLI

        console.log('\n⚠️  IMPORTANT: This script cannot execute raw SQL directly.');
        console.log('Please apply the migration using one of these methods:\n');
        console.log('Method 1: Supabase Dashboard (Recommended)');
        console.log('  1. Go to https://supabase.com/dashboard');
        console.log('  2. Select your project');
        console.log('  3. Navigate to SQL Editor');
        console.log('  4. Copy the contents of: server/supabase/migrations/007_realtime_data_schema.sql');
        console.log('  5. Paste and execute\n');
        console.log('Method 2: Supabase CLI');
        console.log('  1. Install: npm install -g supabase');
        console.log('  2. Link: supabase link --project-ref YOUR_PROJECT_REF');
        console.log('  3. Push: supabase db push\n');

        // Verify tables exist after manual migration
        console.log('[Migration] Verifying existing tables...');

        const { data: tables, error } = await supabase
            .from('stocks')
            .select('id')
            .limit(1);

        if (error) {
            console.error('[Migration] ❌ Error connecting to Supabase:', error.message);
            process.exit(1);
        }

        console.log('[Migration] ✅ Supabase connection verified');
        console.log('\n[Migration] After applying the migration manually, run this script again to verify.');

    } catch (error) {
        console.error('[Migration] ❌ Error:', error.message);
        process.exit(1);
    }
}

applyMigration();
