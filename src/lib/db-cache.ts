// Кэширование запросов к БД для GPS системы

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class DatabaseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Проверяем TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Создает ключ кэша для GPS запросов
  createKey(operation: string, params: Record<string, any> = {}): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `gps:${operation}:${sortedParams}`;
  }

  // Инвалидирует кэш при изменении данных
  invalidatePattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const dbCache = new DatabaseCache();

// Утилиты для GPS кэширования
export const gpsCacheKeys = {
  canonicalMetrics: (clubId: string) => 
    dbCache.createKey('canonical-metrics', { clubId }),
  
  canonicalMetricsAll: (clubId: string) => 
    dbCache.createKey('canonical-metrics-all', { clubId }),
  
  profiles: (clubId: string) => 
    dbCache.createKey('profiles', { clubId }),
  
  profile: (profileId: string, clubId: string) => 
    dbCache.createKey('profile', { profileId, clubId }),
  
  report: (reportId: string, clubId: string) => 
    dbCache.createKey('report', { reportId, clubId }),
  
  reportData: (reportId: string, clubId: string) => 
    dbCache.createKey('report-data', { reportId, clubId }),
  
  teamAverages: (reportId: string, profileId: string, clubId: string) => 
    dbCache.createKey('team-averages', { reportId, profileId, clubId }),
  
  playerModels: (reportId: string, profileId: string, clubId: string) => 
    dbCache.createKey('player-models', { reportId, profileId, clubId }),
  
  events: (teamId: string, clubId: string) => 
    dbCache.createKey('events', { teamId, clubId }),
  
  players: (teamId: string, clubId: string) => 
    dbCache.createKey('players', { teamId, clubId }),
};

// Функция для инвалидации кэша при изменениях
export const invalidateGpsCache = {
  report: (reportId: string) => {
    dbCache.invalidatePattern(`report:${reportId}`);
    dbCache.invalidatePattern(`team-averages:${reportId}`);
    dbCache.invalidatePattern(`player-models:${reportId}`);
  },
  
  profile: (profileId: string) => {
    dbCache.invalidatePattern(`profile:${profileId}`);
    dbCache.invalidatePattern('profiles:');
  },
  
  team: (teamId: string) => {
    dbCache.invalidatePattern(`events:${teamId}`);
    dbCache.invalidatePattern(`players:${teamId}`);
  },
  
  all: () => {
    dbCache.clear();
  }
};
