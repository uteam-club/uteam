#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
import { buildProfileSnapshot } from '../../src/services/gps/profileSnapshot.service';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function backfillEmptySnapshotColumns() {
  const log: string[] = [];
  
  function addLog(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    log.push(logMessage);
  }

  try {
    await client.connect();
    addLog('🔌 Connected to database for backfill');

    // Находим отчёты с пустыми snapshot.columns
    const reportsResult = await client.query(`
      SELECT id, name, "profileId", "profileSnapshot"
      FROM public."GpsReport"
      WHERE "profileSnapshot" IS NOT NULL 
        AND (jsonb_typeof("profileSnapshot"->'columns')='array' 
             AND jsonb_array_length("profileSnapshot"->'columns')=0)
    `);

    addLog(`📊 Found ${reportsResult.rows.length} reports with empty snapshot.columns`);

    if (reportsResult.rows.length === 0) {
      addLog('✅ No reports need backfill');
      return;
    }

    let updatedCount = 0;

    for (const report of reportsResult.rows) {
      try {
        // Загружаем профиль
        const profileResult = await client.query(`
          SELECT id, name, "gpsSystem", "columnMapping", "createdAt"
          FROM public."GpsProfile"
          WHERE id = $1
        `, [report.profileId]);

        if (profileResult.rows.length === 0) {
          addLog(`⚠️  Profile not found for report ${report.id} (${report.name})`);
          continue;
        }

        const profile = {
          id: profileResult.rows[0].id,
          gpsSystem: profileResult.rows[0].gpsSystem,
          sport: 'football',
          version: 1,
          columnMapping: profileResult.rows[0].columnMapping || [],
          createdAt: profileResult.rows[0].createdAt.toISOString()
        };

        // Строим snapshot
        const snapshot = buildProfileSnapshot(profile);

        // Обновляем отчёт
        await client.query(`
          UPDATE public."GpsReport"
          SET "profileSnapshot" = $1,
              "importMeta" = COALESCE("importMeta",'{}'::jsonb) || jsonb_build_object(
                'backfill', true, 
                'backfillSource', 'profile_snapshot_fix', 
                'backfillAt', to_char(now(),'YYYY-MM-DD"T"HH24:MI:SS"Z"')
              )
          WHERE id = $2
        `, [JSON.stringify(snapshot), report.id]);

        addLog(`✅ Updated report ${report.id} (${report.name}) - ${snapshot.columns.length} columns`);
        updatedCount++;

      } catch (error) {
        addLog(`❌ Error updating report ${report.id}: ${error}`);
      }
    }

    addLog(`🎉 Backfill completed: ${updatedCount} reports updated`);

  } catch (error) {
    addLog(`💥 Fatal error: ${error}`);
    throw error;
  } finally {
    await client.end();
    addLog('🔌 Database connection closed');
  }

  // Сохраняем лог
  writeFileSync('artifacts/backfill-empty-snapshot-columns.log', log.join('\n'));
  addLog('📝 Log saved to artifacts/backfill-empty-snapshot-columns.log');
}

// Запускаем backfill
backfillEmptySnapshotColumns().catch(console.error);
