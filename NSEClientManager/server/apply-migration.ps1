# Apply Supabase Migration 007 - Real-time Data Schema
# This script helps you apply the migration to your Supabase database

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Migration 007 Application" -ForegroundColor Cyan
Write-Host "Real-time Data Schema" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$migrationFile = Join-Path $PSScriptRoot "supabase\migrations\007_realtime_data_schema.sql"

if (Test-Path $migrationFile) {
    Write-Host "✓ Migration file found" -ForegroundColor Green
    
    Write-Host "`nTo apply this migration, choose one of the following methods:`n" -ForegroundColor Yellow
    
    Write-Host "Method 1: Supabase Dashboard (Recommended)" -ForegroundColor White
    Write-Host "  1. Open: https://supabase.com/dashboard" -ForegroundColor Gray
    Write-Host "  2. Select your project" -ForegroundColor Gray
    Write-Host "  3. Navigate to: SQL Editor" -ForegroundColor Gray
    Write-Host "  4. Copy the migration SQL (opening in notepad...)" -ForegroundColor Gray
    Write-Host "  5. Paste and execute in SQL Editor`n" -ForegroundColor Gray
    
    Write-Host "Method 2: Supabase CLI" -ForegroundColor White
    Write-Host "  1. Install: npm install -g supabase" -ForegroundColor Gray
    Write-Host "  2. Link: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Gray
    Write-Host "  3. Push: supabase db push`n" -ForegroundColor Gray
    
    # Ask user if they want to open the migration file
    $response = Read-Host "Open migration file in notepad? (Y/N)"
    if ($response -eq 'Y' -or $response -eq 'y') {
        notepad $migrationFile
        Write-Host "`n✓ Migration file opened in Notepad" -ForegroundColor Green
        Write-Host "Copy the contents and paste into Supabase SQL Editor" -ForegroundColor Yellow
    }
    
    Write-Host "`nAfter applying the migration, press any key to verify..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    
    Write-Host "`nVerifying Supabase connection..." -ForegroundColor Cyan
    
    # Try to verify by running the dev server briefly
    Write-Host "Starting server to verify connection..." -ForegroundColor Gray
    npm run dev
    
} else {
    Write-Host "✗ Migration file not found at: $migrationFile" -ForegroundColor Red
    Write-Host "Please ensure you're running this script from the server directory" -ForegroundColor Yellow
}
