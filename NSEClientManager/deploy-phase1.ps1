# Quick Deploy Phase 1 to Supabase

Write-Host "=== NSE Project - Phase 1 Deployment ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (!(Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with Supabase credentials" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green

# Check if dependencies are installed
if (!(Test-Path "node_modules/@supabase")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

Write-Host "✅ Dependencies ready" -ForegroundColor Green
Write-Host ""

# Instructions for manual migration
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1️⃣  Open Supabase Dashboard:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/xnfscozxsooaunugyxdu" -ForegroundColor Blue
Write-Host ""
Write-Host "2️⃣  Go to: SQL Editor → New Query" -ForegroundColor White
Write-Host ""
Write-Host "3️⃣  Copy this file contents:" -ForegroundColor White
Write-Host "   server\supabase\migrations\002_enhanced_nse_schema.sql" -ForegroundColor Yellow
Write-Host ""
Write-Host "4️⃣  Paste and click 'Run'" -ForegroundColor White
Write-Host ""
Write-Host "5️⃣  Verify tables created:" -ForegroundColor White
Write-Host "   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';" -ForegroundColor Gray
Write-Host ""

# Option to open files
$response = Read-Host "Open migration file now? (y/n)"
if ($response -eq 'y') {
    code "server\supabase\migrations\002_enhanced_nse_schema.sql"
    Start-Process "https://supabase.com/dashboard/project/xnfscozxsooaunugyxdu/editor"
}

Write-Host ""
Write-Host "📖 For detailed instructions, see: PHASE1_DEPLOYMENT.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "After migration completes, we'll update the storage layer to use Supabase!" -ForegroundColor Green
