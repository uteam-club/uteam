// Простой тест API без SSL
const https = require('https');
const http = require('http');

async function testApi() {
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/gps/events?teamId=7e745809-4734-4c67-9c10-1de213261fb4&eventType=match',
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  const req = http.request(options, (res) => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response body:', data);
    });
  });

  req.on('error', (error) => {
    console.error('Error:', error);
  });

  req.end();
}

testApi();
