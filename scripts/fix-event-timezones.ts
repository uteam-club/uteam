import { db } from '../src/lib/db';
import { training } from '../src/db/schema/training';
import { match } from '../src/db/schema/match';
import { team } from '../src/db/schema/team';
import { eq } from 'drizzle-orm';

async function main() {
  // Получаем все команды с их таймзонами
  const teams = await db.select().from(team);
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.timezone]));

  // Обновляем тренировки без таймзоны
  const trainings = await db.select().from(training);
  for (const t of trainings) {
    if (!t.timezone && t.teamId && teamMap[t.teamId]) {
      await db.update(training).set({ timezone: teamMap[t.teamId] }).where(eq(training.id, t.id));
      console.log(`Тренировка ${t.title} (${t.id}) — установлена таймзона ${teamMap[t.teamId]}`);
    }
  }

  // Обновляем матчи без таймзоны
  const matches = await db.select().from(match);
  for (const m of matches) {
    if (!m.timezone && m.teamId && teamMap[m.teamId]) {
      await db.update(match).set({ timezone: teamMap[m.teamId] }).where(eq(match.id, m.id));
      console.log(`Матч ${m.competitionType} (${m.id}) — установлена таймзона ${teamMap[m.teamId]}`);
    }
  }

  console.log('Обновление завершено.');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); }); 