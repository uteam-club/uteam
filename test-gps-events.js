// Простой тест для проверки API GPS событий
async function testGpsEvents() {
  try {
    console.log('Testing GPS events API...');
    
    // Тестируем загрузку команд
    const teamsResponse = await fetch('http://localhost:3000/api/gps/teams');
    const teamsData = await teamsResponse.json();
    console.log('Teams response:', teamsData);
    
    if (teamsData.teams && teamsData.teams.length > 0) {
      const teamId = teamsData.teams[0].id;
      console.log('Testing with team ID:', teamId);
      
      // Тестируем загрузку матчей
      const matchesResponse = await fetch(`http://localhost:3000/api/gps/events?teamId=${teamId}&eventType=match`);
      const matchesData = await matchesResponse.json();
      console.log('Matches response:', matchesData);
      
      // Тестируем загрузку тренировок
      const trainingsResponse = await fetch(`http://localhost:3000/api/gps/events?teamId=${teamId}&eventType=training`);
      const trainingsData = await trainingsResponse.json();
      console.log('Trainings response:', trainingsData);
    }
    
  } catch (error) {
    console.error('Error testing GPS events:', error);
  }
}

testGpsEvents();
