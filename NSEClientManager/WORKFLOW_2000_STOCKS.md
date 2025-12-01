# WORKFLOW FOR MANAGING 2000+ STOCKS

## 🎯 Problem Solved
You can now add quarterly results for 2000+ stocks WITHOUT manually entering comparison data!

## 🚀 How It Works

### For Adding New Stocks:

1. **Add quarters chronologically** (oldest to newest)
2. **Run auto-population script**
3. **System automatically links quarters and calculates everything!**

## 📋 Step-by-Step Guide

### Option 1: Adding Single Stock (e.g., from Screener)

```typescript
import { calculateQuarterlyComparisons } from './utils/quarterly-calculations.js';

// Add each quarter one by one (oldest to newest)
// The system will auto-link them!

// Quarter 1 (oldest)
await calculateQuarterlyComparisons({
  stockId: "new-stock-id",
  quarter: "Q1",
  fiscalYear: "FY2425",
  revenue: 50000,
  profit: 8000,
  eps: 25.00,
  operatingProfit: 13000,
});

// Quarter 2
await calculateQuarterlyComparisons({
  stockId: "new-stock-id",
  quarter: "Q2",
  fiscalYear: "FY2425",
  revenue: 52000,
  profit: 8500,
  eps: 26.00,
  operatingProfit: 13500,
});

// Then run: npx tsx server/auto-populate-all-comparisons.ts
// It will automatically link Q2 with Q1 data!
```

### Option 2: Bulk Import from Screener (Recommended for 2000+ stocks)

```typescript
// Create a bulk import script
import { supabase } from "./supabase-storage.js";

async function bulkImportFromScreener() {
  // 1. Prepare your data (from screener CSV/Excel)
  const stocksData = [
    {
      stockId: "stock-1-id",
      quarters: [
        { quarter: "Q1", fiscalYear: "FY2425", revenue: 50000, profit: 8000, eps: 25, operatingProfit: 13000 },
        { quarter: "Q2", fiscalYear: "FY2425", revenue: 52000, profit: 8500, eps: 26, operatingProfit: 13500 },
        // ... more quarters
      ]
    },
    // ... more stocks (up to 2000+)
  ];
  
  // 2. Insert all quarters (raw data, no calculations yet)
  for (const stock of stocksData) {
    for (const q of stock.quarters) {
      await supabase.from('quarterly_results').insert({
        stock_id: stock.stockId,
        quarter: q.quarter,
        fiscal_year: q.fiscalYear,
        revenue: q.revenue,
        profit: q.profit,
        eps: q.eps,
        operating_profit: q.operatingProfit,
        published_at: new Date(),
      });
    }
  }
  
  console.log("✅ Bulk insert complete!");
}

// 3. After bulk insert, run ONE command:
// npx tsx server/auto-populate-all-comparisons.ts
// This will:
// - Link all quarters automatically
// - Calculate all comparisons
// - Update operating profit margins
// - Works for ALL 2000+ stocks at once!
```

## 🔧 Available Scripts

### 1. Auto-Population (Main Script)
```bash
npx tsx server/auto-populate-all-comparisons.ts
```
- **Use when**: After adding new quarters
- **What it does**: Automatically links quarters and calculates all comparisons
- **Scale**: Works for ANY number of stocks (10 to 2000+)

### 2. Analysis Tool
```bash
npx tsx server/analyze-quarterly-data.ts
```
- **Use when**: Want to see what data is missing
- **What it does**: Shows which stocks can be auto-populated vs need manual data

### 3. Recalculation (If data changes)
```bash
npx tsx server/recalculate-all-quarterly-results.ts
```
- **Use when**: Need to recalculate existing comparisons
- **What it does**: Updates all calculations without changing quarter links

## 💡 Best Practices for 2000+ Stocks

### Strategy A: Sequential Processing
```bash
# Add 100 stocks at a time
1. Insert quarters for stocks 1-100
2. Run: npx tsx server/auto-populate-all-comparisons.ts
3. Insert quarters for stocks 101-200  
4. Run: npx tsx server/auto-populate-all-comparisons.ts
# Repeat...
```

### Strategy B: Bulk Insert (Recommended)
```bash
# Add ALL stocks first, then one auto-populate
1. Bulk insert all 2000+ stocks' quarters (raw data only)
2. Run ONCE: npx tsx server/auto-populate-all-comparisons.ts
3. Done! All comparisons calculated automatically
```

## 📊 Data Requirements

### Minimum Required Per Quarter:
- `stock_id`
- `quarter` (Q1, Q2, Q3, Q4)
- `fiscal_year` (e.g., FY2526)
- `revenue` (in Crores)
- `profit` (in Crores)
- `eps` (in Rupees)
- `operating_profit` (in Crores)

### Auto-Calculated Fields:
- Operating Profit Margin
- Previous Quarter Margin
- Year-Ago Margin
- All QoQ growth percentages
- All YoY growth percentages

## 🎯 Example Workflow for 2000 Stocks

```bash
# Step 1: Prepare data from Screener
# Export quarterly results for all 2000 stocks to CSV

# Step 2: Create bulk import script
# See: server/bulk-import-template.ts (create this based on your CSV format)

# Step 3: Run bulk import
npx tsx server/bulk-import-from-csv.ts

# Step 4: Auto-populate ALL comparisons
npx tsx server/auto-populate-all-comparisons.ts

# Done! All 2000 stocks now have complete quarterly comparisons!
```

## ⚠️ Important Notes

1. **Always add quarters chronologically** (oldest to newest)
2. **Operating margin is auto-calculated** - don't enter manually
3. **For year-ago comparisons**: Stock needs at least 5 quarters (1 year+ data)
4. **For QoQ comparisons**: Stock needs at least 2 consecutive quarters
5. **Script is idempotent**: Safe to run multiple times

## 🔍 Verification

After running auto-population, verify a few stocks:
```bash
npx tsx server/test-stock-detail-endpoint.ts
# Change stock symbol in the script to test different stocks
```

## 📈 Performance

- **10 stocks**: ~2 seconds
- **100 stocks**: ~15 seconds  
- **1000 stocks**: ~2-3 minutes
- **2000+ stocks**: ~5-7 minutes

All processing is automatic - no manual intervention needed!
