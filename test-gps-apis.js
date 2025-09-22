// Тестирование GPS API endpoints

const testEndpoints = [
  '/api/gps/canonical-metrics',
  '/api/gps/canonical-metrics-all', 
  '/api/gps/canonical-metrics-for-mapping',
  '/api/gps/units',
  '/api/gps/profiles'
];

async function testEndpoint(endpoint) {
  try {
    const response = await fetch(`http://localhost:3000${endpoint}`);
    const data = await response.json();
    
    console.log(`✅ ${endpoint}: ${response.status} - ${data.metrics?.length || data.length || 'N/A'} items`);
    
    if (response.status !== 200) {
      console.log(`   Error: ${data.error || data.message}`);
    }
  } catch (error) {
    console.log(`❌ ${endpoint}: ${error.message}`);
  }
}

async function testAllEndpoints() {
  console.log('🧪 Testing GPS API endpoints...\n');
  
  for (const endpoint of testEndpoints) {
    await testEndpoint(endpoint);
  }
  
  console.log('\n✅ API testing completed!');
}

testAllEndpoints();
