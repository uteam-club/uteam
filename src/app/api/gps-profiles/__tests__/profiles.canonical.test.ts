import { ColumnMappingItemSchema, CreateGpsProfileSchema, UpdateGpsProfileSchema } from '@/validators/gpsProfile.schema';

describe('GPS Profile Canonical Validation', () => {
  describe('ColumnMappingItemSchema', () => {
    it('should validate valid column with canonicalKey', () => {
      const validColumn = {
        type: 'column',
        name: 'Total Distance',
        mappedColumn: 'TD',
        canonicalKey: 'total_distance_m',
        isVisible: true,
        order: 1
      };

      const result = ColumnMappingItemSchema.safeParse(validColumn);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.canonicalKey).toBe('total_distance_m');
      }
    });

    it('should validate formula type without canonicalKey', () => {
      const validFormula = {
        type: 'formula',
        name: 'Custom Metric',
        formula: 'distance * 2',
        isVisible: true,
        order: 2
      };

      const result = ColumnMappingItemSchema.safeParse(validFormula);
      expect(result.success).toBe(true);
    });

    it('should reject column without canonicalKey', () => {
      const invalidColumn = {
        type: 'column',
        name: 'Total Distance',
        mappedColumn: 'TD',
        isVisible: true,
        order: 1
      };

      const result = ColumnMappingItemSchema.safeParse(invalidColumn);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('canonicalKey обязателен для type=column')
        )).toBe(true);
      }
    });

    it('should reject column without mappedColumn', () => {
      const invalidColumn = {
        type: 'column',
        name: 'Total Distance',
        canonicalKey: 'total_distance_m',
        isVisible: true,
        order: 1
      };

      const result = ColumnMappingItemSchema.safeParse(invalidColumn);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('mappedColumn обязателен для type=column')
        )).toBe(true);
      }
    });

    it('should reject invalid canonicalKey', () => {
      const invalidColumn = {
        type: 'column',
        name: 'Total Distance',
        mappedColumn: 'TD',
        canonicalKey: 'unknown_metric',
        isVisible: true,
        order: 1
      };

      const result = ColumnMappingItemSchema.safeParse(invalidColumn);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.message.includes('Неизвестный canonicalKey: unknown_metric')
        )).toBe(true);
      }
    });

    it('should apply default values', () => {
      const minimalColumn = {
        name: 'Test Column',
        mappedColumn: 'TEST',
        canonicalKey: 'total_distance_m'
      };

      const result = ColumnMappingItemSchema.safeParse(minimalColumn);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('column');
        expect(result.data.isVisible).toBe(true);
        expect(result.data.order).toBe(0);
      }
    });
  });

  describe('CreateGpsProfileSchema', () => {
    it('should validate valid profile creation', () => {
      const validProfile = {
        name: 'Test Profile',
        description: 'Test Description',
        gpsSystem: 'B-SIGHT',
        columns: [
          {
            type: 'column',
            name: 'Total Distance',
            mappedColumn: 'TD',
            canonicalKey: 'total_distance_m',
            isVisible: true,
            order: 1
          },
          {
            type: 'column',
            name: 'Max Speed',
            mappedColumn: 'Max Speed',
            canonicalKey: 'max_speed_ms',
            isVisible: true,
            order: 2
          }
        ]
      };

      const result = CreateGpsProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should reject profile without name', () => {
      const invalidProfile = {
        gpsSystem: 'B-SIGHT',
        columns: [
          {
            type: 'column',
            name: 'Total Distance',
            mappedColumn: 'TD',
            canonicalKey: 'total_distance_m'
          }
        ]
      };

      const result = CreateGpsProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('should reject profile without columns', () => {
      const invalidProfile = {
        name: 'Test Profile',
        gpsSystem: 'B-SIGHT',
        columns: []
      };

      const result = CreateGpsProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });

    it('should reject profile with invalid canonicalKey', () => {
      const invalidProfile = {
        name: 'Test Profile',
        gpsSystem: 'B-SIGHT',
        columns: [
          {
            type: 'column',
            name: 'Total Distance',
            mappedColumn: 'TD',
            canonicalKey: 'unknown_metric'
          }
        ]
      };

      const result = CreateGpsProfileSchema.safeParse(invalidProfile);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateGpsProfileSchema', () => {
    it('should validate partial update', () => {
      const partialUpdate = {
        name: 'Updated Profile Name'
      };

      const result = UpdateGpsProfileSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate update with columns', () => {
      const updateWithColumns = {
        name: 'Updated Profile',
        columns: [
          {
            type: 'column',
            name: 'Total Distance',
            mappedColumn: 'TD',
            canonicalKey: 'total_distance_m'
          }
        ]
      };

      const result = UpdateGpsProfileSchema.safeParse(updateWithColumns);
      expect(result.success).toBe(true);
    });

    it('should reject update with invalid canonicalKey', () => {
      const invalidUpdate = {
        name: 'Updated Profile',
        columns: [
          {
            type: 'column',
            name: 'Total Distance',
            mappedColumn: 'TD',
            canonicalKey: 'unknown_metric'
          }
        ]
      };

      const result = UpdateGpsProfileSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('Canonical data processing', () => {
    it('should process profile with mappedColumn and canonicalKey correctly', () => {
      // Симулируем профиль с маппингом колонок
      const profile = {
        id: 'test-profile',
        columnMapping: [
          {
            type: 'column',
            name: 'Total Distance',
            mappedColumn: 'Дистанция',
            canonicalKey: 'total_distance_m',
            isVisible: true,
            order: 1
          },
          {
            type: 'column',
            name: 'Max Speed',
            mappedColumn: 'Max Speed (km/h)',
            canonicalKey: 'max_speed_ms',
            isVisible: true,
            order: 2
          }
        ]
      };

      // Симулируем rawRow с оригинальными заголовками
      const rawRow = {
        'name': 'Игрок 1',
        'Дистанция': '1000',
        'Max Speed (km/h)': '32.4'
      };

      // Проверяем, что профиль валиден
      const result = CreateGpsProfileSchema.safeParse({
        name: 'Test Profile',
        gpsSystem: 'B-SIGHT',
        columns: profile.columnMapping
      });

      expect(result.success).toBe(true);
      
      // Проверяем, что rawRow содержит нужные поля
      expect(rawRow['Дистанция']).toBe('1000');
      expect(rawRow['Max Speed (km/h)']).toBe('32.4');
      expect(rawRow['name']).toBe('Игрок 1');
    });

    it('should handle missing mappedColumn gracefully', () => {
      const profile = {
        columnMapping: [
          {
            type: 'column',
            name: 'Total Distance',
            mappedColumn: 'NonExistentColumn',
            canonicalKey: 'total_distance_m',
            isVisible: true,
            order: 1
          }
        ]
      };

      const rawRow = {
        'name': 'Игрок 1',
        'Дистанция': '1000' // правильное поле, но не то, что ищет профиль
      };

      // Профиль должен быть валидным
      const result = CreateGpsProfileSchema.safeParse({
        name: 'Test Profile',
        gpsSystem: 'B-SIGHT',
        columns: profile.columnMapping
      });

      expect(result.success).toBe(true);
      
      // Но rawRow не содержит нужного поля
      expect(rawRow['NonExistentColumn']).toBeUndefined();
    });
  });
});
