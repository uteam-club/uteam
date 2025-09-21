#!/usr/bin/env tsx

import { db } from '../src/lib/db';
import { gpsColumnMapping } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { detectSourceUnitFromColumnName, getCanonicalUnitForMetric } from '../src/lib/canonical-metrics';

interface GpsColumnMappingRow {
  id: string;
  sourceColumn: string;
  canonicalMetric: string;
  sourceUnit: string | null;
}

async function backfillSourceUnits() {
  console.log('🔄 Starting sourceUnit backfill...');

  try {
    // Get all column mappings that don't have sourceUnit set
    const mappings = await db
      .select({
        id: gpsColumnMapping.id,
        sourceColumn: gpsColumnMapping.sourceColumn,
        canonicalMetric: gpsColumnMapping.canonicalMetric,
        sourceUnit: gpsColumnMapping.sourceUnit,
      })
      .from(gpsColumnMapping)
      .where(eq(gpsColumnMapping.sourceUnit, null));

    console.log(`📊 Found ${mappings.length} mappings without sourceUnit`);

    let updated = 0;
    let errors = 0;

    for (const mapping of mappings) {
      try {
        // Try to detect source unit from column name
        const detectedUnit = detectSourceUnitFromColumnName(
          mapping.sourceColumn, 
          mapping.canonicalMetric
        );
        
        // Use detected unit or fallback to canonical unit
        const sourceUnit = detectedUnit || getCanonicalUnitForMetric(mapping.canonicalMetric);

        // Update the mapping
        await db
          .update(gpsColumnMapping)
          .set({ sourceUnit })
          .where(eq(gpsColumnMapping.id, mapping.id));

        console.log(`✅ Updated ${mapping.sourceColumn} -> ${mapping.canonicalMetric} with sourceUnit: ${sourceUnit}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating mapping ${mapping.id}:`, error);
        errors++;
      }
    }

    console.log(`\n📈 Backfill completed:`);
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${mappings.length}`);

  } catch (error) {
    console.error('💥 Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillSourceUnits()
  .then(() => {
    console.log('🎉 Backfill completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backfill failed:', error);
    process.exit(1);
  });
