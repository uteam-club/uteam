import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { match } from './src/db/schema/match.js';
import { eq, and } from 'drizzle-orm';

async function debugMatchData() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/uteam';
  const client = postgres(connectionString);
  const db = drizzle(client);

  try {
    console.log('Checking match data for team:', '7e745809-4734-4c67-9c10-1de213261fb4');
    
    // Проверяем все матчи для команды
    const matches = await db.select().from(match).where(
      and(
        eq(match.teamId, '7e745809-4734-4c67-9c10-1de213261fb4'),
        eq(match.clubId, 'default-club')
      )
    );
    
    console.log('Found matches:', matches.length);
    console.log('Matches:', matches.map(m => ({
      id: m.id,
      opponentName: m.opponentName,
      date: m.date,
      teamId: m.teamId,
      clubId: m.clubId
    })));
    
    // Проверяем все матчи в системе
    const allMatches = await db.select().from(match).limit(10);
    console.log('\nAll matches (first 10):', allMatches.map(m => ({
      id: m.id,
      opponentName: m.opponentName,
      date: m.date,
      teamId: m.teamId,
      clubId: m.clubId
    })));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugMatchData();
