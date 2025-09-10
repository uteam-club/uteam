// services/gps/validators/__tests__/nameColumn.validator.test.ts
import { detectPositionLike, suggestAthleteNameColumn, validateAthleteNameColumn } from '../nameColumn.validator';

describe('Name Column Validator', () => {
  describe('detectPositionLike', () => {
    it('should detect position codes in English', () => {
      const values = ['MF', 'W', 'CB', 'GK', 'ST'];
      const result = detectPositionLike(values, 'en');
      
      expect(result.posRatio).toBe(1.0); // 5/5 = 100%
      expect(result.nameRatio).toBe(0.0); // 0/5 = 0%
      expect(result.isPositionMapped).toBe(true);
    });

    it('should detect position codes in Russian', () => {
      const values = ['ВР', 'ЦЗ', 'ПЗ', 'ЛЗ', 'Н'];
      const result = detectPositionLike(values, 'ru');
      
      expect(result.posRatio).toBe(1.0); // 5/5 = 100%
      expect(result.nameRatio).toBe(0.0); // 0/5 = 0%
      expect(result.isPositionMapped).toBe(true);
    });

    it('should detect mixed position and name data', () => {
      const values = ['MF', 'John Doe', 'W', 'Jane Smith', 'CB'];
      const result = detectPositionLike(values, 'en');
      
      expect(result.posRatio).toBe(0.6); // 3/5 = 60%
      expect(result.nameRatio).toBe(0.4); // 2/5 = 40%
      expect(result.isPositionMapped).toBe(false); // 60% >= 60% && 40% < 30% = false
    });

    it('should detect actual names', () => {
      const values = ['John Doe', 'Jane Smith', 'Mike Johnson', 'Sarah Wilson', 'Tom Brown'];
      const result = detectPositionLike(values, 'en');
      
      expect(result.posRatio).toBe(0.0); // 0/5 = 0%
      expect(result.nameRatio).toBe(1.0); // 5/5 = 100%
      expect(result.isPositionMapped).toBe(false);
    });

    it('should handle empty and null values', () => {
      const values = ['', null, undefined, 'MF', 'W'];
      const result = detectPositionLike(values, 'en');
      
      expect(result.posRatio).toBe(0.4); // 2/5 = 40%
      expect(result.nameRatio).toBe(0.0); // 0/5 = 0%
      expect(result.isPositionMapped).toBe(false); // 40% < 60%
    });

    it('should handle service values', () => {
      const values = ['N/A', 'n/a', '-', '—', 'MF'];
      const result = detectPositionLike(values, 'en');
      
      expect(result.posRatio).toBe(1.0); // 5/5 = 100% (N/A, n/a, -, —, MF)
      expect(result.nameRatio).toBe(0.0); // 0/5 = 0%
      expect(result.isPositionMapped).toBe(true);
    });

    it('should handle short caps pattern', () => {
      const values = ['A', 'B', 'C', 'D', 'E'];
      const result = detectPositionLike(values, 'en');
      
      expect(result.posRatio).toBe(1.0); // 5/5 = 100% (all match shortCaps pattern)
      expect(result.nameRatio).toBe(0.0); // 0/5 = 0%
      expect(result.isPositionMapped).toBe(true);
    });
  });

  describe('suggestAthleteNameColumn', () => {
    it('should suggest English name columns', () => {
      const headers = ['Player', 'Position', 'Distance', 'Speed'];
      const result = suggestAthleteNameColumn(headers);
      expect(result).toBe('Player');
    });

    it('should suggest name variations', () => {
      const headers = ['Name', 'Surname', 'First Name', 'Last Name'];
      const result = suggestAthleteNameColumn(headers);
      expect(result).toBe('Name');
    });

    it('should suggest Russian name columns', () => {
      const headers = ['Игрок', 'Позиция', 'Дистанция', 'Скорость'];
      const result = suggestAthleteNameColumn(headers);
      expect(result).toBe('Игрок');
    });

    it('should suggest full name columns', () => {
      const headers = ['Full Name', 'Player Name', 'Athlete'];
      const result = suggestAthleteNameColumn(headers);
      expect(result).toBe('Full Name');
    });

    it('should return undefined if no name columns found', () => {
      const headers = ['Position', 'Distance', 'Speed', 'Time'];
      const result = suggestAthleteNameColumn(headers);
      expect(result).toBeUndefined();
    });

    it('should be case insensitive', () => {
      const headers = ['player', 'PLAYER', 'Player', 'pLaYeR'];
      const result = suggestAthleteNameColumn(headers);
      expect(result).toBe('player');
    });
  });

  describe('validateAthleteNameColumn', () => {
    it('should detect position mapping and suggest alternative', () => {
      const values = ['MF', 'W', 'CB', 'GK', 'ST'];
      const headers = ['Position', 'Player', 'Distance', 'Speed'];
      const sourceHeader = 'Position';
      
      const result = validateAthleteNameColumn(values, headers, sourceHeader);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('POSITION_MAPPED_AS_NAME');
      expect(result.warnings[0].column).toBe('Position');
      expect(result.suggestions.athleteNameHeader).toBe('Player');
    });

    it('should not warn for valid name columns', () => {
      const values = ['John Doe', 'Jane Smith', 'Mike Johnson'];
      const headers = ['Player', 'Position', 'Distance'];
      const sourceHeader = 'Player';
      
      const result = validateAthleteNameColumn(values, headers, sourceHeader);
      
      expect(result.warnings).toHaveLength(0);
      expect(result.suggestions.athleteNameHeader).toBeUndefined();
    });

    it('should warn but not suggest if no alternative found', () => {
      const values = ['MF', 'W', 'CB'];
      const headers = ['Position', 'Distance', 'Speed'];
      const sourceHeader = 'Position';
      
      const result = validateAthleteNameColumn(values, headers, sourceHeader);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe('POSITION_MAPPED_AS_NAME');
      expect(result.suggestions.athleteNameHeader).toBeUndefined();
    });

    it('should not suggest same column', () => {
      const values = ['MF', 'W', 'CB'];
      const headers = ['Player', 'Position', 'Distance'];
      const sourceHeader = 'Player';
      
      const result = validateAthleteNameColumn(values, headers, sourceHeader);
      
      expect(result.warnings).toHaveLength(1);
      expect(result.suggestions.athleteNameHeader).toBeUndefined();
    });
  });
});
