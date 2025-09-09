// src/services/gps.debug.ts
import { db } from '@/lib/db';
import { gpsReport, gpsProfile } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildCanonColumns, mapRowsToCanonical, guessUnitFromHeader } from './canon.mapper';

export interface DiagnosticReport {
  meta: {
    reportId: string;
    profileId: string | null;
    gpsSystem: string;
    rowsCount: number;
    hasCanonicalSaved: boolean;
  };
  headers: {
    fromRows: string[];
  };
  mappingMatrix: Array<{
    mappedColumn: string;
    canonicalKey: string;
    presentExact: boolean;
    presentNormalized: boolean;
    guessedUnit?: string;
    sampleValue?: any;
    note?: string;
  }>;
  profileChecks: {
    emptyCanonicalKey: string[];
    emptyMappedColumn: string[];
    duplicatedCanonicalKeys: string[];
  };
  canonicalSavedPreview: {
    units?: any;
    firstRow?: any;
    warnings?: string[];
  };
  canonicalExpectedPreview: {
    units?: any;
    firstRow?: any;
    warnings?: string[];
  };
  diffs: {
    missingInSaved: string[];
    missingInExpected: string[];
    valueSkews?: Array<{ key: string; saved: any; expected: any }>;
  };
  probableCauses: string[];
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[()[\]{}%]/g, '');
}

export async function diagnoseReport(reportId: string): Promise<DiagnosticReport> {
  // 1. Читаем отчет и профиль из БД
  const report = await db.query.gpsReport.findFirst({
    where: eq(gpsReport.id, reportId),
    with: {
      profile: true
    }
  });

  if (!report) {
    throw new Error(`Отчет с ID ${reportId} не найден`);
  }

  const profile = report.profile as any;
  if (!profile) {
    throw new Error(`Профиль для отчета ${reportId} не найден`);
  }

  // 2. Определяем источник строк
  const processedData = report.processedData as any;
  const sourceRows = (Array.isArray(processedData) ? processedData : processedData?.rows) || report.rawData || [];
  const rowsCount = Array.isArray(sourceRows) ? sourceRows.length : 0;
  
  // 3. Извлекаем заголовки из первой строки
  const firstRow = Array.isArray(sourceRows) && sourceRows.length > 0 ? sourceRows[0] : {};
  const headersFromRows = Object.keys(firstRow);

  // 4. Строим матрицу сопоставления
  const mappingMatrix = [];
  const profileColumnMapping = profile.columnMapping || [];
  
  for (const col of profileColumnMapping) {
    if (col?.type !== 'formula' && col?.canonicalKey && col?.mappedColumn) {
      const mappedColumn = String(col.mappedColumn);
      const canonicalKey = String(col.canonicalKey);
      
      const presentExact = headersFromRows.includes(mappedColumn);
      const presentNormalized = headersFromRows.some(h => 
        normalizeHeader(h) === normalizeHeader(mappedColumn)
      );
      
      const guessedUnit = guessUnitFromHeader(mappedColumn);
      const sampleValue = firstRow[mappedColumn];
      
      let note = '';
      if (!presentExact && !presentNormalized) {
        note = 'not found in rows';
      } else if (!presentExact && presentNormalized) {
        note = 'needs normalization';
      }

      mappingMatrix.push({
        mappedColumn,
        canonicalKey,
        presentExact,
        presentNormalized,
        guessedUnit,
        sampleValue,
        note
      });
    }
  }

  // 5. Проверки профиля
  const emptyCanonicalKey = profileColumnMapping
    .filter((c: any) => !c?.canonicalKey)
    .map((c: any) => c?.mappedColumn || c?.name || 'unknown');
    
  const emptyMappedColumn = profileColumnMapping
    .filter((c: any) => !c?.mappedColumn)
    .map((c: any) => c?.canonicalKey || c?.name || 'unknown');

  const canonicalKeys = profileColumnMapping
    .filter((c: any) => c?.canonicalKey)
    .map((c: any) => c.canonicalKey);
  const duplicatedCanonicalKeys = canonicalKeys.filter((key: any, index: number) => 
    canonicalKeys.indexOf(key) !== index
  );

  // 6. Анализ сохраненных канонических данных
  const canonicalSaved = processedData?.canonical;
  const canonicalSavedPreview = {
    units: canonicalSaved?.units,
    firstRow: canonicalSaved?.rows?.[0],
    warnings: [] as string[]
  };

  if (!canonicalSaved?.rows?.length) {
    canonicalSavedPreview.warnings?.push('Нет канонических строк');
  }

  // 7. Пересчитываем ожидаемые канонические данные (в памяти)
  let canonicalExpectedPreview = {
    units: {},
    firstRow: {},
    warnings: [] as string[]
  };

  try {
    const canonColumns = buildCanonColumns(profileColumnMapping);
    if (canonColumns.length === 0) {
      canonicalExpectedPreview.warnings.push('Нет валидных колонок для канонизации');
    } else {
      const expectedCanonical = mapRowsToCanonical(sourceRows, canonColumns);
      canonicalExpectedPreview = {
        units: expectedCanonical.meta.units,
        firstRow: expectedCanonical.rows?.[0],
        warnings: []
      };
    }
  } catch (error) {
    canonicalExpectedPreview.warnings.push(`Ошибка пересчета: ${error}`);
  }

  // 8. Сравнение сохраненного и ожидаемого
  const savedKeys = canonicalSaved?.rows?.[0] ? Object.keys(canonicalSaved.rows[0]) : [];
  const expectedKeys = canonicalExpectedPreview.firstRow ? Object.keys(canonicalExpectedPreview.firstRow) : [];
  
  const missingInSaved = expectedKeys.filter(key => !savedKeys.includes(key));
  const missingInExpected = savedKeys.filter(key => !expectedKeys.includes(key));

  // 9. Формируем вероятные причины
  const probableCauses: string[] = [];

  if (duplicatedCanonicalKeys.length > 0) {
    probableCauses.push(`В профиле дублируются canonicalKey: ${duplicatedCanonicalKeys.join(', ')}`);
  }

  const normalizationNeeded = mappingMatrix.filter(m => m.presentNormalized && !m.presentExact).length;
  if (normalizationNeeded > 0) {
    probableCauses.push(`Несовпадение заголовков (нужна нормализация): ${normalizationNeeded} колонок`);
  }

  if (headersFromRows.length === 0) {
    probableCauses.push('Невалидные строки отчета');
  }

  if (canonicalExpectedPreview.firstRow && Object.keys(canonicalExpectedPreview.firstRow).length > 0 && 
      (!canonicalSavedPreview.firstRow || Object.keys(canonicalSavedPreview.firstRow).length === 0)) {
    probableCauses.push('Канон рассчитался, но не был записан в отчет (проверить место записи в POST /api/gps-reports)');
  }

  if (emptyCanonicalKey.length > 0) {
    probableCauses.push(`Колонки профиля без canonicalKey: ${emptyCanonicalKey.join(', ')}`);
  }

  if (emptyMappedColumn.length > 0) {
    probableCauses.push(`Колонки профиля без mappedColumn: ${emptyMappedColumn.join(', ')}`);
  }

  return {
    meta: {
      reportId,
      profileId: profile.id,
      gpsSystem: report.gpsSystem,
      rowsCount,
      hasCanonicalSaved: Boolean(canonicalSaved?.rows?.length)
    },
    headers: {
      fromRows: headersFromRows
    },
    mappingMatrix,
    profileChecks: {
      emptyCanonicalKey,
      emptyMappedColumn,
      duplicatedCanonicalKeys
    },
    canonicalSavedPreview,
    canonicalExpectedPreview,
    diffs: {
      missingInSaved,
      missingInExpected
    },
    probableCauses
  };
}
