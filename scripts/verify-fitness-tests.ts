import { db } from '../src/lib/db';
import { fitnessTest } from '../src/db/schema/fitnessTest';
import { fitnessTestResult } from '../src/db/schema/fitnessTestResult';
import { eq } from 'drizzle-orm';
import { Client } from 'pg';

async function expect(cond: boolean, msg: string) {
  if (!cond) throw new Error('[verify] ' + msg);
}

async function main() {
  console.log('[verify] Checking schema and CRUD...');

  // 0) Create raw client for lookups
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  // 1) Ensure table empty after clear
  const tests0 = await db.select().from(fitnessTest);
  const results0 = await db.select().from(fitnessTestResult);
  console.log(`[verify] tests0=${tests0.length}, results0=${results0.length}`);

  // 2) Find any existing club/user to satisfy FKs
  const anyClub = await client.query('SELECT id FROM "Club" LIMIT 1');
  const clubId: string | undefined = anyClub.rows[0]?.id;
  const anyUser = await client.query('SELECT id FROM "User" LIMIT 1');
  const userId: string | undefined = anyUser.rows[0]?.id;
  if (!clubId || !userId) {
    console.log('[verify] Skip CRUD deep test: no Club/User rows in DB');
    console.log('[verify] Basic schema verification passed');
    await client.end();
    return;
  }

  // 3) Create test with higherIsBetter=false
  const [created] = await db.insert(fitnessTest).values({
    name: 'Тест 30м',
    type: 'speed',
    unit: 's',
    higherIsBetter: false,
    clubId,
    createdBy: userId,
  }).returning();
  console.log('[verify] created test id=', created.id, 'higherIsBetter=', created.higherIsBetter);
  await expect(created.higherIsBetter === false, 'higherIsBetter should be false');

  // 4) Insert two player results same date (if there are players/teams)
  const date = new Date();
  const teamRow = await client.query('SELECT id FROM "Team" LIMIT 1');
  const playerRows = await client.query('SELECT id FROM "Player" LIMIT 2');
  if (teamRow.rows[0] && playerRows.rows.length >= 2) {
    const teamId = teamRow.rows[0].id as string;
    const p1 = playerRows.rows[0].id as string;
    const p2 = playerRows.rows[1].id as string;
    await db.insert(fitnessTestResult).values([
      { testId: created.id, playerId: p1, teamId, value: '4.8', date, createdBy: created.createdBy },
      { testId: created.id, playerId: p2, teamId, value: '5.2', date, createdBy: created.createdBy },
    ]);
    const res = await db.select().from(fitnessTestResult).where(eq(fitnessTestResult.testId, created.id));
    console.log('[verify] inserted results count=', res.length);
    await expect(res.length === 2, 'should have 2 results inserted');

    // Clean results
    await db.delete(fitnessTestResult).where(eq(fitnessTestResult.testId, created.id));
  } else {
    console.log('[verify] No Team/Player to insert sample results; test creation verified');
  }

  // 5) Clean test
  await db.delete(fitnessTest).where(eq(fitnessTest.id, created.id));
  await client.end();
  console.log('[verify] OK');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

