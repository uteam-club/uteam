import { db } from '../src/lib/db';
import { training } from '../src/db/schema/training';
import { match } from '../src/db/schema/match';

async function main() {
  const trainings = await db.select().from(training);
  const matches = await db.select().from(match);
  console.log('Тренировки:');
  trainings.forEach(t => console.log(`${t.title} | ${t.date?.toISOString?.()} | timezone: ${t.timezone}`));
  console.log('\nМатчи:');
  matches.forEach(m => console.log(`${m.competitionType} | ${m.date?.toISOString?.()} | timezone: ${m.timezone}`));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); }); 