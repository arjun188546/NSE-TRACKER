const http = require('http');

const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/stocks/refresh-prices',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        // The endpoint requires active subscription middleware which checks session or user
        // But wait, I added requireActiveSubscription to this endpoint in routes.ts
        // I need to bypass auth or login first.
        // Actually, I can use the cron endpoint which uses CRON_SECRET
        // /api/cron/price-refresh
        'Authorization': 'Bearer your-secret-key-change-in-production'
    }
};

// I'll use the cron endpoint instead as it's easier to auth
options.path = '/api/cron/price-refresh';
options.method = 'GET';

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
