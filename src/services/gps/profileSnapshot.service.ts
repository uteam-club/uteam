import { ProfileSnapshot, ProfileSnapshotColumn } from '@/types/gps';
import { GpsProfile } from './ingest.service';
import { CANON } from '@/canon/metrics.registry';

/**
 * Определяет displayUnit на основе названия колонки и канонического ключа
 */
function determineDisplayUnit(columnName: string, canonicalKey: string, profileDisplayUnit?: string): string | undefined {
  // Если displayUnit указан в профиле, используем его
  if (profileDisplayUnit) {
    return profileDisplayUnit;
  }

  // Алиасы для метрик с единицами в названии
  const aliasMap: Record<string, { baseKey: string; displayUnit: string }> = {
    'max_speed_kmh': { baseKey: 'max_speed_ms', displayUnit: 'km/h' },
    'hsr_percent': { baseKey: 'hsr_ratio', displayUnit: '%' },
    'hsr%': { baseKey: 'hsr_ratio', displayUnit: '%' },
    'max_speed_км/ч': { baseKey: 'max_speed_ms', displayUnit: 'km/h' },
    'макс._скорость,_км/ч': { baseKey: 'max_speed_ms', displayUnit: 'km/h' },
    'виб,_%': { baseKey: 'hsr_ratio', displayUnit: '%' },
    'виб%': { baseKey: 'hsr_ratio', displayUnit: '%' },
  };

  // Проверяем алиасы по canonicalKey
  if (aliasMap[canonicalKey]) {
    return aliasMap[canonicalKey].displayUnit;
  }

  // Проверяем алиасы по названию колонки
  const lowerName = columnName.toLowerCase();
  for (const [alias, config] of Object.entries(aliasMap)) {
    if (lowerName.includes(alias.toLowerCase())) {
      return config.displayUnit;
    }
  }

  // Проверяем паттерны в названии
  if (lowerName.includes('км/ч') || lowerName.includes('km/h')) {
    return 'km/h';
  }
  if (lowerName.includes('%') || lowerName.includes('процент')) {
    return '%';
  }
  if (lowerName.includes('м/с') || lowerName.includes('m/s')) {
    return 'm/s';
  }
  if (lowerName.includes('мин') || lowerName.includes('min')) {
    return 'min';
  }

  // Возвращаем canonical unit из реестра
  const metric = CANON.metrics.find(m => m.key === canonicalKey);
  if (metric) {
    const dimension = metric.dimension as keyof typeof CANON.dimensions;
    const dimensionConfig = CANON.dimensions[dimension];
    return dimensionConfig?.canonical_unit;
  }

  return undefined;
}

/**
 * Строит снапшот профиля для сохранения в отчёте
 * Использует только стабильные поля профиля
 */
export function buildProfileSnapshot(profile: GpsProfile): ProfileSnapshot {
  const columns: ProfileSnapshotColumn[] = (profile.columnMapping || [])
    .filter(col => col.canonicalKey && (col.sourceHeader || col.mappedColumn) && col.isVisible !== false)
    .map(col => {
      const sourceHeader = col.sourceHeader || col.mappedColumn || '';
      const canonicalKey = col.canonicalKey!;
      const displayName = col.displayName || col.name || canonicalKey;
      
      // Определяем displayUnit (приоритет: профиль > эвристика)
      const displayUnit = determineDisplayUnit(displayName, canonicalKey, (col as any).displayUnit);
      
      return {
        sourceHeader,
        canonicalKey,
        displayName,
        order: col.order || 0,
        isVisible: col.isVisible !== false,
        unit: col.unit || null,
        transform: col.transform || null,
        displayUnit,
      };
    })
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
