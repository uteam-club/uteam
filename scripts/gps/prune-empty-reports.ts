#!/usr/bin/env tsx

import { Client } from 'pg';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';

// Загружаем переменные окружения
config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

interface PruneCandidate {
  id: string;
  name: string;
  rows_count: number;
  cols_count: number;
}

async function pruneEmptyReports() {
  const log: string[] = [];
  const pruneCandidates: PruneCandidate[] = [];
  
  function addLog(message: string) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    log.push(logMessage);
  }

  try {
    await client.connect();
    addLog('🔌 Connected to database for pruning empty reports');

    // Находим кандидатов на удаление
    const candidatesResult = await client.query(`
      SELECT id, name,
             COALESCE(jsonb_array_length("processedData"->'canonical'->'rows'),0) AS rows_count,
             CASE WHEN jsonb_typeof("profileSnapshot"->'columns')='array' 
                  THEN jsonb_array_length("profileSnapshot"->'columns') ELSE 0 END AS cols_count
      FROM public."GpsReport"
      ORDER BY name, "createdAt"
    `);

    addLog(`📊 Found ${candidatesResult.rows.length} total reports`);

    // Фильтруем кандидатов (rows_count=0 OR cols_count=0, включая старые демо-отчёты с 0 строк)
    const candidates = candidatesResult.rows.filter(row => {
      const isEmpty = row.rows_count === 0 || row.cols_count === 0;
      return isEmpty;
    });

    addLog(`🎯 Found ${candidates.length} empty reports to prune (including old demo reports with 0 rows)`);

    if (candidates.length === 0) {
      addLog('✅ Nothing to prune - no empty reports found');
      return;
    }

    // Сохраняем кандидатов в JSONL
    const jsonlContent = candidates.map(candidate => 
      JSON.stringify({
        id: candidate.id,
        name: candidate.name,
        rows_count: candidate.rows_count,
        cols_count: candidate.cols_count
      })
    ).join('\n');

    writeFileSync('artifacts/prune-empty-reports.jsonl', jsonlContent);
    addLog(`📝 Saved ${candidates.length} candidates to artifacts/prune-empty-reports.jsonl`);

    // Удаляем батчами по 200
    const batchSize = 200;
    let deletedCount = 0;

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      const batchIds = batch.map(c => c.id);

      try {
        await client.query('BEGIN');
        
        const deleteResult = await client.query(`
          DELETE FROM public."GpsReport" 
          WHERE id = ANY($1::uuid[])
        `, [batchIds]);

        await client.query('COMMIT');
        
        deletedCount += deleteResult.rowCount || 0;
        addLog(`✅ Deleted batch ${Math.floor(i/batchSize) + 1}: ${deleteResult.rowCount || 0} reports`);

      } catch (error) {
        await client.query('ROLLBACK');
        addLog(`❌ Error deleting batch ${Math.floor(i/batchSize) + 1}: ${error}`);
        throw error;
      }
    }

    addLog(`🎉 Pruning completed: ${deletedCount} reports deleted`);

  } catch (error) {
    addLog(`💥 Fatal error: ${error}`);
    throw error;
  } finally {
    await client.end();
    addLog('🔌 Database connection closed');
  }

  // Сохраняем лог
  writeFileSync('artifacts/prune-empty-reports.log', log.join('\n'));
  addLog('📝 Log saved to artifacts/prune-empty-reports.log');
}

// Запускаем pruning
pruneEmptyReports().catch(console.error);
