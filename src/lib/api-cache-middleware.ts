// Middleware для кэширования API responses

import { NextRequest, NextResponse } from 'next/server';
import { dbCache } from './db-cache';

interface CacheConfig {
  ttl: number; // время жизни в миллисекундах
  keyGenerator: (request: NextRequest) => string;
  shouldCache: (response: NextResponse) => boolean;
}

// Конфигурация кэширования для разных endpoints
const cacheConfigs: Record<string, CacheConfig> = {
  '/api/gps/canonical-metrics': {
    ttl: 10 * 60 * 1000, // 10 минут
    keyGenerator: (req) => {
      const url = new URL(req.url);
      const clubId = url.searchParams.get('clubId') || 'default';
      return `api:canonical-metrics:${clubId}`;
    },
    shouldCache: (res) => res.status === 200
  },
  
  '/api/gps/canonical-metrics-all': {
    ttl: 10 * 60 * 1000, // 10 минут
    keyGenerator: (req) => {
      const url = new URL(req.url);
      const clubId = url.searchParams.get('clubId') || 'default';
      return `api:canonical-metrics-all:${clubId}`;
    },
    shouldCache: (res) => res.status === 200
  },
  
  '/api/gps/profiles': {
    ttl: 5 * 60 * 1000, // 5 минут
    keyGenerator: (req) => {
      const url = new URL(req.url);
      const clubId = url.searchParams.get('clubId') || 'default';
      return `api:profiles:${clubId}`;
    },
    shouldCache: (res) => res.status === 200
  },
  
  '/api/gps/units': {
    ttl: 30 * 60 * 1000, // 30 минут
    keyGenerator: () => 'api:units:global',
    shouldCache: (res) => res.status === 200
  },
  
  '/api/gps/events': {
    ttl: 5 * 60 * 1000, // 5 минут
    keyGenerator: (req) => {
      const url = new URL(req.url);
      const teamId = url.searchParams.get('teamId') || 'default';
      const clubId = url.searchParams.get('clubId') || 'default';
      return `api:events:${teamId}:${clubId}`;
    },
    shouldCache: (res) => res.status === 200
  },
  
  '/api/gps/teams': {
    ttl: 10 * 60 * 1000, // 10 минут
    keyGenerator: (req) => {
      const url = new URL(req.url);
      const clubId = url.searchParams.get('clubId') || 'default';
      return `api:teams:${clubId}`;
    },
    shouldCache: (res) => res.status === 200
  }
};

// Middleware для кэширования GET запросов
export async function withApiCache(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  // Только для GET запросов
  if (request.method !== 'GET') {
    return handler();
  }

  const pathname = request.nextUrl.pathname;
  const config = cacheConfigs[pathname];

  // Если нет конфигурации кэширования для этого endpoint
  if (!config) {
    return handler();
  }

  // Генерируем ключ кэша
  const cacheKey = config.keyGenerator(request);

  // Проверяем кэш
  const cached = dbCache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'X-Cache-Key': cacheKey
      }
    });
  }

  // Выполняем handler
  const response = await handler();

  // Кэшируем только успешные ответы
  if (config.shouldCache(response)) {
    try {
      const data = await response.json();
      dbCache.set(cacheKey, data, config.ttl);
      
      // Возвращаем response с заголовками кэша
      return NextResponse.json(data, {
        status: response.status,
        headers: {
          ...response.headers,
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey
        }
      });
    } catch (error) {
      // Если не удалось распарсить JSON, возвращаем оригинальный response
      return response;
    }
  }

  return response;
}

// Утилита для инвалидации кэша API
export function invalidateApiCache(pattern: string) {
  dbCache.invalidatePattern(pattern);
}

// Утилита для очистки всего кэша API
export function clearApiCache() {
  dbCache.clear();
}
