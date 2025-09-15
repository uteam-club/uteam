import { db } from '@/lib/db';
import { gpsProfile, gpsReport, gpsColumnMapping, gpsPlayerMapping, gpsReportData } from '@/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { GpsProfile, GpsReport, GpsColumnMapping, GpsPlayerMapping, GpsReportData, CreateGpsPlayerMappingRequest } from '@/types/gps';
import { ensureProfileOwned, ensureReportOwned, ensureMappingOwned } from '@/services/guards/ownership';

// GPS Profile services
export async function getGpsProfilesByClubId(clubId: string): Promise<(GpsProfile & { usedReportsCount: number })[]> {
  try {
    const profiles = await db
      .select()
      .from(gpsProfile)
      .where(and(eq(gpsProfile.clubId, clubId), eq(gpsProfile.isActive, true)))
      .orderBy(asc(gpsProfile.name));

    // Get report counts for each profile
    const profilesWithCounts = await Promise.all(
      profiles.map(async (profile) => {
        const usedCount = await getGpsReportCountByProfileId(profile.id, clubId);
        return { ...profile, usedReportsCount: usedCount };
      })
    );

    return profilesWithCounts;
  } catch (error) {
    console.error('Error fetching GPS profiles by club id:', error);
    return [];
  }
}

export async function getGpsProfileById(id: string, clubId: string): Promise<GpsProfile | null> {
  try {
    const [result] = await db.select().from(gpsProfile)
      .where(and(eq(gpsProfile.id, id), eq(gpsProfile.clubId, clubId)));
    return result ?? null;
  } catch (error) {
    console.error('Error fetching GPS profile by id:', error);
    return null;
  }
}

export async function createGpsProfile(data: {
  name: string;
  gpsSystem: string;
  clubId: string;
}): Promise<GpsProfile | null> {
  try {
    const [created] = await db
      .insert(gpsProfile)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating GPS profile:', error);
    return null;
  }
}

export async function updateGpsProfile(
  id: string,
  clubId: string,
  data: {
    name?: string;
    gpsSystem?: string;
    description?: string;
    isActive?: boolean;
  }
): Promise<GpsProfile | null> {
  try {
    await ensureProfileOwned(id, clubId);
    const [updated] = await db
      .update(gpsProfile)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(gpsProfile.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error updating GPS profile:', error);
    return null;
  }
}

export async function getGpsReportCountByProfileId(profileId: string, clubId: string): Promise<number> {
  try {
    await ensureProfileOwned(profileId, clubId);
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(gpsReport)
      .where(eq(gpsReport.gpsProfileId, profileId));
    return result[0]?.count ?? 0;
  } catch (error) {
    console.error('Error counting GPS reports by profile id:', error);
    return 0;
  }
}

export async function deleteGpsProfile(id: string, clubId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ensureProfileOwned(id, clubId);
    const used = await getGpsReportCountByProfileId(id, clubId);
    if (used > 0) {
      return { success: false, error: 'PROFILE_IN_USE' };
    }
    
    await db.delete(gpsProfile).where(eq(gpsProfile.id, id));
    return { success: true };
  } catch (error) {
    console.error('Error deleting GPS profile:', error);
    return { success: false, error: 'UNEXPECTED' };
  }
}

export async function archiveGpsProfile(id: string, clubId: string): Promise<GpsProfile | null> {
  try {
    await ensureProfileOwned(id, clubId);
    const [updated] = await db
      .update(gpsProfile)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(gpsProfile.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error archiving GPS profile:', error);
    return null;
  }
}

export async function unarchiveGpsProfile(id: string, clubId: string): Promise<GpsProfile | null> {
  try {
    await ensureProfileOwned(id, clubId);
    const [updated] = await db
      .update(gpsProfile)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(gpsProfile.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error unarchiving GPS profile:', error);
    return null;
  }
}

// GPS Report services
export async function getGpsReportsByClubId(clubId: string): Promise<GpsReport[]> {
  try {
    const results = await db
      .select()
      .from(gpsReport)
      .where(eq(gpsReport.clubId, clubId))
      .orderBy(desc(gpsReport.createdAt));
    
    return results.map(report => ({
      ...report,
      eventType: report.eventType as 'training' | 'match',
    }));
  } catch (error) {
    console.error('Error fetching GPS reports by club id:', error);
    return [];
  }
}

export async function getGpsReportsByEventId(eventId: string, eventType: 'training' | 'match', clubId: string): Promise<GpsReport[]> {
  try {
    const whereCondition = eventType === 'training' 
      ? and(eq(gpsReport.trainingId, eventId), eq(gpsReport.clubId, clubId))
      : and(eq(gpsReport.matchId, eventId), eq(gpsReport.clubId, clubId));
      
    const results = await db
      .select()
      .from(gpsReport)
      .where(whereCondition)
      .orderBy(desc(gpsReport.createdAt));
    
    return results.map(report => ({
      ...report,
      eventType: report.eventType as 'training' | 'match',
    }));
  } catch (error) {
    console.error('Error fetching GPS reports by event id:', error);
    return [];
  }
}

export async function getGpsReportsByTeamId(teamId: string, eventType: 'training' | 'match', clubId: string): Promise<GpsReport[]> {
  try {
    const whereCondition = eventType === 'training' 
      ? and(eq(gpsReport.teamId, teamId), eq(gpsReport.eventType, 'training'), eq(gpsReport.clubId, clubId))
      : and(eq(gpsReport.teamId, teamId), eq(gpsReport.eventType, 'match'), eq(gpsReport.clubId, clubId));
      
    const results = await db
      .select()
      .from(gpsReport)
      .where(whereCondition)
      .orderBy(desc(gpsReport.createdAt));
    
    return results.map(report => ({
      ...report,
      eventType: report.eventType as 'training' | 'match',
    }));
  } catch (error) {
    console.error('Error fetching GPS reports by team id:', error);
    return [];
  }
}

export async function getGpsReportById(id: string, clubId: string): Promise<GpsReport | null> {
  try {
    const [result] = await db.select().from(gpsReport)
      .where(and(eq(gpsReport.id, id), eq(gpsReport.clubId, clubId)));
    if (!result) return null;
    
    return {
      ...result,
      eventType: result.eventType as 'training' | 'match',
    };
  } catch (error) {
    console.error('Error fetching GPS report by id:', error);
    return null;
  }
}

export async function createGpsReport(data: {
  name: string;
  fileName: string;
  fileUrl: string;
  filePath?: string;
  fileSize?: number;
  gpsSystem: string;
  eventType: 'training' | 'match';
  eventId: string;
  profileId?: string;
  gpsProfileId?: string;
  trainingId?: string;
  matchId?: string;
  clubId: string;
  uploadedById: string;
  teamId: string;
  rawData?: any;
}): Promise<GpsReport | null> {
  try {
    const [created] = await db
      .insert(gpsReport)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    if (!created) return null;
    
    return {
      ...created,
      eventType: created.eventType as 'training' | 'match',
    };
  } catch (error) {
    console.error('Error creating GPS report:', error);
    return null;
  }
}

export async function updateGpsReport(
  reportId: string,
  clubId: string,
  updates: {
    filePath?: string;
    fileUrl?: string;
    processedData?: any;
    metadata?: any;
    isProcessed?: boolean;
    status?: 'uploaded' | 'processed' | 'error';
    processedAt?: Date;
    errorMessage?: string;
  }
): Promise<boolean> {
  try {
    await ensureReportOwned(reportId, clubId);
    await db
      .update(gpsReport)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(gpsReport.id, reportId));
    return true;
  } catch (error) {
    console.error('Error updating GPS report:', error);
    return false;
  }
}

export async function updateGpsReportStatus(
  id: string,
  clubId: string,
  status: 'uploaded' | 'processed' | 'error',
  errorMessage?: string
): Promise<boolean> {
  try {
    await ensureReportOwned(id, clubId);
    await db
      .update(gpsReport)
      .set({
        status,
        processedAt: status === 'processed' ? new Date() : undefined,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(gpsReport.id, id));
    return true;
  } catch (error) {
    console.error('Error updating GPS report status:', error);
    return false;
  }
}

export async function deleteGpsReport(
  id: string,
  clubId: string
): Promise<boolean> {
  try {
    await ensureReportOwned(id, clubId);
    
    // Получаем информацию о файле перед удалением
    const report = await getGpsReportById(id, clubId);
    if (!report) return false;

    // Удаляем запись из БД
    await db.delete(gpsReport).where(eq(gpsReport.id, id));

    // Удаляем физический файл, если он существует
    if (report.filePath) {
      try {
        const { promises: fs } = await import('fs');
        const { join, dirname } = await import('path');
        
        // Удаляем файл
        await fs.unlink(report.filePath);
        
        // Удаляем директорию, если она пустая
        const dir = dirname(report.filePath);
        try {
          await fs.rmdir(dir);
        } catch {
          // Директория не пустая или не существует - это нормально
        }
      } catch (fileError) {
        console.warn('Failed to delete physical file:', fileError);
        // Не прерываем выполнение, если файл не удалился
      }
    }

    return true;
  } catch (error) {
    console.error('Error deleting GPS report:', error);
    return false;
  }
}

// GPS Column Mapping services
export async function getGpsColumnMappingsByProfileId(profileId: string, clubId: string): Promise<GpsColumnMapping[]> {
  try {
    await ensureProfileOwned(profileId, clubId);
    const rows = await db
      .select({
        id: gpsColumnMapping.id,
        gpsProfileId: gpsColumnMapping.gpsProfileId,
        sourceColumn: gpsColumnMapping.sourceColumn,
        customName: gpsColumnMapping.customName,
        canonicalMetric: gpsColumnMapping.canonicalMetric,
        displayUnit: gpsColumnMapping.displayUnit, // важно: camelCase
        isVisible: gpsColumnMapping.isVisible,
        displayOrder: gpsColumnMapping.displayOrder,
        description: gpsColumnMapping.description,
        createdAt: gpsColumnMapping.createdAt,
        updatedAt: gpsColumnMapping.updatedAt,
      })
      .from(gpsColumnMapping)
      .where(eq(gpsColumnMapping.gpsProfileId, profileId))
      .orderBy(asc(gpsColumnMapping.displayOrder));
    return rows;
  } catch (error) {
    console.error('Error fetching GPS column mappings by profile id:', error);
    return [];
  }
}

export async function getGpsColumnMappingById(id: string, clubId: string): Promise<GpsColumnMapping | null> {
  try {
    await ensureMappingOwned(id, clubId);
    const [result] = await db.select().from(gpsColumnMapping).where(eq(gpsColumnMapping.id, id));
    return result ?? null;
  } catch (error) {
    console.error('Error fetching GPS column mapping by id:', error);
    return null;
  }
}

export async function createGpsColumnMapping(data: {
  gpsProfileId: string;
  sourceColumn: string;
  customName: string;
  canonicalMetric: string;
  displayUnit?: string | null;
  isVisible?: boolean;
  displayOrder?: number;
  description?: string;
}, clubId: string): Promise<GpsColumnMapping | null> {
  try {
    await ensureProfileOwned(data.gpsProfileId, clubId);
    const [created] = await db
      .insert(gpsColumnMapping)
      .values({
        ...data,
        isVisible: data.isVisible ?? true,
        displayOrder: data.displayOrder ?? 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating GPS column mapping:', error);
    return null;
  }
}

export async function updateGpsColumnMapping(
  id: string,
  clubId: string,
  data: {
    customName?: string;
    canonicalMetric?: string;
    displayUnit?: string | null;
    isVisible?: boolean;
    displayOrder?: number;
    description?: string;
  }
): Promise<GpsColumnMapping | null> {
  try {
    await ensureMappingOwned(id, clubId);
    const [updated] = await db
      .update(gpsColumnMapping)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(gpsColumnMapping.id, id))
      .returning();
    return updated ?? null;
  } catch (error) {
    console.error('Error updating GPS column mapping:', error);
    return null;
  }
}

export async function deleteGpsColumnMapping(id: string, clubId: string): Promise<boolean> {
  try {
    await ensureMappingOwned(id, clubId);
    await db.delete(gpsColumnMapping).where(eq(gpsColumnMapping.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting GPS column mapping:', error);
    return false;
  }
}

// GPS Report Data services
export async function getGpsReportDataByReportId(reportId: string, clubId: string): Promise<GpsReportData[]> {
  try {
    await ensureReportOwned(reportId, clubId);
    return await db
      .select()
      .from(gpsReportData)
      .where(eq(gpsReportData.gpsReportId, reportId))
      .orderBy(asc(gpsReportData.playerId), asc(gpsReportData.canonicalMetric));
  } catch (error) {
    console.error('Error fetching GPS report data by report id:', error);
    return [];
  }
}

export async function createGpsReportData(data: {
  gpsReportId: string;
  playerId: string;
  canonicalMetric: string;
  value: string;
  unit: string;
}): Promise<GpsReportData | null> {
  try {
    const [created] = await db
      .insert(gpsReportData)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating GPS report data:', error);
    return null;
  }
}

export async function bulkCreateGpsReportData(data: {
  gpsReportId: string;
  playerId: string;
  canonicalMetric: string;
  value: string;
  unit: string;
}[]): Promise<boolean> {
  try {
    await db.insert(gpsReportData).values(data.map(item => ({
      ...item,
      createdAt: new Date(),
    })));
    return true;
  } catch (error) {
    console.error('Error bulk creating GPS report data:', error);
    return false;
  }
}

// GPS Player Mapping services
export async function getGpsPlayerMappingsByReportId(reportId: string, clubId: string): Promise<GpsPlayerMapping[]> {
  try {
    await ensureReportOwned(reportId, clubId);
    return await db
      .select()
      .from(gpsPlayerMapping)
      .where(eq(gpsPlayerMapping.gpsReportId, reportId))
      .orderBy(asc(gpsPlayerMapping.rowIndex));
  } catch (error) {
    console.error('Error fetching GPS player mappings by report id:', error);
    return [];
  }
}

export async function createGpsPlayerMapping(data: {
  gpsReportId: string;
  playerId: string | null;
  rowIndex: number;
  isManual?: boolean;
  similarity?: number | null;
}): Promise<GpsPlayerMapping | null> {
  try {
    const [created] = await db
      .insert(gpsPlayerMapping)
      .values({
        ...data,
        isManual: data.isManual ?? false,
        createdAt: new Date(),
      })
      .returning();
    return created ?? null;
  } catch (error) {
    console.error('Error creating GPS player mapping:', error);
    return null;
  }
}

export async function deleteGpsPlayerMappingsByReportId(reportId: string, clubId: string): Promise<boolean> {
  try {
    await ensureReportOwned(reportId, clubId);
    await db
      .delete(gpsPlayerMapping)
      .where(eq(gpsPlayerMapping.gpsReportId, reportId));
    return true;
  } catch (error) {
    console.error('Error deleting GPS player mappings by report id:', error);
    return false;
  }
}

export async function deleteGpsPlayerMapping(id: string, clubId: string): Promise<boolean> {
  try {
    // Для player mapping нужно найти report через mapping и проверить его принадлежность
    const mapping = await db.select({ gpsReportId: gpsPlayerMapping.gpsReportId })
      .from(gpsPlayerMapping)
      .where(eq(gpsPlayerMapping.id, id))
      .limit(1);
    if (!mapping.length) return false;
    
    await ensureReportOwned(mapping[0].gpsReportId, clubId);
    await db
      .delete(gpsPlayerMapping)
      .where(eq(gpsPlayerMapping.id, id));
    return true;
  } catch (error) {
    console.error('Error deleting GPS player mapping:', error);
    return false;
  }
}

export async function bulkCreateGpsPlayerMappings(
  reportId: string, 
  clubId: string, 
  items: CreateGpsPlayerMappingRequest[]
): Promise<number> {
  try {
    await ensureReportOwned(reportId, clubId);
    
    // Удаляем существующие маппинги для отчета
    await deleteGpsPlayerMappingsByReportId(reportId, clubId);
    
    // Вставляем новые маппинги пачкой
    if (items.length === 0) return 0;
    
    const values = items.map(item => ({
      gpsReportId: reportId,
      playerId: item.playerId,
      rowIndex: item.rowIndex,
      isManual: item.isManual ?? false,
      similarity: item.similarity,
      createdAt: new Date(),
    }));
    
    await db.insert(gpsPlayerMapping).values(values);
    return items.length;
  } catch (error) {
    console.error('Error bulk creating GPS player mappings:', error);
    return 0;
  }
}

export async function createGpsPlayerMappings(
  reportId: string, 
  items: any[]
): Promise<number> {
  try {
    if (items.length === 0) return 0;
    
    const values = items.map(item => ({
      gpsReportId: reportId,
      playerId: item.playerId,
      rowIndex: item.rowIndex,
      isManual: item.isManual ?? false,
      similarity: item.similarity ?? 0,
      createdAt: new Date(),
    }));
    
    await db.insert(gpsPlayerMapping).values(values);
    return items.length;
  } catch (error) {
    console.error('Error creating GPS player mappings:', error);
    return 0;
  }
}