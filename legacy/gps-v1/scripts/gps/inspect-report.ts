import { Client } from 'pg';
import { config } from 'dotenv';
import { writeFileSync, readFileSync } from 'fs';

// Загружаем переменные окружения
config();

interface ReportInspection {
  reportId: string;
  reportName: string;
  gpsSystem: string;
  rowsCount: number;
  columns: Array<{
    displayName: string;
    canonicalKey: string;
    order: number;
    isVisible: boolean;
  }>;
  hasProfileSnapshot: boolean;
  hasProcessedData: boolean;
}

async function inspectReports(): Promise<void> {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('🔌 Connected to database for report inspection');

    // Получаем ID отчётов из verify-demo.txt
    const verifyContent = readFileSync('artifacts/verify-demo.txt', 'utf8');
    const lines = verifyContent.split('\n');
    
    const reportIds: string[] = [];
    for (const line of lines) {
      if (line.includes('Demo Report: http://localhost:3000/dev/gps-report/')) {
        const id = line.split('/dev/gps-report/')[1];
        if (id) reportIds.push(id);
      }
    }

    console.log(`📊 Found ${reportIds.length} report IDs to inspect`);

    const inspections: ReportInspection[] = [];

    for (const reportId of reportIds) {
      const result = await client.query(`
        SELECT 
          id, name, "gpsSystem", "profileSnapshot", "processedData"
        FROM public."GpsReport"
        WHERE id = $1
      `, [reportId]);

      if (result.rows.length === 0) {
        console.log(`⚠️  Report ${reportId} not found`);
        continue;
      }

      const row = result.rows[0];
      const profileSnapshot = row.profilesnapshot || { columns: [] };
      const processedData = row.processeddata || { canonical: { rows: [] } };

      // Извлекаем колонки в порядке order, только видимые
      const visibleColumns = profileSnapshot.columns
        .filter((col: any) => col.isVisible)
        .sort((a: any, b: any) => a.order - b.order)
        .map((col: any) => ({
          displayName: col.displayName,
          canonicalKey: col.canonicalKey,
          order: col.order,
          isVisible: col.isVisible
        }));

      const inspection: ReportInspection = {
        reportId: row.id,
        reportName: row.name,
        gpsSystem: row.gpssystem,
        rowsCount: processedData.canonical?.rows?.length || 0,
        columns: visibleColumns,
        hasProfileSnapshot: !!row.profilesnapshot,
        hasProcessedData: !!row.processeddata
      };

      inspections.push(inspection);
      console.log(`✅ Inspected ${row.name}: ${inspection.rowsCount} rows, ${visibleColumns.length} columns`);
    }

    // Сохраняем JSON
    writeFileSync('artifacts/ui-inspect.json', JSON.stringify(inspections, null, 2));
    console.log('💾 Saved artifacts/ui-inspect.json');

    // Создаём Markdown отчёт
    let markdown = '# GPS Report UI Inspection\n\n';
    markdown += `**Inspection Date**: ${new Date().toISOString()}\n`;
    markdown += `**Total Reports**: ${inspections.length}\n\n`;

    for (const inspection of inspections) {
      markdown += `## ${inspection.reportName}\n\n`;
      markdown += `- **ID**: ${inspection.reportId}\n`;
      markdown += `- **System**: ${inspection.gpsSystem}\n`;
      markdown += `- **Rows Count**: ${inspection.rowsCount}\n`;
      markdown += `- **Has Profile Snapshot**: ${inspection.hasProfileSnapshot}\n`;
      markdown += `- **Has Processed Data**: ${inspection.hasProcessedData}\n\n`;

      markdown += `### Visible Columns (${inspection.columns.length})\n\n`;
      markdown += '| Order | Display Name | Canonical Key |\n';
      markdown += '|-------|--------------|---------------|\n';
      
      for (const col of inspection.columns) {
        markdown += `| ${col.order} | ${col.displayName} | ${col.canonicalKey} |\n`;
      }
      markdown += '\n';
    }

    writeFileSync('artifacts/ui-inspect.md', markdown);
    console.log('💾 Saved artifacts/ui-inspect.md');

  } catch (error) {
    console.error('❌ Inspection failed:', error);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Запускаем инспекцию
inspectReports().catch(console.error);
