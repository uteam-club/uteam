#!/usr/bin/env ts-node

// @ts-ignore
import { db } from '../src/lib/db';
// @ts-ignore
import { gpsReport, gpsProfile } from '../src/db/schema';
import { eq, isNull } from 'drizzle-orm';
// @ts-ignore
import { buildProfileSnapshot } from '../src/services/gps/profileSnapshot.service';
// @ts-ignore
import { CANON } from '../src/canon/metrics.registry';

interface BackfillOptions {
  dryRun: boolean;
  limit?: number;
}

async function backfillProfileSnapshots(options: BackfillOptions) {
  console.log('🔄 Starting GPS profile snapshots backfill...');
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Limit: ${options.limit || 'unlimited'}`);
  console.log('');

  try {
    // Находим отчёты без profileSnapshot
    let query = db
      .select()
      .from(gpsReport)
      .where(isNull(gpsReport.profileSnapshot));

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const reports = await query;
    
    console.log(`📊 Found ${reports.length} reports without profileSnapshot`);

    if (reports.length === 0) {
      console.log('✅ No reports need backfill');
      return;
    }

    let processed = 0;
    let errors = 0;

    for (const report of reports) {
      try {
        console.log(`\n🔍 Processing report: ${report.name} (${report.id})`);

        // Загружаем профиль
        const [profile] = await db
          .select()
          .from(gpsProfile)
          .where(eq(gpsProfile.id, report.profileId));

        if (!profile) {
          console.log(`❌ Profile not found for report ${report.id}`);
          errors++;
          continue;
        }

        // Строим снапшот
        const profileSnapshot = buildProfileSnapshot({
          id: profile.id,
          gpsSystem: profile.gpsSystem,
          columnMapping: (profile.columnMapping as any) || [],
          createdAt: profile.createdAt.toISOString(),
        });

        const canonVersion = CANON.__meta.version;

        console.log(`📸 Generated snapshot with ${profileSnapshot.columns.length} columns`);
        console.log(`📋 Canon version: ${canonVersion}`);

        if (!options.dryRun) {
          // Обновляем отчёт
          await db
            .update(gpsReport)
            .set({
              profileSnapshot,
              canonVersion,
              updatedAt: new Date(),
            })
            .where(eq(gpsReport.id, report.id));

          console.log(`✅ Updated report ${report.id}`);
        } else {
          console.log(`🔍 [DRY RUN] Would update report ${report.id}`);
        }

        processed++;

      } catch (error) {
        console.error(`❌ Error processing report ${report.id}:`, error);
        errors++;
      }
    }

    console.log('\n📊 Backfill Summary:');
    console.log(`✅ Processed: ${processed}`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📋 Total: ${reports.length}`);

    if (options.dryRun) {
      console.log('\n🔍 This was a dry run. No data was modified.');
      console.log('Run with --dry-run=false to apply changes.');
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

// CLI parsing
const args = process.argv.slice(2);
const options: BackfillOptions = {
  dryRun: !args.includes('--dry-run=false'),
  limit: undefined,
};

const limitArg = args.find(arg => arg.startsWith('--limit='));
if (limitArg) {
  options.limit = parseInt(limitArg.split('=')[1], 10);
}

// Run backfill
backfillProfileSnapshots(options)
  .then(() => {
    console.log('\n🎉 Backfill completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Backfill failed:', error);
    process.exit(1);
  });
