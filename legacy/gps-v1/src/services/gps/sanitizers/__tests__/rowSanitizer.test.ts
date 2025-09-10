// services/gps/sanitizers/__tests__/rowSanitizer.test.ts
import { 
  isSummaryRow, 
  isServiceRow, 
  areAllMetricsEmpty, 
  dropUselessRows, 
  sanitizeRowsWithWarnings 
} from '../rowSanitizer';

describe('Row Sanitizer', () => {
  describe('isSummaryRow', () => {
    it('should detect English summary rows', () => {
      expect(isSummaryRow({ athlete_name: 'Total', distance: 1000 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Average', distance: 500 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Sum', distance: 2000 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Summary', distance: 1500 })).toBe(true);
    });

    it('should detect Russian summary rows', () => {
      expect(isSummaryRow({ athlete_name: 'Итого', distance: 1000 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Итог', distance: 500 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Всего', distance: 2000 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Среднее', distance: 1500 })).toBe(true);
    });

    it('should detect summary in any text field', () => {
      expect(isSummaryRow({ athlete_name: 'Player 1', notes: 'Total distance' })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Player 2', comment: 'Average speed' })).toBe(true);
    });

    it('should not detect regular player rows', () => {
      expect(isSummaryRow({ athlete_name: 'John Doe', distance: 1000 })).toBe(false);
      expect(isSummaryRow({ athlete_name: 'Jane Smith', distance: 500 })).toBe(false);
      expect(isSummaryRow({ athlete_name: 'Mike Johnson', distance: 2000 })).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(isSummaryRow({ athlete_name: 'TOTAL', distance: 1000 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'total', distance: 500 })).toBe(true);
      expect(isSummaryRow({ athlete_name: 'Total', distance: 2000 })).toBe(true);
    });
  });

  describe('isServiceRow', () => {
    it('should detect empty rows', () => {
      expect(isServiceRow({ athlete_name: '', distance: null })).toBe(true);
      expect(isServiceRow({ athlete_name: null, distance: undefined })).toBe(true);
      expect(isServiceRow({ athlete_name: undefined, distance: '' })).toBe(true);
    });

    it('should detect n/a rows', () => {
      expect(isServiceRow({ athlete_name: 'n/a', distance: 'n/a' })).toBe(true);
      expect(isServiceRow({ athlete_name: 'N/A', distance: 'N/A' })).toBe(true);
      expect(isServiceRow({ athlete_name: 'n\\a', distance: 'n\\a' })).toBe(true);
    });

    it('should detect dash rows', () => {
      expect(isServiceRow({ athlete_name: '-', distance: '-' })).toBe(true);
      expect(isServiceRow({ athlete_name: '—', distance: '—' })).toBe(true);
    });

    it('should not detect rows with actual data', () => {
      expect(isServiceRow({ athlete_name: 'John Doe', distance: 1000 })).toBe(false);
      expect(isServiceRow({ athlete_name: 'Jane Smith', distance: 500 })).toBe(false);
      expect(isServiceRow({ athlete_name: 'Mike Johnson', distance: 0 })).toBe(false);
    });

    it('should handle mixed empty and data', () => {
      expect(isServiceRow({ athlete_name: '', distance: 1000 })).toBe(false);
      expect(isServiceRow({ athlete_name: 'John Doe', distance: '' })).toBe(false);
    });
  });

  describe('areAllMetricsEmpty', () => {
    it('should detect rows with all empty metrics', () => {
      const row = { athlete_name: 'John Doe', distance: null, speed: undefined, time: '' };
      const metricKeys = ['distance', 'speed', 'time'];
      expect(areAllMetricsEmpty(row, metricKeys)).toBe(true);
    });

    it('should detect rows with zero metrics', () => {
      const row = { athlete_name: 'John Doe', distance: 0, speed: 0, time: 0 };
      const metricKeys = ['distance', 'speed', 'time'];
      expect(areAllMetricsEmpty(row, metricKeys)).toBe(true);
    });

    it('should not detect rows with some data', () => {
      const row = { athlete_name: 'John Doe', distance: 1000, speed: null, time: '' };
      const metricKeys = ['distance', 'speed', 'time'];
      expect(areAllMetricsEmpty(row, metricKeys)).toBe(false);
    });

    it('should not detect rows with all data', () => {
      const row = { athlete_name: 'John Doe', distance: 1000, speed: 5.5, time: 90 };
      const metricKeys = ['distance', 'speed', 'time'];
      expect(areAllMetricsEmpty(row, metricKeys)).toBe(false);
    });
  });

  describe('dropUselessRows', () => {
    it('should filter out summary rows', () => {
      const rows = [
        { athlete_name: 'John Doe', distance: 1000, speed: 5.5 },
        { athlete_name: 'Total', distance: 2000, speed: 6.0 },
        { athlete_name: 'Jane Smith', distance: 1500, speed: 4.8 }
      ];
      const metricKeys = ['distance', 'speed'];
      
      const result = dropUselessRows(rows, metricKeys);
      
      expect(result.filteredRows).toHaveLength(2);
      expect(result.filteredRows[0].athlete_name).toBe('John Doe');
      expect(result.filteredRows[1].athlete_name).toBe('Jane Smith');
      expect(result.droppedCount).toBe(1);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'SUMMARY_ROWS_DROPPED', count: 1 })
      );
    });

    it('should filter out service rows', () => {
      const rows = [
        { athlete_name: 'John Doe', distance: 1000, speed: 5.5 },
        { athlete_name: 'n/a', distance: 'n/a', speed: 'n/a' },
        { athlete_name: 'Jane Smith', distance: 1500, speed: 4.8 }
      ];
      const metricKeys = ['distance', 'speed'];
      
      const result = dropUselessRows(rows, metricKeys);
      
      expect(result.filteredRows).toHaveLength(2);
      expect(result.filteredRows[0].athlete_name).toBe('John Doe');
      expect(result.filteredRows[1].athlete_name).toBe('Jane Smith');
      expect(result.droppedCount).toBe(1);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'SERVICE_ROWS_DROPPED', count: 1 })
      );
    });

    it('should filter out rows with empty metrics', () => {
      const rows = [
        { athlete_name: 'John Doe', distance: 1000, speed: 5.5 },
        { athlete_name: 'Jane Smith', distance: null, speed: undefined },
        { athlete_name: 'Mike Johnson', distance: 1500, speed: 4.8 }
      ];
      const metricKeys = ['distance', 'speed'];
      
      const result = dropUselessRows(rows, metricKeys);
      
      expect(result.filteredRows).toHaveLength(2);
      expect(result.filteredRows[0].athlete_name).toBe('John Doe');
      expect(result.filteredRows[1].athlete_name).toBe('Mike Johnson');
      expect(result.droppedCount).toBe(1);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'EMPTY_METRICS_ROWS_DROPPED', count: 1 })
      );
    });

    it('should handle mixed filtering', () => {
      const rows = [
        { athlete_name: 'John Doe', distance: 1000, speed: 5.5 },
        { athlete_name: 'Total', distance: 2000, speed: 6.0 },
        { athlete_name: 'n/a', distance: 'n/a', speed: 'n/a' },
        { athlete_name: 'Jane Smith', distance: null, speed: undefined },
        { athlete_name: 'Mike Johnson', distance: 1500, speed: 4.8 }
      ];
      const metricKeys = ['distance', 'speed'];
      
      const result = dropUselessRows(rows, metricKeys);
      
      expect(result.filteredRows).toHaveLength(2);
      expect(result.filteredRows[0].athlete_name).toBe('John Doe');
      expect(result.filteredRows[1].athlete_name).toBe('Mike Johnson');
      expect(result.droppedCount).toBe(3);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'ROWS_SANITIZED', count: 3 })
      );
    });

    it('should preserve all valid rows', () => {
      const rows = [
        { athlete_name: 'John Doe', distance: 1000, speed: 5.5 },
        { athlete_name: 'Jane Smith', distance: 1500, speed: 4.8 },
        { athlete_name: 'Mike Johnson', distance: 2000, speed: 6.2 }
      ];
      const metricKeys = ['distance', 'speed'];
      
      const result = dropUselessRows(rows, metricKeys);
      
      expect(result.filteredRows).toHaveLength(3);
      expect(result.droppedCount).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('sanitizeRowsWithWarnings', () => {
    it('should sanitize rows and add warnings to import metadata', () => {
      const rows = [
        { athlete_name: 'John Doe', distance: 1000, speed: 5.5 },
        { athlete_name: 'Total', distance: 2000, speed: 6.0 },
        { athlete_name: 'Jane Smith', distance: 1500, speed: 4.8 }
      ];
      const metricKeys = ['distance', 'speed'];
      const importMeta = { warnings: ['Existing warning'] };
      
      const result = sanitizeRowsWithWarnings(rows, metricKeys, importMeta);
      
      expect(result.sanitizedRows).toHaveLength(2);
      expect(result.updatedImportMeta.warnings.length).toBeGreaterThanOrEqual(2);
      expect(result.updatedImportMeta.warnings[0]).toBe('Existing warning');
      expect(result.updatedImportMeta.warnings).toContainEqual(
        expect.objectContaining({ code: 'ROWS_SANITIZED' })
      );
    });

    it('should initialize warnings array if not present', () => {
      const rows = [
        { athlete_name: 'John Doe', distance: 1000, speed: 5.5 },
        { athlete_name: 'Total', distance: 2000, speed: 6.0 }
      ];
      const metricKeys = ['distance', 'speed'];
      const importMeta = {};
      
      const result = sanitizeRowsWithWarnings(rows, metricKeys, importMeta);
      
      expect(result.updatedImportMeta.warnings).toBeDefined();
      expect(Array.isArray(result.updatedImportMeta.warnings)).toBe(true);
    });
  });
});
