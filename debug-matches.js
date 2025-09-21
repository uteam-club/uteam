import { db } from './src/lib/db.js';
import { match } from './src/db/schema/match.js';
import { eq } from 'drizzle-orm';

async function checkMatches() {
  try {
    console.log('Checking matches in database...');
    
    // Получаем все матчи
    const allMatches = await db.select().from(match);
    console.log('Total matches in database:', allMatches.length);
    
    if (allMatches.length > 0) {
      console.log('Sample matches:');
      allMatches.slice(0, 5).forEach(m => {
        console.log(`- ID: ${m.id}, Team: ${m.teamId}, Opponent: ${m.opponentName}, Date: ${m.date}, Club: ${m.clubId}`);
      });
    }
    
    // Проверяем матчи для конкретного клуба (если есть)
    const clubMatches = await db.select().from(match).where(eq(match.clubId, 'default-club'));
    console.log('Matches for default-club:', clubMatches.length);
    
  } catch (error) {
    console.error('Error checking matches:', error);
  }
}

checkMatches();
