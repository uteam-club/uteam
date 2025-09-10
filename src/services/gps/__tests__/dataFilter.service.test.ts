// services/gps/__tests__/dataFilter.service.test.ts
import { filterCanonicalData, getPlayerNameFromRow } from '../dataFilter.service';
import { ProfileSnapshotColumn } from '@/types/gps';

describe('Data Filter Service', () => {
  const mockColumns: ProfileSnapshotColumn[] = [
    {
      sourceHeader: 'Игрок',
      canonicalKey: 'athlete_name',
      displayName: 'Игрок',
      order: 1,
      isVisible: true
    },
    {
      sourceHeader: 'Время',
      canonicalKey: 'minutes_played',
      displayName: 'Время',
      order: 2,
      isVisible: true
    },
    {
      sourceHeader: 'Дистанция',
      canonicalKey: 'total_distance_m',
      displayName: 'Дистанция',
      order: 3,
      isVisible: true
    }
  ];

  describe('filterCanonicalData', () => {
    it('should filter empty rows', () => {
      const rows = [
        { athlete_name: '', minutes_played: 0, total_distance_m: 0 },
        { athlete_name: '-', minutes_played: 0, total_distance_m: 0 },
        { athlete_name: 'n/a', minutes_played: 0, total_distance_m: 0 },
        { athlete_name: '   ', minutes_played: 0, total_distance_m: 0 },
        { athlete_name: 'John Doe', minutes_played: 90, total_distance_m: 5000 }
      ];

      const result = filterCanonicalData(rows, mockColumns);
      
      expect(result.filteredRows).toHaveLength(1);
      expect(result.filteredRows[0].athlete_name).toBe('John Doe');
      expect(result.filteredCount).toBe(4);
    });

    it('should filter summary rows', () => {
      const rows = [
        { athlete_name: 'Итог', minutes_played: 90, total_distance_m: 5000 },
        { athlete_name: 'Total', minutes_played: 90, total_distance_m: 5000 },
        { athlete_name: 'Summary', minutes_played: 90, total_distance_m: 5000 },
        { athlete_name: 'Среднее', minutes_played: 90, total_distance_m: 5000 },
        { athlete_name: 'John Doe', minutes_played: 90, total_distance_m: 5000 }
      ];

      const result = filterCanonicalData(rows, mockColumns);
      
      expect(result.filteredRows).toHaveLength(1);
      expect(result.filteredRows[0].athlete_name).toBe('John Doe');
      expect(result.filteredCount).toBe(4);
    });

    it('should filter rows with extreme values', () => {
      const rows = [
        { athlete_name: 'Player 1', minutes_played: 400, total_distance_m: 5000 }, // > 300 min
        { athlete_name: 'Player 2', minutes_played: 90, total_distance_m: 60000 }, // > 50000 m
        { athlete_name: 'Player 3', minutes_played: 90, total_distance_m: 5000 }
      ];

      const result = filterCanonicalData(rows, mockColumns);
      
      expect(result.filteredRows).toHaveLength(1);
      expect(result.filteredRows[0].athlete_name).toBe('Player 3');
      expect(result.filteredCount).toBe(2);
      expect(result.warnings).toHaveLength(2);
    });

    it('should handle missing athlete_name column', () => {
      const columnsWithoutName = mockColumns.filter(col => col.canonicalKey !== 'athlete_name');
      const rows = [
        { minutes_played: 90, total_distance_m: 5000 }
      ];

      const result = filterCanonicalData(rows, columnsWithoutName);
      
      expect(result.filteredRows).toEqual(rows);
      expect(result.warnings).toContain('Колонка athlete_name не найдена в profileSnapshot');
    });

    it('should preserve valid rows', () => {
      const rows = [
        { athlete_name: 'John Doe', minutes_played: 90, total_distance_m: 5000 },
        { athlete_name: 'Jane Smith', minutes_played: 85, total_distance_m: 4800 },
        { athlete_name: 'Bob Johnson', minutes_played: 95, total_distance_m: 5200 }
      ];

      const result = filterCanonicalData(rows, mockColumns);
      
      expect(result.filteredRows).toHaveLength(3);
      expect(result.filteredCount).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('getPlayerNameFromRow', () => {
    it('should extract player name from row', () => {
      const row = { athlete_name: 'John Doe', minutes_played: 90 };
      const name = getPlayerNameFromRow(row, mockColumns);
      
      expect(name).toBe('John Doe');
    });

    it('should handle missing athlete_name column', () => {
      const columnsWithoutName = mockColumns.filter(col => col.canonicalKey !== 'athlete_name');
      const row = { minutes_played: 90 };
      const name = getPlayerNameFromRow(row, columnsWithoutName);
      
      expect(name).toBeNull();
    });

    it('should handle null/undefined values', () => {
      const row1 = { athlete_name: null, minutes_played: 90 };
      const row2 = { athlete_name: undefined, minutes_played: 90 };
      const row3 = { athlete_name: '', minutes_played: 90 };
      
      expect(getPlayerNameFromRow(row1, mockColumns)).toBeNull();
      expect(getPlayerNameFromRow(row2, mockColumns)).toBeNull();
      expect(getPlayerNameFromRow(row3, mockColumns)).toBeNull();
    });

    it('should trim whitespace', () => {
      const row = { athlete_name: '  John Doe  ', minutes_played: 90 };
      const name = getPlayerNameFromRow(row, mockColumns);
      
      expect(name).toBe('John Doe');
    });
  });
});
