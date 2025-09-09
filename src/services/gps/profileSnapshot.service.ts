import { ProfileSnapshot, ProfileSnapshotColumn } from '@/types/gps';
import { GpsProfile } from './ingest.service';

/**
 * Строит снапшот профиля для сохранения в отчёте
 * Использует только стабильные поля профиля
 */
export function buildProfileSnapshot(profile: GpsProfile): ProfileSnapshot {
  const columns: ProfileSnapshotColumn[] = (profile.columnMapping || [])
    .filter(col => col.type === 'column' && col.canonicalKey && col.mappedColumn)
    .map(col => ({
      sourceHeader: col.mappedColumn!,
      canonicalKey: col.canonicalKey!,
      displayName: col.name,
      order: col.order || 0,
      isVisible: col.isVisible ?? true,
      unit: col.unit || null,
      transform: col.transform || null,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    profileId: profile.id,
    gpsSystem: profile.gpsSystem || null,
    sport: null, // TODO: добавить поле sport в профиль если нужно
    columns,
    profileVersion: null, // TODO: добавить версионирование профилей
    createdAtISO: profile.createdAt,
  };
}
