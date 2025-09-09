import { parseSpreadsheet, applyProfile, normalizeHeaders } from '../ingest.service';

// Mock XLSX
jest.mock('xlsx', () => ({
  read: jest.fn(),
  utils: {
    sheet_to_json: jest.fn(),
  },
}));

describe('GPS Ingest Service', () => {
  describe('normalizeHeaders', () => {
    it('should trim and filter empty headers', () => {
      const headers = ['  Name  ', '', '  Distance  ', '  ', 'Speed'];
      const result = normalizeHeaders(headers);
      expect(result).toEqual(['Name', 'Distance', 'Speed']);
    });

    it('should handle empty array', () => {
      const result = normalizeHeaders([]);
      expect(result).toEqual([]);
    });
  });

  describe('applyProfile', () => {
    const mockProfile = {
      id: 'profile-1',
      gpsSystem: 'Test',
      columnMapping: [
        {
          type: 'column' as const,
          name: 'Player Name',
          mappedColumn: 'Name',
          canonicalKey: 'athlete_name',
          isVisible: true,
          order: 0,
        },
        {
          type: 'column' as const,
          name: 'Total Distance',
          mappedColumn: 'Distance',
          canonicalKey: 'total_distance_m',
          isVisible: true,
          order: 1,
        },
        {
          type: 'formula' as const,
          name: 'Calculated Field',
          formula: 'distance * 2',
        },
      ],
      createdAt: '2024-01-01T00:00:00Z',
    };

    it('should map columns correctly by header names', () => {
      const parsed = {
        headers: ['Name', 'Distance', 'Speed'],
        rows: [
          ['Player 1', '1000', '5.5'],
          ['Player 2', '2000', '6.0'],
        ],
      };

      const result = applyProfile(parsed, mockProfile);

      expect(result.mappedColumns).toHaveLength(2);
      expect(result.mappedColumns[0]).toEqual({
        sourceHeader: 'Name',
        canonicalKey: 'athlete_name',
        displayName: 'Player Name',
        order: 0,
        isVisible: true,
        unit: null,
        transform: null,
      });

      expect(result.dataRows.athlete_name).toEqual(['Player 1', 'Player 2']);
      expect(result.dataRows.total_distance_m).toEqual(['1000', '2000']);
    });

    it('should handle case-insensitive header matching', () => {
      const parsed = {
        headers: ['name', 'DISTANCE', 'speed'],
        rows: [
          ['Player 1', '1000', '5.5'],
        ],
      };

      const result = applyProfile(parsed, mockProfile);

      expect(result.mappedColumns).toHaveLength(2);
      expect(result.dataRows.athlete_name).toEqual(['Player 1']);
      expect(result.dataRows.total_distance_m).toEqual(['1000']);
    });

    it('should generate warnings for missing columns', () => {
      const parsed = {
        headers: ['Name', 'Speed'], // Missing 'Distance'
        rows: [
          ['Player 1', '5.5'],
        ],
      };

      const result = applyProfile(parsed, mockProfile);

      expect(result.warnings).toContain('Column "Distance" not found in file headers');
      expect(result.mappedColumns).toHaveLength(1); // Only 'Name' mapped
    });

    it('should sort columns by order', () => {
      const profileWithOrder = {
        ...mockProfile,
        columnMapping: [
          {
            type: 'column' as const,
            name: 'Second',
            mappedColumn: 'B',
            canonicalKey: 'second_field',
            order: 2,
          },
          {
            type: 'column' as const,
            name: 'First',
            mappedColumn: 'A',
            canonicalKey: 'first_field',
            order: 1,
          },
        ],
      };

      const parsed = {
        headers: ['A', 'B'],
        rows: [['1', '2']],
      };

      const result = applyProfile(parsed, profileWithOrder);

      expect(result.mappedColumns[0].canonicalKey).toBe('first_field');
      expect(result.mappedColumns[1].canonicalKey).toBe('second_field');
    });

    it('should skip formula columns', () => {
      const parsed = {
        headers: ['Name', 'Distance'],
        rows: [['Player 1', '1000']],
      };

      const result = applyProfile(parsed, mockProfile);

      expect(result.mappedColumns).toHaveLength(2);
      expect(result.mappedColumns.every(col => col.canonicalKey !== 'calculated_field')).toBe(true);
    });
  });

  describe('parseSpreadsheet', () => {
    it('should parse CSV files', async () => {
      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([
        ['Name', 'Distance'],
        ['Player 1', '1000'],
      ]);

      const buffer = Buffer.from('Name,Distance\nPlayer 1,1000');
      const result = await parseSpreadsheet(buffer, 'test.csv');

      expect(result.headers).toEqual(['Name', 'Distance']);
      expect(result.rows).toEqual([['Player 1', '1000']]);
    });

    it('should throw error for empty file', async () => {
      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {},
        },
      });
      XLSX.utils.sheet_to_json.mockReturnValue([]);

      const buffer = Buffer.from('');
      
      await expect(parseSpreadsheet(buffer, 'empty.csv'))
        .rejects.toThrow('Empty file');
    });

    it('should throw error for file with no sheets', async () => {
      const XLSX = require('xlsx');
      XLSX.read.mockReturnValue({
        SheetNames: [],
      });

      const buffer = Buffer.from('some data');
      
      await expect(parseSpreadsheet(buffer, 'no-sheets.xlsx'))
        .rejects.toThrow('No sheets found in file');
    });
  });
});
