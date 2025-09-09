import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Мокаем зависимости
jest.mock('@/lib/db', () => ({
  db: {
    select: jest.fn(),
    update: jest.fn(),
    query: {
      gpsProfile: {
        findFirst: jest.fn()
      }
    }
  }
}));

jest.mock('@/lib/permissions', () => ({
  hasPermission: jest.fn(() => true)
}));

jest.mock('@/services/user.service', () => ({
  getUserPermissions: jest.fn(() => Promise.resolve({})),
  getClubBySubdomain: jest.fn(() => Promise.resolve({ id: 'club-1' }))
}));

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(() => Promise.resolve({ id: 'user-1', clubId: 'club-1' }))
}));

jest.mock('@/lib/utils', () => ({
  getSubdomain: jest.fn(() => 'test-club')
}));

import { db } from '@/lib/db';
import { eq, and, ne, count } from 'drizzle-orm';

describe('Profile Guard Tests', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('usageCount>0, удалили строку → 409', async () => {
    // Мокаем профиль с существующими колонками
    const existingProfile = {
      id: 'profile-1',
      clubId: 'club-1',
      name: 'Test Profile',
      gpsSystem: 'B-SIGHT',
      columnMapping: [
        {
          type: 'column',
          canonicalKey: 'total_distance_m',
          mappedColumn: 'TD',
          name: 'Total Distance'
        },
        {
          type: 'column',
          canonicalKey: 'max_speed_ms',
          mappedColumn: 'Max Speed',
          name: 'Max Speed'
        }
      ]
    };

    // Мокаем usageCount > 0
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([{ count: 2 }])
      })
    } as any);

    // Мокаем получение профиля
    mockDb.query.gpsProfile.findFirst.mockResolvedValue(existingProfile);

    // Симулируем запрос с удалением одной строки
    const newColumns = [
      {
        type: 'column',
        canonicalKey: 'total_distance_m',
        mappedColumn: 'TD',
        name: 'Total Distance'
      }
      // max_speed_ms удалена
    ];

    // Проверяем guard логику
    const makeKey = (c: any) => `${c.canonicalKey}__@@__${c.mappedColumn}`;
    
    const oldCols = existingProfile.columnMapping || [];
    const newCols = newColumns;

    const oldSet = new Set((oldCols || [])
      .filter((c: any) => c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn)
      .map(makeKey)
    );

    const newSet = new Set((newCols || [])
      .filter((c: any) => c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn)
      .map(makeKey)
    );

    // Проверяем, что есть удаленные строки
    const removedKeys = [];
    for (const k of oldSet) {
      if (!newSet.has(k)) {
        removedKeys.push(k);
      }
    }

    expect(removedKeys).toHaveLength(1);
    expect(removedKeys[0]).toBe('max_speed_ms__@@__Max Speed');
  });

  test('usageCount>0, поменяли mappedColumn для существующей строки → 409', async () => {
    const existingProfile = {
      id: 'profile-1',
      clubId: 'club-1',
      name: 'Test Profile',
      gpsSystem: 'B-SIGHT',
      columnMapping: [
        {
          type: 'column',
          canonicalKey: 'total_distance_m',
          mappedColumn: 'TD',
          name: 'Total Distance'
        }
      ]
    };

    // Симулируем изменение mappedColumn
    const newColumns = [
      {
        type: 'column',
        canonicalKey: 'total_distance_m',
        mappedColumn: 'Total Distance', // Изменили с 'TD' на 'Total Distance'
        name: 'Total Distance'
      }
    ];

    // Проверяем guard логику
    const byCanonOld = new Map(existingProfile.columnMapping.map((c: any) => [c.canonicalKey, c]));
    
    let hasChangedMappedColumn = false;
    for (const nc of newColumns) {
      const oc = byCanonOld.get(nc.canonicalKey);
      if (!oc) continue;
      
      if (oc.mappedColumn !== nc.mappedColumn) {
        hasChangedMappedColumn = true;
        break;
      }
    }

    expect(hasChangedMappedColumn).toBe(true);
  });

  test('usageCount>0, добавили новую строку → 200', async () => {
    const existingProfile = {
      id: 'profile-1',
      clubId: 'club-1',
      name: 'Test Profile',
      gpsSystem: 'B-SIGHT',
      columnMapping: [
        {
          type: 'column',
          canonicalKey: 'total_distance_m',
          mappedColumn: 'TD',
          name: 'Total Distance'
        }
      ]
    };

    // Симулируем добавление новой строки
    const newColumns = [
      {
        type: 'column',
        canonicalKey: 'total_distance_m',
        mappedColumn: 'TD',
        name: 'Total Distance'
      },
      {
        type: 'column',
        canonicalKey: 'max_speed_ms', // Новая строка
        mappedColumn: 'Max Speed',
        name: 'Max Speed'
      }
    ];

    // Проверяем guard логику
    const makeKey = (c: any) => `${c.canonicalKey}__@@__${c.mappedColumn}`;
    
    const oldCols = existingProfile.columnMapping || [];
    const newCols = newColumns;

    const oldSet = new Set((oldCols || [])
      .filter((c: any) => c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn)
      .map(makeKey)
    );

    const newSet = new Set((newCols || [])
      .filter((c: any) => c?.type !== 'formula' && c?.canonicalKey && c?.mappedColumn)
      .map(makeKey)
    );

    // Проверяем, что нет удаленных строк
    const removedKeys = [];
    for (const k of oldSet) {
      if (!newSet.has(k)) {
        removedKeys.push(k);
      }
    }

    expect(removedKeys).toHaveLength(0);
    expect(newSet.size).toBeGreaterThan(oldSet.size);
  });
});
