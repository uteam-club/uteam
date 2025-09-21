const { db } = require('./src/lib/db');
const { match } = require('./src/db/schema/match');

async function checkMatches() {
  try {
    console.log('Checking matches in database...');
    
    // Получаем все матчи
    const allMatches = await db.select().from(match);
    console.log('Total matches:', allMatches.length);
    
    if (allMatches.length > 0) {
      console.log('Sample match:', allMatches[0]);
      
      // Проверяем матчи для конкретной команды
      const teamId = '7e745809-4734-4c67-9c10-1de213261fb4';
      const teamMatches = allMatches.filter(m => m.teamId === teamId);
      console.log(`Matches for team ${teamId}:`, teamMatches.length);
      
      if (teamMatches.length > 0) {
        console.log('Sample team match:', teamMatches[0]);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking matches:', error);
    process.exit(1);
  }
}

checkMatches();