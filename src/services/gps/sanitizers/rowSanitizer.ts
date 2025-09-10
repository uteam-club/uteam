// services/gps/sanitizers/rowSanitizer.ts

export interface SanitizationResult {
  filteredRows: Record<string, any>[];
  droppedCount: number;
  warnings: Array<{ code: string; message: string; count?: number }>;
}

/**
 * Checks if a row is a summary row (contains totals, averages, etc.)
 * @param cells - row data
 * @returns true if row appears to be a summary
 */
export function isSummaryRow(cells: Record<string, any>): boolean {
  // Look for summary keywords in any text fields
  const texts = Object.values(cells)
    .filter(v => typeof v === 'string')
    .map(s => s.toLowerCase().trim());
  
  const summaryKeywords = [
    'итог', 'итого', 'total', 'sum', 'всего', 'сумма', 'среднее', 'average',
    'средний', 'mean', 'общий', 'general', 'итого', 'суммарный', 'aggregate',
    'сводка', 'report', 'summary', 'всего', 'общий', 'итог'
  ];
  
  return texts.some(text => 
    summaryKeywords.some(keyword => text.includes(keyword))
  );
}

/**
 * Checks if a row is a service row (empty, n/a, dashes, etc.)
 * @param cells - row data
 * @returns true if row appears to be empty/service
 */
export function isServiceRow(cells: Record<string, any>): boolean {
  const vals = Object.values(cells);
  
  const allEmpty = vals.every(v => {
    if (v === null || v === undefined || v === '') return true;
    if (typeof v === 'string') {
      const trimmed = v.trim();
      return trimmed === '' || trimmed === '-' || trimmed === '—' || 
             trimmed.toLowerCase() === 'n/a' || trimmed.toLowerCase() === 'n\\a';
    }
    return false;
  });
  
  return allEmpty;
}

/**
 * Checks if all metric values in a row are empty
 * @param row - row data
 * @param metricKeys - keys of metric columns to check
 * @returns true if all metrics are empty
 */
export function areAllMetricsEmpty(row: Record<string, any>, metricKeys: string[]): boolean {
  return metricKeys.every(key => {
    const value = row[key];
    return value === null || 
           value === undefined || 
           value === '' || 
           (typeof value === 'number' && (Number.isNaN(value) || value === 0));
  });
}

/**
 * Removes useless rows from the dataset
 * @param rows - array of row data
 * @param metricKeys - keys of metric columns to check
 * @returns sanitization result with filtered rows and statistics
 */
export function dropUselessRows(
  rows: Record<string, any>[], 
  metricKeys: string[]
): SanitizationResult {
  const filteredRows: Record<string, any>[] = [];
  const warnings: Array<{ code: string; message: string; count?: number }> = [];
  
  let summaryCount = 0;
  let serviceCount = 0;
  let emptyMetricsCount = 0;
  
  for (const row of rows) {
    // Skip summary rows
    if (isSummaryRow(row)) {
      summaryCount++;
      continue;
    }
    
    // Skip service rows (n/a, -, empty)
    if (isServiceRow(row)) {
      serviceCount++;
      continue;
    }
    
    // Skip rows where all metrics are empty
    if (areAllMetricsEmpty(row, metricKeys)) {
      emptyMetricsCount++;
      continue;
    }
    
    // Keep the row
    filteredRows.push(row);
  }
  
  // Add warnings for dropped rows
  if (summaryCount > 0) {
    warnings.push({
      code: 'SUMMARY_ROWS_DROPPED',
      message: `Dropped ${summaryCount} summary/total rows`,
      count: summaryCount
    });
  }
  
  if (serviceCount > 0) {
    warnings.push({
      code: 'SERVICE_ROWS_DROPPED',
      message: `Dropped ${serviceCount} empty/service rows (n/a, -, empty)`,
      count: serviceCount
    });
  }
  
  if (emptyMetricsCount > 0) {
    warnings.push({
      code: 'EMPTY_METRICS_ROWS_DROPPED',
      message: `Dropped ${emptyMetricsCount} rows with empty metrics`,
      count: emptyMetricsCount
    });
  }
  
  const totalDropped = summaryCount + serviceCount + emptyMetricsCount;
  
  if (totalDropped > 0) {
    warnings.push({
      code: 'ROWS_SANITIZED',
      message: `Total rows sanitized: ${totalDropped} dropped, ${filteredRows.length} kept`,
      count: totalDropped
    });
  }
  
  return {
    filteredRows,
    droppedCount: totalDropped,
    warnings
  };
}

/**
 * Sanitizes rows and adds warnings to import metadata
 * @param rows - array of row data
 * @param metricKeys - keys of metric columns to check
 * @param importMeta - existing import metadata
 * @returns sanitized rows and updated import metadata
 */
export function sanitizeRowsWithWarnings(
  rows: Record<string, any>[],
  metricKeys: string[],
  importMeta: any = {}
): {
  sanitizedRows: Record<string, any>[];
  updatedImportMeta: any;
} {
  const result = dropUselessRows(rows, metricKeys);
  
  // Initialize warnings array if it doesn't exist
  if (!importMeta.warnings) {
    importMeta.warnings = [];
  }
  
  // Add sanitization warnings
  importMeta.warnings.push(...result.warnings);
  
  return {
    sanitizedRows: result.filteredRows,
    updatedImportMeta: importMeta
  };
}
