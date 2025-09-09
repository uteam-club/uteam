import * as XLSX from 'xlsx';
import { ProfileSnapshotColumn, CanonicalColumnKey, ImportMeta } from '@/types/gps';

export interface ParsedSheet {
  headers: string[];
  rows: (string | number | null)[][];
}

export interface GpsProfile {
  id: string;
  gpsSystem: string;
  columnMapping: Array<{
    type?: 'column' | 'formula';
    name: string;
    mappedColumn?: string;
    canonicalKey?: string;
    isVisible?: boolean;
    order?: number;
    unit?: string;
    transform?: string;
  }>;
  createdAt: string;
}

export interface ApplyProfileResult {
  mappedColumns: ProfileSnapshotColumn[];
  dataRows: Record<CanonicalColumnKey, (string | number | null)[]>;
  warnings: string[];
}

/**
 * Парсит Excel/CSV файл в структурированные данные
 */
export async function parseSpreadsheet(file: Buffer, fileName: string): Promise<ParsedSheet> {
  let workbook: XLSX.WorkBook;

  try {
    if (fileName.endsWith('.csv')) {
      const text = new TextDecoder().decode(file);
      workbook = XLSX.read(text, { type: 'string' });
    } else {
      workbook = XLSX.read(file, { type: 'buffer' });
    }
  } catch (error) {
    throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Получаем первый лист
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('No sheets found in file');
  }

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (jsonData.length === 0) {
    throw new Error('Empty file');
  }

  // Получаем заголовки и данные
  const headers = (jsonData[0] as string[]) || [];
  const dataRows = jsonData.slice(1) as (string | number | null)[][];

  return {
    headers: normalizeHeaders(headers),
    rows: dataRows,
  };
}

/**
 * Нормализует заголовки: trim, lowercase, collapse spaces
 */
export function normalizeHeaders(headers: string[]): string[] {
  return headers
    .filter(header => header && header.trim() !== '')
    .map(header => header.trim())
    .filter(header => header.length > 0);
}

/**
 * Применяет профиль к распарсенным данным
 * Сопоставляет ТОЛЬКО по profile.columnMapping[].mappedColumn → индекс в headers
 */
export function applyProfile(parsed: ParsedSheet, profile: GpsProfile): ApplyProfileResult {
  const { headers, rows } = parsed;
  const warnings: string[] = [];
  const mappedColumns: ProfileSnapshotColumn[] = [];
  const dataRows: Record<CanonicalColumnKey, (string | number | null)[]> = {};

  // Создаем мапу заголовков для быстрого поиска
  const headerMap = new Map<string, number>();
  headers.forEach((header, index) => {
    headerMap.set(header.toLowerCase(), index);
  });

  // Обрабатываем каждую колонку из профиля
  for (const col of profile.columnMapping || []) {
    if (col.type !== 'column' || !col.mappedColumn || !col.canonicalKey) {
      continue;
    }

    // Ищем колонку в заголовках (case-insensitive)
    const headerIndex = headerMap.get(col.mappedColumn.toLowerCase());
    
    if (headerIndex === undefined) {
      warnings.push(`Column "${col.mappedColumn}" not found in file headers`);
      continue;
    }

    // Добавляем в mappedColumns
    mappedColumns.push({
      sourceHeader: col.mappedColumn,
      canonicalKey: col.canonicalKey,
      displayName: col.name,
      order: col.order || 0,
      isVisible: col.isVisible ?? true,
      unit: null,
      transform: null,
    });

    // Извлекаем данные для этой колонки
    const columnData: (string | number | null)[] = [];
    for (const row of rows) {
      columnData.push(row[headerIndex] || null);
    }
    
    dataRows[col.canonicalKey] = columnData;
  }

  // Сортируем колонки по порядку
  mappedColumns.sort((a, b) => a.order - b.order);

  return {
    mappedColumns,
    dataRows,
    warnings,
  };
}
