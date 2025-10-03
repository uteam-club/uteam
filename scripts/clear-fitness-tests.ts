import { db } from '../src/lib/db';
import { fitnessTest } from '../src/db/schema/fitnessTest';
import { fitnessTestResult } from '../src/db/schema/fitnessTestResult';

async function main() {
  console.log('[fitness:clear] Starting...');
  // 1) Delete all results (cascade manually to be explicit)
  const delResults = await db.delete(fitnessTestResult);
  console.log(`[fitness:clear] Deleted results`);

  // 2) Delete all tests
  const delTests = await db.delete(fitnessTest);
  console.log(`[fitness:clear] Deleted tests`);

  console.log('[fitness:clear] Done.');
}

main().catch((e) => {
  console.error('[fitness:clear] Error:', e);
  process.exit(1);
});

