import 'dotenv/config';
import { db } from '../src/lib/db';
import { gpsColumnMapping } from '../src/db/schema/gpsColumnMapping';
import { eq, isNull } from 'drizzle-orm';
import canonical from '../src/canon/canonical_metrics_grouped_v1.0.1.json';

// простой helper
function getCanonicalUnitForMetric(metricKey: string): string | null {
  const m = canonical.metrics.find((x: any) => x.key === metricKey);
  if (!m) return null;
  const dim = canonical.dimensions[m.dimension as keyof typeof canonical.dimensions];
  return dim?.canonical_unit ?? null;
}

async function main() {
  console.log('[backfill] Starting displayUnit backfill...');
  
  try {
    // Сначала проверим, существует ли колонка display_unit
    const testQuery = await db.select().from(gpsColumnMapping).limit(1);
    console.log('[backfill] Database connection successful');
    
    // Проверим структуру таблицы
    const sampleRow = testQuery[0];
    if (sampleRow) {
      console.log('[backfill] Sample row keys:', Object.keys(sampleRow));
      if ('displayUnit' in sampleRow) {
        console.log('[backfill] displayUnit column exists');
      } else {
        console.log('[backfill] displayUnit column does not exist in database');
        console.log('[backfill] Please run database migration first');
        return;
      }
    }
    
    const rows = await db.select().from(gpsColumnMapping).where(isNull(gpsColumnMapping.displayUnit));
    if (!rows.length) {
      console.log('[backfill] nothing to update');
      return;
    }
    
    console.log(`[backfill] Found ${rows.length} rows with NULL displayUnit`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const r of rows) {
      const unit = getCanonicalUnitForMetric(r.canonicalMetric as string);
      if (!unit) {
        console.warn('[backfill] skip mapping without canonical unit', r.id, r.canonicalMetric);
        skipped++;
        continue;
      }
      
      try {
        await db.update(gpsColumnMapping)
          .set({ displayUnit: unit })
          .where(eq(gpsColumnMapping.id, r.id));
        updated++;
        console.log(`[backfill] Updated mapping ${r.id} (${r.canonicalMetric}) -> ${unit}`);
      } catch (error) {
        console.error(`[backfill] Failed to update mapping ${r.id}:`, error);
        skipped++;
      }
    }
    
    console.log(`[backfill] Done! Updated: ${updated}, Skipped: ${skipped}`);
  } catch (error) {
    console.error('[backfill] Database error:', error);
    console.log('[backfill] Please ensure database migration is applied first');
  }
}

main().catch((e) => {
  console.error('[backfill] Error:', e);
  process.exit(1);
});
