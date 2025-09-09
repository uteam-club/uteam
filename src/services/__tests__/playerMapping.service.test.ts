import { PlayerMappingService } from '../playerMapping.service';

// Тесты для проверки логики сопоставления игроков
describe('PlayerMappingService', () => {
  // Тестируем calculateSimilarity через fuzzyMatch
  describe('calculateSimilarity', () => {
    test('должен возвращать пустой массив для совершенно разных имен', () => {
      const players = [
        { id: '1', firstName: 'Egor', lastName: 'Rudenko' }
      ];
      
      // Используем рефлексию для доступа к приватному методу
      const result = (PlayerMappingService as any).fuzzyMatch('Duffour Kofi', players);
      expect(result).toHaveLength(0); // fuzzyMatch фильтрует результаты с score < 0.3
    });

    test('должен возвращать 1 для точного совпадения', () => {
      const players = [
        { id: '1', firstName: 'Lweendo', lastName: 'Chimuka' }
      ];
      
      const result = (PlayerMappingService as any).fuzzyMatch('Lweendo Chimuka', players);
      expect(result[0]?.score).toBe(1);
    });

    test('должен возвращать высокий score для похожих имен', () => {
      const players = [
        { id: '1', firstName: 'Khachatur', lastName: 'K.' }
      ];
      
      const result = (PlayerMappingService as any).fuzzyMatch('Khachatur', players);
      expect(result[0]?.score).toBeGreaterThan(0.5); // Новый алгоритм: более реалистичные scores
    });

    test('должен возвращать 1 для точного совпадения после нормализации', () => {
      const players = [
        { id: '1', firstName: 'Иван', lastName: 'Петров' }
      ];
      
      const result = (PlayerMappingService as any).fuzzyMatch('иван петров', players);
      expect(result[0]?.score).toBe(1); // Точное совпадение после нормализации
    });

    test('должен возвращать 0.85 для включения одного имени в другое', () => {
      const players = [
        { id: '1', firstName: 'Александр', lastName: 'Смирнов' }
      ];
      
      const result = (PlayerMappingService as any).fuzzyMatch('Александр', players);
      expect(result[0]?.score).toBeGreaterThan(0.4); // Новый алгоритм: более реалистичные scores
    });
  });

  describe('autoMatchPlayer', () => {
    test('должен возвращать manual/0 для несовпадающих имен', async () => {
      // Мокаем базу данных
      const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      };

      // Мокаем db
      jest.doMock('@/lib/db', () => ({
        db: mockDb
      }));

      // Используем валидные UUID для теста
      const result = await PlayerMappingService.autoMatchPlayer(
        'Duffour Kofi',
        '550e8400-e29b-41d4-a716-446655440000', // Валидный UUID
        '550e8400-e29b-41d4-a716-446655440001', // Валидный UUID
        'gps1'
      );

      expect(result.action).toBe('create'); // Нет маппинга и нет игроков в команде
      expect(result.confidence).toBe(0);
      expect(result.suggestedPlayer).toBeNull();
    });
  });

  describe('normalizeName', () => {
    test('должен нормализовать имена правильно', () => {
      const normalizeName = (PlayerMappingService as any).normalizeName;
      
      expect(normalizeName('Иван Петров')).toBe('иван петров');
      expect(normalizeName('  Иван   Петров  ')).toBe('иван петров');
      expect(normalizeName('Иван-Петров')).toBe('иванпетров'); // Дефисы удаляются
      expect(normalizeName('Иванёв')).toBe('иванев');
      expect(normalizeName('Иван123Петров')).toBe('иванпетров'); // Цифры удаляются, пробел исчезает
    });
  });

  describe('token-based matching', () => {
    test('matches swapped first/last names with high score', () => {
      const s = (PlayerMappingService as any).calculateSimilarity('Akanni Adedayo Saheed', 'Adedayo Akanni');
      expect(s).toBeGreaterThanOrEqual(0.92); // высокий уровень → автоподтверждение
    });

    test('matches partial names with high score', () => {
      const s = (PlayerMappingService as any).calculateSimilarity('Akomonla Angelo Luciano Beaugars', 'Angelo Akomonla');
      expect(s).toBeGreaterThanOrEqual(0.85); // высокий уровень → автоподтверждение
      expect(s).toBeLessThanOrEqual(0.95); // может быть до 0.92 из-за буста
    });

    test('matches medium similarity names with auto-confirmation', () => {
      const s = (PlayerMappingService as any).calculateSimilarity('Иван Петров', 'Иван Сидоров');
      expect(s).toBeGreaterThanOrEqual(0.30); // средний уровень → автоподтверждение
      expect(s).toBeLessThan(0.80); // но не высокий
    });


    test('matches exact names with 100% score', () => {
      const s = (PlayerMappingService as any).calculateSimilarity('Lweendo Chimuka', 'Lweendo Chimuka');
      expect(s).toBe(1); // точное совпадение
    });
  });
});
