# 🤖 Automated Quarterly Data Fetching System

This system automatically fetches quarterly financial data from web sources and PDFs, eliminating manual data entry for 2000+ stocks.

## 🎯 Strategy

### Historical Data (Q1 FY2526 and earlier)
- **Primary Source**: Screener.in (most reliable, well-structured)
- **Fallback**: MoneyControl (if Screener fails)
- **Automated**: Web scraping extracts all historical quarters

### Current Quarter (Q2 FY2526)
- **Source**: PDF parsing of quarterly results PDFs
- **Purpose**: Verification that PDF extraction works correctly
- **Benefit**: Once verified, can automate future quarterly updates via PDF

## 📁 File Structure

```
server/
├── services/
│   ├── web-scrapers/
│   │   ├── screener-scraper.ts       # Scrapes screener.in
│   │   └── moneycontrol-scraper.ts   # Scrapes moneycontrol.com
│   └── pdf-parser/
│       └── generic-results-parser.ts  # Universal PDF parser
├── auto-fetch-quarterly-data.ts       # Main orchestration script
└── test-web-scraping.ts               # Testing & validation
```

## 🚀 Usage

### Step 1: Test the System

```powershell
npx tsx server/test-web-scraping.ts
```

This will:
- Test scraping TCS, INFY, RELIANCE from Screener.in
- Show you the data format and accuracy
- Test PDF parsing (if PDF is available)

### Step 2: Configure Stocks

Edit `server/auto-fetch-quarterly-data.ts` and update the `STOCKS_TO_FETCH` array:

```typescript
const STOCKS_TO_FETCH: StockConfig[] = [
  { 
    symbol: 'TCS', 
    name: 'Tata Consultancy Services',
    moneyControlId: 'TCS',
    pdfPath: 'path/to/tcs-q2-fy2526.pdf' // Optional
  },
  // Add more stocks...
];
```

### Step 3: Fetch All Data

```powershell
npx tsx server/auto-fetch-quarterly-data.ts
```

This will:
- Fetch historical data (Q1 FY2526 and earlier) from web sources
- Skip Q2 FY2526 (current quarter) from web scraping
- Parse Q2 FY2526 from PDF if provided
- Save all data to database

### Step 4: Calculate Comparisons

```powershell
npx tsx server/auto-populate-all-comparisons.ts
```

This automatically:
- Links quarters across time periods
- Calculates QoQ (Quarter-over-Quarter) growth
- Calculates YoY (Year-over-Year) growth
- Fills all comparison fields

## 📊 What Gets Extracted

### From Web Sources (Screener.in/MoneyControl)
- ✅ Revenue
- ✅ Net Profit
- ✅ EPS (Earnings Per Share)
- ✅ Operating Profit
- ✅ Quarter (Q1/Q2/Q3/Q4)
- ✅ Fiscal Year (FY2526 format)

### From PDFs
- ✅ All above fields
- ✅ Operating Profit Margin
- ✅ Confidence score (60-100%)
- ✅ Automatic quarter/year detection

## 🎨 Data Flow

```
┌─────────────────┐
│  Screener.in    │──┐
│  (Primary)      │  │
└─────────────────┘  │
                     ├──> Historical Data (Q1 and earlier)
┌─────────────────┐  │
│ MoneyControl    │──┘
│  (Fallback)     │
└─────────────────┘

┌─────────────────┐
│  PDF Files      │────> Current Quarter (Q2) + Verification
└─────────────────┘

         ↓
┌─────────────────┐
│   Database      │
│ quarterly_results│
└─────────────────┘

         ↓
┌─────────────────┐
│ Auto-Calculate  │────> QoQ/YoY Comparisons
│   Comparisons   │
└─────────────────┘
```

## 🧪 PDF Parsing Test

To verify PDF extraction works:

1. **Download** a quarterly results PDF (e.g., TCS Q2 FY2526)
2. **Save** as `tcs-q2-fy2526.pdf` in the project folder
3. **Run** the test:

```powershell
npx tsx server/test-web-scraping.ts
```

4. **Check** the confidence score:
   - 80-100% = ✅ Excellent, use as-is
   - 60-79% = ⚠️ Good, verify manually
   - Below 60% = ❌ Manual entry needed

## 📝 Example Output

```
🧪 Testing Screener.in Scraping
============================================================

Testing TCS...

[Screener] Fetching data for TCS...
[Screener] Found 12 quarters: Sep 2024, Jun 2024, Mar 2024...
[Screener] Successfully extracted 12 quarters

✅ Successfully scraped 12 quarters for TCS:

Latest 3 quarters:

1. Q2 FY2526
   Revenue: ₹64,259 Cr
   Profit: ₹11,909 Cr
   EPS: ₹32.98
   Operating Profit: ₹17,324 Cr

2. Q1 FY2526
   Revenue: ₹62,613 Cr
   Profit: ₹12,040 Cr
   EPS: ₹33.35
   Operating Profit: ₹16,656 Cr
```

## 🔧 Customization

### Add More Stocks

Just add to the `STOCKS_TO_FETCH` array:

```typescript
{ 
  symbol: 'HDFCBANK', 
  name: 'HDFC Bank',
  moneyControlId: 'HDF01',
},
```

### Change Data Sources

The system tries sources in this order:
1. Screener.in (primary)
2. MoneyControl (fallback)
3. PDF (for current quarter)

### Filter Quarters

The script automatically filters out Q2 FY2526 from web sources to avoid duplicates with PDF data.

## 🎯 Benefits

### For 10 Stocks
- **Manual**: ~30 minutes per stock = 5 hours total
- **Automated**: ~2 seconds per stock = 20 seconds total
- **Savings**: 99.9% time reduction

### For 2000 Stocks
- **Manual**: 30 min × 2000 = 1000 hours (6 weeks full-time)
- **Automated**: 2 sec × 2000 = 1.1 hours
- **Savings**: Practically impossible manually, trivial with automation

## ⚠️ Important Notes

### Rate Limiting
- System waits 2 seconds between stocks
- Prevents being blocked by websites
- For 100 stocks: ~3-4 minutes total

### Data Accuracy
- Screener.in is most reliable (verified against official results)
- MoneyControl sometimes has formatting differences
- PDF parsing 80%+ confidence is production-ready
- Always spot-check first few results

### Quarter Format
- System uses: Q1, Q2, Q3, Q4
- Fiscal year: FY2526 (not "FY 25-26")
- Automatically handles all date formats from sources

## 🚦 Next Steps After Data Fetch

1. **Verify Data**: Check database for accuracy
   ```powershell
   npx tsx server/check-stock-data.ts
   ```

2. **Calculate Comparisons**: Auto-link and compute QoQ/YoY
   ```powershell
   npx tsx server/auto-populate-all-comparisons.ts
   ```

3. **View in UI**: Open the app and check quarterly performance tables

4. **Scale Up**: Once verified with 10 stocks, add all 2000+

## 🎉 Success Criteria

✅ Test script shows data for TCS, INFY, RELIANCE  
✅ PDF parsing shows 60%+ confidence  
✅ Database populated with historical quarters  
✅ Auto-population calculates all comparisons  
✅ UI displays complete quarterly tables  

Now you can fetch 2000+ stocks in minutes instead of weeks! 🚀
