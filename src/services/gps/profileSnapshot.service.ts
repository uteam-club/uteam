import { ProfileSnapshot, ProfileSnapshotColumn } from '@/types/gps';
import { GpsProfile } from './ingest.service';

/**
 * Строит снапшот профиля для сохранения в отчёте
 * Использует только стабильные поля профиля
 */
export function buildProfileSnapshot(profile: GpsProfile): ProfileSnapshot {
  const columns: ProfileSnapshotColumn[] = (profile.columnMapping || [])
    .filter(col => col.canonicalKey && (col.sourceHeader || col.mappedColumn) && col.isVisible !== false)
    .map(col => ({
      sourceHeader: col.sourceHeader || col.mappedColumn || '',
      canonicalKey: col.canonicalKey!,
      displayName: col.displayName || col.name || col.canonicalKey!,
      order: col.order || 0,
      isVisible: col.isVisible !== false,
      unit: col.unit || null,
      transform: col.transform || null,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    profileId: profile.id,
    gpsSystem: profile.gpsSystem || null,
    sport: profile.sport || null,
    columns,
    profileVersion: profile.version || null,
    createdAtISO: new Date().toISOString(),
  };
}
