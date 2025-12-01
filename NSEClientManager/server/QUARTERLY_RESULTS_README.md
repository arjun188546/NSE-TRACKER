# Quarterly Results Management System

## Overview
This system automatically calculates all quarterly comparison data for stocks, including operating profit margins, QoQ growth, and YoY growth percentages.

## Features
- ✅ Automatic calculation of operating profit margins
- ✅ Quarter-over-Quarter (QoQ) growth percentages
- ✅ Year-over-Year (YoY) growth percentages  
- ✅ Historical quarter data storage
- ✅ Bulk recalculation for all stocks
- ✅ Easy integration with screener.in data

## Database Schema
The system uses these columns in the `quarterly_results` table:

### Current Quarter Data
- `revenue`, `profit`, `eps`, `operating_profit`, `operating_profit_margin`

### Previous Quarter Data (Q-1)
- `prev_revenue`, `prev_profit`, `prev_eps`, `prev_operating_profit`, `prev_operating_profit_margin`

### Year-Ago Data (Same Q, Previous Year)
- `year_ago_revenue`, `year_ago_profit`, `year_ago_eps`, `year_ago_operating_profit`, `year_ago_operating_profit_margin`

### Growth Metrics
- QoQ: `revenue_qoq`, `profit_qoq`, `eps_qoq`, `operating_profit_qoq`, `operating_profit_margin_qoq`
- YoY: `revenue_yoy`, `profit_yoy`, `eps_yoy`, `operating_profit_yoy`, `operating_profit_margin_yoy`

## Usage

### 1. Adding New Quarterly Results

```typescript
import { calculateQuarterlyComparisons } from './utils/quarterly-calculations.js';

const data = {
  stockId: "658fe225-13ea-4014-8532-4cded564f416",
  quarter: "Q3",
  fiscalYear: "FY2526",
  
  // Current quarter
  revenue: 67000,
  profit: 12500,
  eps: 34.50,
  operatingProfit: 18200,
  
  // Previous quarter (optional, for QoQ)
  prevRevenue: 65799,
  prevProfit: 12131,
  prevEps: 33.37,
  prevOperatingProfit: 17978,
  
  // Year ago (optional, for YoY)
  yearAgoRevenue: 61237,
  yearAgoProfit: 12502,
  yearAgoEps: 34.37,
  yearAgoOperatingProfit: 17164,
};

await calculateQuarterlyComparisons(data);
```

### 2. Bulk Recalculation
To recalculate ALL existing quarterly results:

```bash
npx tsx server/recalculate-all-quarterly-results.ts
```

### 3. Adding from Screener.in
Copy data directly from screener.in quarterly results table:

```typescript
const data = {
  stockId: "YOUR_STOCK_ID",
  quarter: "Q2",
  fiscalYear: "FY2526",
  
  // From screener columns (in Crores)
  revenue: 65799,          // Sales
  profit: 12131,           // Net Profit
  eps: 33.37,              // EPS in Rs
  operatingProfit: 17978,  // Operating Profit
  
  // Previous quarter (one column left)
  prevRevenue: 63437,
  prevProfit: 12819,
  prevEps: 35.27,
  prevOperatingProfit: 16875,
  
  // Year ago (same quarter, previous year)
  yearAgoRevenue: 64259,
  yearAgoProfit: 11955,
  yearAgoEps: 32.92,
  yearAgoOperatingProfit: 16731,
};

await calculateQuarterlyComparisons(data);
```

## Auto-Calculated Fields

The system automatically calculates:

1. **Operating Profit Margin**: `(operating_profit / revenue) * 100`
2. **Previous Quarter OPM**: `(prev_operating_profit / prev_revenue) * 100`
3. **Year-Ago OPM**: `(year_ago_operating_profit / year_ago_revenue) * 100`
4. **QoQ Growth %**: `((current - previous) / previous) * 100`
5. **YoY Growth %**: `((current - year_ago) / year_ago) * 100`
6. **Margin QoQ/YoY**: Percentage point difference

## Scripts

### quarterly-calculations.ts
Core calculation engine - use this for adding new results

### recalculate-all-quarterly-results.ts  
Bulk update all existing results

### quarterly-results-usage-examples.ts
Code examples and templates

## Database Migration

Run this SQL in Supabase to add all required columns:

```sql
-- See: server/supabase/migrations/ADD_MISSING_COLUMNS.sql
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS prev_operating_profit_margin DECIMAL(5, 2);
ALTER TABLE quarterly_results ADD COLUMN IF NOT EXISTS year_ago_operating_profit_margin DECIMAL(5, 2);
-- ... (see migration file for complete list)
```

## Example Output

```
Q2 FY2526 Quarterly Performance:
  Revenue: ₹65,799 Cr (+3.72% QoQ, +2.40% YoY)
  Net Profit: ₹12,131 Cr (-5.37% QoQ, +1.47% YoY)
  Operating Profit: ₹17,978 Cr (+6.54% QoQ, +7.45% YoY)
  Operating Margin: 27.00% (+0.00pp QoQ, +3.85pp YoY)
```

## Notes

- All percentages are rounded to 2 decimal places
- Operating margin comparisons show percentage point (pp) differences
- Missing historical data will result in null growth percentages
- The system validates data before calculation
