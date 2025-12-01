/**
 * Test Vercel Cron Endpoints Locally
 * This simulates Vercel Cron calling your endpoints
 */

const CRON_SECRET = process.env.CRON_SECRET || 'your-secret-key-change-in-production';
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

async function testCronEndpoint(name: string, path: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 Testing: ${name}`);
  console.log(`${'='.repeat(70)}`);
  
  try {
    console.log(`📡 Calling: ${BASE_URL}${path}`);
    const response = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log(`📦 Response:`, JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log(`✅ ${name} - SUCCESS`);
    } else {
      console.log(`❌ ${name} - FAILED`);
    }
  } catch (error: any) {
    console.error(`❌ ${name} - ERROR:`, error.message);
  }
}

async function testAllCronEndpoints() {
  console.log('\n🚀 Testing Vercel Cron Endpoints');
  console.log(`🔑 Using CRON_SECRET: ${CRON_SECRET.substring(0, 10)}...`);
  console.log(`🌐 Base URL: ${BASE_URL}`);

  const endpoints = [
    { name: 'Results Calendar', path: '/api/cron/results-calendar' },
    { name: 'Live Prices', path: '/api/cron/live-prices' },
    { name: 'Price Refresh', path: '/api/cron/price-refresh' },
    { name: 'Candlesticks', path: '/api/cron/candlesticks' },
    { name: 'Delivery Volume', path: '/api/cron/delivery-volume' },
    { name: 'Quarterly Financials', path: '/api/cron/quarterly-financials' }
  ];

  // Test unauthorized access first
  console.log(`\n${'='.repeat(70)}`);
  console.log('🔒 Testing Unauthorized Access Protection');
  console.log(`${'='.repeat(70)}`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/cron/live-prices`, {
      headers: {
        'Authorization': 'Bearer wrong-secret'
      }
    });
    
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 401) {
      console.log('✅ Unauthorized access correctly blocked');
    } else {
      console.log('⚠️  Warning: Unauthorized access not blocked!');
    }
  } catch (error: any) {
    console.error('❌ Error testing unauthorized access:', error.message);
  }

  // Test each endpoint
  for (const endpoint of endpoints) {
    await testCronEndpoint(endpoint.name, endpoint.path);
    
    // Wait 2 seconds between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('✅ All tests completed');
  console.log(`${'='.repeat(70)}\n`);
}

// Run tests
testAllCronEndpoints().catch(console.error);
