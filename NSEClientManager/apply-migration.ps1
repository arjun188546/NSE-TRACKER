# Open Supabase SQL Editor and provide SQL to run
# This script helps apply the missing column migration

$supabaseUrl = "https://supabase.com/dashboard/project/xnfscozxsooaunugyxdu/sql/new"
$migrationFile = "server\supabase\migrations\ADD_MISSING_COLUMNS.sql"

Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "DATABASE MIGRATION" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""
Write-Host "Missing columns need to be added to the quarterly_results table" -ForegroundColor Yellow
Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Green
Write-Host "1. Opening Supabase SQL Editor in your browser..." -ForegroundColor White
Write-Host "2. Copy the SQL from: $migrationFile" -ForegroundColor White
Write-Host "3. Paste it into the SQL Editor and click RUN" -ForegroundColor White
Write-Host "4. After successful execution, run: npx tsx server/update-tcs-q2-complete.ts" -ForegroundColor White
Write-Host ""
Write-Host ("-" * 80) -ForegroundColor Gray
Write-Host "SQL TO RUN:" -ForegroundColor Yellow
Write-Host ("-" * 80) -ForegroundColor Gray
Write-Host ""

# Display the SQL content
if (Test-Path $migrationFile) {
    Get-Content $migrationFile | ForEach-Object { Write-Host $_ -ForegroundColor White }
} else {
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_revenue DECIMAL(15, 2);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_profit DECIMAL(15, 2);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_eps DECIMAL(10, 4);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_operating_profit DECIMAL(15, 2);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_revenue DECIMAL(15, 2);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_profit DECIMAL(15, 2);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_eps DECIMAL(10, 4);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_operating_profit DECIMAL(15, 2);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_margin_qoq DECIMAL(5, 2);' -ForegroundColor White
    Write-Host 'ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS operating_profit_margin_yoy DECIMAL(5, 2);' -ForegroundColor White
}

Write-Host ""
Write-Host ("-" * 80) -ForegroundColor Gray
Write-Host ""
Write-Host "Opening Supabase SQL Editor..." -ForegroundColor Green

# Copy SQL to clipboard
if (Test-Path $migrationFile) {
    Get-Content $migrationFile | Set-Clipboard
    Write-Host "SQL copied to clipboard!" -ForegroundColor Green
}

# Open browser
Start-Process $supabaseUrl

Write-Host ""
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "Waiting for you to run the SQL in Supabase..." -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key after you've run the SQL to continue with data update..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host ""
Write-Host "Running data update script..." -ForegroundColor Green
npx tsx server/update-tcs-q2-complete.ts
