import { supabase } from './supabase-storage';

interface PendingResult {
  symbol: string;
  name: string;
  lastQuarter: string;
  fiscalYear: string;
  expectedDate?: string;
}

async function findPendingResults(): Promise<PendingResult[]> {
  console.log('\n📅 FINDING COMPANIES WITH PENDING Q2 FY2526 RESULTS\n');
  console.log('='.repeat(70));
  
  // Get all stocks
  const { data: stocks } = await supabase
    .from('stocks')
    .select('id, symbol, name');

  if (!stocks) return [];

  const pending: PendingResult[] = [];

  for (const stock of stocks) {
    // Check if Q2 FY2526 results exist
    const { data: q2Results } = await supabase
      .from('quarterly_results')
      .select('quarter, fiscal_year')
      .eq('stock_id', stock.id)
      .eq('quarter', 'Q2')
      .eq('fiscal_year', 'FY2526')
      .single();

    if (!q2Results) {
      // Find latest available quarter
      const { data: latestResults } = await supabase
        .from('quarterly_results')
        .select('quarter, fiscal_year')
        .eq('stock_id', stock.id)
        .order('fiscal_year', { ascending: false })
        .order('quarter', { ascending: false })
        .limit(1);

      const lastQuarter = latestResults?.[0] 
        ? `${latestResults[0].quarter} ${latestResults[0].fiscalYear}`
        : 'No data';

      pending.push({
        symbol: stock.symbol,
        name: stock.name,
        lastQuarter,
        fiscalYear: 'FY2526'
      });
    }
  }

  return pending;
}

async function main() {
  const pending = await findPendingResults();
  
  console.log(`\n📊 COMPANIES WITH PENDING Q2 FY2526 RESULTS\n`);
  console.log(`Found ${pending.length} companies awaiting Q2 FY2526 results:\n`);
  
  pending.forEach((company, index) => {
    console.log(`${(index + 1).toString().padStart(2, '0')}. ${company.symbol.padEnd(12)} | ${company.name.padEnd(35)} | Last: ${company.lastQuarter}`);
  });
  
  if (pending.length === 0) {
    console.log('✅ All companies have Q2 FY2526 results published!');
  } else {
    console.log(`\n⏳ ${pending.length} companies still need to publish Q2 FY2526 results`);
    console.log('\nThese companies will be monitored for upcoming announcements...');
  }
  
  console.log('\n' + '='.repeat(70));
  
  return pending;
}

main().catch(console.error);