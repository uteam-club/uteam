// canon/__tests__/units.conversion.test.ts
import { convertUnit } from '../units';

describe('Units Conversion', () => {
  describe('Speed conversions', () => {
    it('should convert km/h to m/s', () => {
      const result = convertUnit(18, 'km/h', 'm/s', 'speed');
      expect(result).toBeCloseTo(5, 1);
    });

    it('should convert m/s to km/h', () => {
      const result = convertUnit(5, 'm/s', 'km/h', 'speed');
      expect(result).toBeCloseTo(18, 1);
    });

    it('should handle same unit conversion', () => {
      const result = convertUnit(10, 'm/s', 'm/s', 'speed');
      expect(result).toBe(10);
    });
  });

  describe('Ratio conversions', () => {
    it('should convert % to ratio', () => {
      const result = convertUnit(7, '%', 'ratio', 'ratio');
      expect(result).toBeCloseTo(0.07, 3);
    });

    it('should convert ratio to %', () => {
      const result = convertUnit(0.085, 'ratio', '%', 'ratio');
      expect(result).toBeCloseTo(8.5, 1);
    });

    it('should handle same unit conversion', () => {
      const result = convertUnit(0.5, 'ratio', 'ratio', 'ratio');
      expect(result).toBe(0.5);
    });
  });

  describe('Time conversions', () => {
    it('should convert minutes to seconds', () => {
      const result = convertUnit(2, 'min', 's', 'time');
      expect(result).toBe(120);
    });

    it('should convert seconds to minutes', () => {
      const result = convertUnit(120, 's', 'min', 'time');
      expect(result).toBe(2);
    });

    it('should convert hours to seconds', () => {
      const result = convertUnit(1, 'h', 's', 'time');
      expect(result).toBe(3600);
    });
  });

  describe('Distance conversions', () => {
    it('should convert km to meters', () => {
      const result = convertUnit(5, 'km', 'm', 'distance');
      expect(result).toBe(5000);
    });

    it('should convert meters to km', () => {
      const result = convertUnit(5000, 'm', 'km', 'distance');
      expect(result).toBe(5);
    });
  });

  describe('Error handling', () => {
    it('should throw error for unsupported conversion', () => {
      expect(() => {
        convertUnit(10, 'invalid_unit', 'm/s', 'speed');
      }).toThrow();
    });

    it('should throw error for unsupported dimension', () => {
      expect(() => {
        convertUnit(10, 'm/s', 'km/h', 'invalid_dimension');
      }).toThrow();
    });
  });
});
