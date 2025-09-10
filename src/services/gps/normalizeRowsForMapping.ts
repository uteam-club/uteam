// src/services/gps/normalizeRowsForMapping.ts
import { ProfileSnapshot } from '@/types/gps';

type NormalizeInput = {
  rows: any[];                 // объекты или массивы
  headers: string[] | null;    // заголовки или null
  snapshot: ProfileSnapshot;   // уже построенный снапшот
};

export type NormalizeResult = {
  objectRows: Array<Record<string, any>>;
  warnings: string[];
  strategy: 'byHeaders' | 'bySourceIndex' | 'heuristics';
};

export function normalizeRowsForMapping({ rows, headers, snapshot }: NormalizeInput): NormalizeResult {
  const warnings: string[] = [];

  // 1) Уже объекты — используем как есть.
  if (rows.length && !Array.isArray(rows[0])) {
    return { objectRows: rows as Array<Record<string, any>>, warnings, strategy: 'byHeaders' };
  }

  const arrayRows = rows as any[][];

  // 2) Есть заголовки — собираем словари по заголовкам.
  if (Array.isArray(headers) && headers.length > 0) {
    const trimmed = headers.map(h => String(h ?? '').trim());
    const objs = arrayRows.map(r => Object.fromEntries(trimmed.map((h, i) => [h, r[i]])));
    return { objectRows: objs, warnings, strategy: 'byHeaders' };
  }

  // 3) Нет заголовков — пробуем sourceIndex (если он в снапшоте есть).
  const canUseIndex = snapshot.columns.every((c: any) => typeof c.sourceIndex === 'number');
  if (canUseIndex) {
    const objs = arrayRows.map(r => {
      const o: Record<string, any> = {};
      for (const col of snapshot.columns) {
        const idx = (col as any).sourceIndex as number;
        o[col.sourceHeader] = r?.[idx];
      }
      return o;
    });
    warnings.push('NORMALIZE_USING_SOURCE_INDEX');
    return { objectRows: objs, warnings, strategy: 'bySourceIndex' };
  }

  // 4) Эвристики (хеды и индексы не доступны): аккуратно угадываем индексы.
  const sample = arrayRows.find(r => Array.isArray(r) && r.some(Boolean)) ?? [];
  const guessIndex = (predicate: (v: any) => boolean) =>
    Math.max(0, sample.findIndex(predicate));

  const indexByKey = new Map<string, number>();
  for (const col of snapshot.columns) {
    switch (col.canonicalKey) {
      case 'athlete_name':
        indexByKey.set(col.sourceHeader, guessIndex(v => typeof v === 'string' && /\p{L}/u.test(v) && v.trim().split(/\s+/).length >= 2));
        break;
      case 'minutes_played':
        indexByKey.set(col.sourceHeader, guessIndex(v => typeof v === 'string' && /^\d{1,2}:\d{2}:\d{2}$/.test(v)));
        break;
      case 'total_distance_m':
        indexByKey.set(col.sourceHeader, guessIndex(v => Number(v) > 200 && Number(v) < 30000));
        break;
      case 'max_speed_ms':
      case 'max_speed_kmh':
        indexByKey.set(col.sourceHeader, guessIndex(v => Number(v) > 2 && Number(v) < 50)); // до 50 км/ч
        break;
      case 'hsr_ratio':
        indexByKey.set(col.sourceHeader, guessIndex(v => Number(v) >= 0 && Number(v) <= 100));
        break;
      default:
        break;
    }
  }

  const objs = arrayRows.map(r => {
    const o: Record<string, any> = {};
    for (const col of snapshot.columns) {
      const idx = indexByKey.get(col.sourceHeader);
      if (typeof idx === 'number') o[col.sourceHeader] = r?.[idx];
    }
    return o;
  });

  warnings.push('NORMALIZE_USING_HEURISTICS');
  return { objectRows: objs, warnings, strategy: 'heuristics' };
}
