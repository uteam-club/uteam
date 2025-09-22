import React from 'react';

// Кэш для GPS данных
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // время жизни в миллисекундах
}

class GpsCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Проверяем, не истек ли срок действия
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Проверяем, не истек ли срок действия
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Очистка устаревших записей
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Получение статистики кэша
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Создаем глобальный экземпляр кэша
export const gpsCache = new GpsCache();

// Утилиты для создания ключей кэша
export const cacheKeys = {
  canonicalMetrics: () => 'canonical-metrics',
  units: () => 'units',
  gpsReport: (id: string) => `gps-report-${id}`,
  gpsReportData: (reportId: string) => `gps-report-data-${reportId}`,
  teamAverages: (reportId: string) => `team-averages-${reportId}`,
  playerModels: (reportId: string) => `player-models-${reportId}`,
  gpsProfiles: (clubId: string) => `gps-profiles-${clubId}`,
  gpsProfile: (profileId: string) => `gps-profile-${profileId}`,
} as const;

// Хук для работы с кэшем в React компонентах
export function useGpsCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): { data: T | null; loading: boolean; error: Error | null; refetch: () => Promise<void> } {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    // Проверяем кэш
    const cachedData = gpsCache.get<T>(key);
    if (cachedData) {
      setData(cachedData);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      gpsCache.set(key, result, ttl);
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  const refetch = React.useCallback(async () => {
    gpsCache.delete(key);
    await fetchData();
  }, [key, fetchData]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch };
}

// Очистка кэша при изменении данных
export function invalidateGpsCache(pattern?: string) {
  if (pattern) {
    // Удаляем только записи, соответствующие паттерну
    for (const key of gpsCache.getStats().keys) {
      if (key.includes(pattern)) {
        gpsCache.delete(key);
      }
    }
  } else {
    // Очищаем весь кэш
    gpsCache.clear();
  }
}

// Автоматическая очистка устаревших записей каждые 10 минут
if (typeof window !== 'undefined') {
  setInterval(() => {
    gpsCache.cleanup();
  }, 10 * 60 * 1000);
}
