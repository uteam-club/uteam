async function testGpsEventsApi() {
  try {
    console.log('Testing GPS events API...');
    
    const response = await fetch('http://localhost:3000/api/gps/events?teamId=7e745809-4734-4c67-9c10-1de213261fb4&eventType=match');
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testGpsEventsApi();
