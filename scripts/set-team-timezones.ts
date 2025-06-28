import { db } from '../src/lib/db';
import { team } from '../src/db/schema/team';
import { inArray, eq } from 'drizzle-orm';

async function main() {
  await db.update(team).set({ timezone: 'Europe/Moscow' }).where(inArray(team.name, ['FDC Vista', 'Junior 2012']));
  await db.update(team).set({ timezone: 'Asia/Yerevan' }).where(eq(team.name, 'FC Alashkert'));
  const teams = await db.select().from(team);
  console.log('Текущие таймзоны команд:');
  teams.forEach(t => console.log(`${t.name}: ${t.timezone}`));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); }); 