import { db } from '@/lib/db';
import { 
  gpsReport, 
  gpsReportData, 
  gpsDataChangeLog,
  gpsCanonicalMetric,
  gpsUnit,
  gpsColumnMapping
} from '@/db/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { 
  GpsReport, 
  GpsReportData, 
  GpsCanonicalMetric, 
  GpsUnit,
  GpsColumnMapping,
  CreateGpsReportRequest
} from '@/types/gps';

// GPS Reports services
export async function getGpsReportsByClubId(clubId: string): Promise<GpsReport[]> {
  try {
    const reports = await db
      .select()
      .from(gpsReport)
      .where(eq(gpsReport.clubId, clubId))
      .orderBy(desc(gpsReport.createdAt));
    
    return reports.map(report => ({
      ...report,
      fileSize: report.fileSize || 0,
      eventType: report.eventType as 'training' | 'match',
 // TODO: fileColumns will be stored in column mappings
      status: report.status as 'uploaded' | 'processed' | 'error',
      playersCount: report.playersCount || 0,
      hasEdits: report.hasEdits || false,
      // Добавляем поля для совместимости со старым интерфейсом
      trainingId: report.eventType === 'training' ? report.eventId : null,
      matchId: report.eventType === 'match' ? report.eventId : null,
    }));
  } catch (error) {
    console.error('Error fetching GPS reports by club id:', error);
    return [];
  }
}

export async function getGpsReportById(id: string, clubId: string): Promise<GpsReport | null> {
  try {
    const [result] = await db
      .select()
      .from(gpsReport)
      .where(and(eq(gpsReport.id, id), eq(gpsReport.clubId, clubId)))
      .limit(1);
    
    if (!result) return null;
    
    return {
      ...result,
      fileSize: result.fileSize || 0,
      eventType: result.eventType as 'training' | 'match',
 // TODO: fileColumns will be stored in column mappings
      status: result.status as 'uploaded' | 'processed' | 'error',
      playersCount: result.playersCount || 0,
      hasEdits: result.hasEdits || false,
      // Добавляем поля для совместимости со старым интерфейсом
      trainingId: result.eventType === 'training' ? result.eventId : null,
      matchId: result.eventType === 'match' ? result.eventId : null,
    };
  } catch (error) {
    console.error('Error fetching GPS report by id:', error);
    return null;
  }
}

export async function createGpsReport(data: CreateGpsReportRequest, clubId: string, uploadedById: string): Promise<GpsReport | null> {
  try {
    const [report] = await db
      .insert(gpsReport)
      .values({
        name: data.name,
        fileName: data.fileName,
        fileUrl: '', // Временное значение
        gpsSystem: 'unknown',
        eventType: data.eventType,
        eventId: data.eventId,
        profileId: data.profileId || '00000000-0000-0000-0000-000000000000', // TODO: Use actual profile ID
        rawData: null,
        processedData: null,
        metadata: null,
        isProcessed: true,
        ingestStatus: 'completed',
        ingestError: null,
        filePath: null,
        profileSnapshot: null,
        canonVersion: null,
        importMeta: null,
        fileSize: data.fileSize,
        gpsProfileId: null,
        trainingId: data.eventType === 'training' ? data.eventId : null,
        matchId: data.eventType === 'match' ? data.eventId : null,
        status: 'processed',
        processedAt: new Date(),
        errorMessage: null,
        playersCount: data.playerMappings.filter(p => p.playerId).length,
        hasEdits: false,
        clubId,
        teamId: data.teamId,
        uploadedById,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    
    if (!report) return null;

    // Данные игроков сохраняются в API endpoint

    // Сохраняем маппинги столбцов
    // await saveColumnMappings(data.columnMappings, clubId);

    return {
      ...report,
      fileSize: report.fileSize || 0,
      eventType: report.eventType as 'training' | 'match',
 // TODO: fileColumns will be stored in column mappings
      status: report.status as 'uploaded' | 'processed' | 'error',
      playersCount: report.playersCount || 0,
      hasEdits: report.hasEdits || false,
      // Добавляем поля для совместимости со старым интерфейсом
      trainingId: report.eventType === 'training' ? report.eventId : null,
      matchId: report.eventType === 'match' ? report.eventId : null,
    };
  } catch (error) {
    console.error('Error creating GPS report:', error);
    return null;
  }
}

// GPS Report Data services
export async function getGpsReportDataByReportId(reportId: string): Promise<GpsReportData[]> {
  try {
    const data = await db
      .select()
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId))
      .orderBy(asc(gpsReportData.canonicalMetric));
    
    return data;
  } catch (error) {
    console.error('Error fetching GPS report data by report id:', error);
    return [];
  }
}


// Canonical Metrics services
export async function getCanonicalMetrics(): Promise<GpsCanonicalMetric[]> {
  try {
    const metrics = await db
      .select()
      .from(gpsCanonicalMetric)
      .where(eq(gpsCanonicalMetric.isActive, true))
      .orderBy(gpsCanonicalMetric.category, gpsCanonicalMetric.name);
    
    return metrics.map(metric => ({
      ...metric,
      supportedUnits: metric.supportedUnits as string[] || []
    }));
  } catch (error) {
    console.error('Error fetching canonical metrics:', error);
    return [];
  }
}

export async function getUnitsByDimension(dimension?: string): Promise<GpsUnit[]> {
  try {
    let whereCondition = eq(gpsUnit.isActive, true);
    
    if (dimension) {
      whereCondition = and(whereCondition, eq(gpsUnit.dimension, dimension))!;
    }
    
    const units = await db
      .select()
      .from(gpsUnit)
      .where(whereCondition)
      .orderBy(gpsUnit.dimension, gpsUnit.name);
    
    return units.map(unit => ({
      ...unit,
      conversionFactor: parseFloat(unit.conversionFactor.toString())
    }));
  } catch (error) {
    console.error('Error fetching units:', error);
    return [];
  }
}

// Column Mapping services
export async function getColumnMappingsByClubId(clubId: string): Promise<GpsColumnMapping[]> {
  try {
    const mappings = await db
      .select()
      .from(gpsColumnMapping)
      .where(eq(gpsColumnMapping.gpsProfileId, clubId))
      .orderBy(desc(gpsColumnMapping.displayOrder));
    
    return mappings;
  } catch (error) {
    console.error('Error fetching column mappings by club id:', error);
    return [];
  }
}

export async function saveColumnMappings(
  mappings: Array<{ sourceColumn: string; canonicalMetricCode: string; sourceUnit?: string }>,
  clubId: string
): Promise<void> {
  try {
    // TODO: Реализовать сохранение маппингов столбцов
    console.log('Saving column mappings:', { mappings, clubId });
  } catch (error) {
    console.error('Error saving column mappings:', error);
    throw error;
  }
}

// TODO: Visualization Profile services will be implemented later
