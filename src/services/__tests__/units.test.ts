// services/__tests__/units.test.ts
import { fromCanonical, formatDisplayValue, getDisplayUnit } from '../units';
import { ProfileSnapshotColumn } from '@/types/gps';

describe('Units Service', () => {
  describe('fromCanonical', () => {
    it('should convert max_speed_ms to km/h', () => {
      const result = fromCanonical(7.78, 'max_speed_ms', 'km/h');
      expect(result).toBeCloseTo(28.0, 1);
    });

    it('should convert hsr_ratio to percentage', () => {
      const result = fromCanonical(0.085, 'hsr_ratio', '%');
      expect(result).toBeCloseTo(8.5, 1);
    });

    it('should handle null values', () => {
      expect(fromCanonical(null, 'max_speed_ms', 'km/h')).toBeNull();
      expect(fromCanonical(undefined, 'max_speed_ms', 'km/h')).toBeNull();
      expect(fromCanonical('', 'max_speed_ms', 'km/h')).toBeNull();
    });

    it('should handle string values', () => {
      const result = fromCanonical('7.78', 'max_speed_ms', 'km/h');
      expect(result).toBeCloseTo(28.0, 1);
    });

    it('should return original value if display unit equals canonical unit', () => {
      const result = fromCanonical(7.78, 'max_speed_ms', 'm/s');
      expect(result).toBe(7.78);
    });

    it('should return original value if metric not found', () => {
      const result = fromCanonical(7.78, 'unknown_metric', 'km/h');
      expect(result).toBe(7.78);
    });

    it('should return original value if conversion not allowed', () => {
      const result = fromCanonical(7.78, 'max_speed_ms', 'invalid_unit');
      expect(result).toBe(7.78);
    });

    it('should handle conversion errors gracefully', () => {
      const result = fromCanonical(7.78, 'max_speed_ms', 'invalid_unit');
      expect(result).toBe(7.78);
    });
  });

  describe('formatDisplayValue', () => {
    it('should format percentage values', () => {
      expect(formatDisplayValue(8.5, '%')).toBe('8.5%');
      expect(formatDisplayValue(50.0, '%')).toBe('50.0%');
    });

    it('should format km/h values', () => {
      expect(formatDisplayValue(28.0, 'km/h')).toBe('28.0 км/ч');
    });

    it('should format m/s values', () => {
      expect(formatDisplayValue(7.78, 'm/s')).toBe('7.8 м/с');
    });

    it('should format distance values', () => {
      expect(formatDisplayValue(1000, 'm')).toBe('1000 м');
    });

    it('should format time values', () => {
      expect(formatDisplayValue(90, 's')).toBe('90 с');
      expect(formatDisplayValue(1.5, 'min')).toBe('1.5 мин');
    });

    it('should format ratio values', () => {
      expect(formatDisplayValue(0.085, 'ratio')).toBe('0.085');
    });

    it('should handle null values', () => {
      expect(formatDisplayValue(null, '%')).toBe('—');
      expect(formatDisplayValue(NaN, '%')).toBe('—');
    });

    it('should handle unknown units', () => {
      expect(formatDisplayValue(123.45, 'unknown')).toBe('123.5');
    });
  });

  describe('getDisplayUnit', () => {
    it('should return displayUnit from column if available', () => {
      const column: ProfileSnapshotColumn = {
        sourceHeader: 'Max Speed',
        canonicalKey: 'max_speed_ms',
        displayName: 'Max Speed',
        order: 1,
        isVisible: true,
        displayUnit: 'km/h'
      };
      
      expect(getDisplayUnit(column)).toBe('km/h');
    });

    it('should return canonical unit if displayUnit not available', () => {
      const column: ProfileSnapshotColumn = {
        sourceHeader: 'Max Speed',
        canonicalKey: 'max_speed_ms',
        displayName: 'Max Speed',
        order: 1,
        isVisible: true
      };
      
      expect(getDisplayUnit(column)).toBe('m/s');
    });

    it('should return unknown if metric not found', () => {
      const column: ProfileSnapshotColumn = {
        sourceHeader: 'Unknown',
        canonicalKey: 'unknown_metric',
        displayName: 'Unknown',
        order: 1,
        isVisible: true
      };
      
      expect(getDisplayUnit(column)).toBe('unknown');
    });
  });
});
