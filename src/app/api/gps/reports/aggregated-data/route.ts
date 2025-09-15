import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { gpsReport, gpsColumnMapping, gpsPlayerMapping } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { readFile } from 'fs/promises';
import { join } from 'path';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.clubId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { reportIds } = await request.json();

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json({ error: 'Report IDs are required' }, { status: 400 });
    }

    // Убрали отладочный лог

    // Получаем GPS отчеты
    const reports = await db
      .select()
      .from(gpsReport)
      .where(and(
        eq(gpsReport.clubId, session.user.clubId),
        inArray(gpsReport.id, reportIds)
      ));

    if (reports.length === 0) {
      return NextResponse.json({ error: 'No reports found' }, { status: 404 });
    }

    // Получаем column mappings для всех отчетов
    let columnMappings: any[] = [];
    let playerMappings: any[] = [];
    try {
      const reportIds = reports.map(r => r.id).filter(id => id); // Фильтруем undefined значения
      if (reportIds.length === 0) {
        columnMappings = [];
        playerMappings = [];
      } else {
        // Получаем профили для отчетов, а затем маппинги для этих профилей
        const reportProfiles = reports.map(r => r.gpsProfileId).filter((id): id is string => id !== null);
        
        if (reportProfiles.length === 0) {
          columnMappings = [];
        } else {
          columnMappings = await db
            .select()
            .from(gpsColumnMapping)
            .where(inArray(gpsColumnMapping.gpsProfileId, reportProfiles));
        }
        
        // Получаем маппинги игроков для всех отчетов
        playerMappings = await db
          .select()
          .from(gpsPlayerMapping)
          .where(inArray(gpsPlayerMapping.gpsReportId, reportIds));
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      // Продолжаем без mappings - будет использоваться старая логика
      columnMappings = [];
      playerMappings = [];
    }

    // Читаем данные из файлов, как в /api/gps/reports/[id]/data
    const aggregatedData: Record<string, number[]> = {};
    let totalPlayers = 0;
    

    for (const report of reports) {
      if (!report.filePath) {
        console.log(`Report ${report.id} has no filePath`);
        continue;
      }

      try {
        console.log(`Processing report ${report.id} from file: ${report.filePath}`);
        
        // Читаем файл
        const fileBuffer = await readFile(report.filePath);
        let rawData: any[] = [];

        // Обрабатываем файл в зависимости от расширения
        const fileExtension = report.fileName?.split('.').pop()?.toLowerCase();
        
        if (fileExtension === 'csv') {
          // Обрабатываем CSV файл
          const csvText = fileBuffer.toString('utf-8');
          const result = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (header) => header.trim(),
          });
          
          if (result.errors.length > 0) {
            console.warn('CSV parsing errors:', result.errors);
          }
          
          rawData = result.data as any[];
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          // Обрабатываем Excel файл
          const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const excelData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (excelData.length > 0) {
            const headers = excelData[0] as string[];
            const rows = excelData.slice(1) as any[][];
            rawData = rows.map((row: any[]) => {
              const obj: any = {};
              headers.forEach((header, index) => {
                obj[header] = row[index];
              });
              return obj;
            });
          }
        } else {
          console.log(`Unsupported file format: ${fileExtension}`);
          continue;
        }

        // Убрали отладочный лог

        // Получаем mappings для этого отчета
        const reportMappings = columnMappings.filter(m => m.gpsProfileId === report.gpsProfileId);
        const reportPlayerMappings = playerMappings.filter(m => m.gpsReportId === report.id);
        
        // Создаем Set с индексами строк, которые должны учитываться
        // Учитываем только строки с привязанными игроками (playerId !== null)
        const validRowIndexes = new Set(
          reportPlayerMappings
            .filter(m => m.playerId !== null)
            .map(m => m.rowIndex)
        );
        
        const validMappings = reportPlayerMappings.filter(m => m.playerId !== null);
        console.log(`[DEBUG] Report ${report.id} player mappings: ${reportPlayerMappings.length} total, ${validMappings.length} with players`);
        console.log(`[DEBUG] Player mappings:`, reportPlayerMappings.map(m => ({ rowIndex: m.rowIndex, playerId: m.playerId })));
        console.log(`[DEBUG] Valid row indexes: ${Array.from(validRowIndexes).join(', ')}`);
        console.log(`[DEBUG] Raw data length: ${rawData.length}`);
        
        
        // Обрабатываем данные
        let reportPlayers = 0;
        let reportZone4Values: number[] = [];
        let skippedPlayers = 0;
        
        for (let rowIndex = 0; rowIndex < rawData.length; rowIndex++) {
          const row = rawData[rowIndex];
          if (typeof row !== 'object' || row === null) continue;
          
          // Фильтруем по маппингам игроков, если они есть
          if (reportPlayerMappings.length > 0 && !validRowIndexes.has(rowIndex)) {
            skippedPlayers++;
            continue; // Пропускаем строки, которые не в маппингах игроков
          }
          
          totalPlayers++;
          reportPlayers++;
          
          if (reportMappings.length > 0) {
            // Используем mappings если они есть
            for (const mapping of reportMappings) {
              const value = row[mapping.sourceColumn];
              
              if (typeof value === 'number' && !isNaN(value)) {
                if (!aggregatedData[mapping.canonicalMetric]) {
                  aggregatedData[mapping.canonicalMetric] = [];
                }
                aggregatedData[mapping.canonicalMetric].push(value);
                
                // Собираем Zone 4 значения для отладки
                if (mapping.canonicalMetric === 'distance_zone4_m') {
                  reportZone4Values.push(value);
                }
              } else if (typeof value === 'string' && value.includes(':')) {
                // Обрабатываем время в формате HH:MM:SS
                const timeMatch = value.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
                if (timeMatch) {
                  const hours = parseInt(timeMatch[1]);
                  const minutes = parseInt(timeMatch[2]);
                  const seconds = parseInt(timeMatch[3]);
                  const totalMinutes = hours * 60 + minutes + seconds / 60;
                  
                  if (!aggregatedData[mapping.canonicalMetric]) {
                    aggregatedData[mapping.canonicalMetric] = [];
                  }
                  aggregatedData[mapping.canonicalMetric].push(totalMinutes);
                }
              }
            }
          } else {
            // Fallback: используем старую логику (названия колонок из файлов)
            for (const [key, value] of Object.entries(row)) {
              if (typeof value === 'number' && !isNaN(value)) {
                if (!aggregatedData[key]) {
                  aggregatedData[key] = [];
                }
                aggregatedData[key].push(value);
                
                // Собираем Zone 4 значения для отладки (fallback)
                if (key.includes('з 4') || key.includes('Zone 4')) {
                  reportZone4Values.push(value);
                }
              } else if (typeof value === 'string' && value.includes(':')) {
                // Обрабатываем время в формате HH:MM:SS
                const timeMatch = value.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
                if (timeMatch) {
                  const hours = parseInt(timeMatch[1]);
                  const minutes = parseInt(timeMatch[2]);
                  const seconds = parseInt(timeMatch[3]);
                  const totalMinutes = hours * 60 + minutes + seconds / 60;
                  
                  if (!aggregatedData[key]) {
                    aggregatedData[key] = [];
                  }
                  aggregatedData[key].push(totalMinutes);
                }
              }
            }
          }
        }
        
        // Логи для каждого отчета
        console.log(`[DEBUG] Report ${report.id} processing summary:`);
        console.log(`  - Total rows in file: ${rawData.length}`);
        console.log(`  - Player mappings: ${reportPlayerMappings.length}`);
        console.log(`  - Players processed: ${reportPlayers}`);
        console.log(`  - Players skipped: ${skippedPlayers}`);
        console.log(`  - Zone 4 values: ${reportZone4Values.length}`);
        
      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error);
        continue;
      }
    }

    // Вычисляем средние значения
    const averages: Record<string, number> = {};
    for (const [column, values] of Object.entries(aggregatedData)) {
      if (values.length > 0) {
        averages[column] = values.reduce((sum, val) => sum + val, 0) / values.length;
        
      }
    }

    // Отладочные логи для понимания агрегированных данных
    // console.log('[API DEBUG] Aggregated averages:', averages);
    // console.log('[API DEBUG] Averages keys:', Object.keys(averages));

    return NextResponse.json({
      averages,
      totalPlayers,
      totalReports: reports.length,
      columns: Object.keys(averages)
    });

  } catch (error) {
    console.error('Error aggregating GPS data:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
