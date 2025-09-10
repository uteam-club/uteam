// services/gps/validators/nameColumn.validator.ts

export interface PositionDetectionResult {
  posRatio: number;
  nameRatio: number;
  isPositionMapped: boolean;
  suggestedColumn?: string;
}

/**
 * Detects if position-like values are mapped as athlete names
 * @param values - array of values from the name column
 * @param locale - locale for position detection
 * @returns detection result with ratios and suggestions
 */
export function detectPositionLike(values: string[], locale: 'ru' | 'en' = 'ru'): PositionDetectionResult {
  const trimmed = values.map(v => (v ?? '').toString().trim());
  
  // Check if string looks like a short position code
  const shortCaps = (s: string) => /^[A-ZА-ЯЁ]{1,3}$/.test(s);
  
  // Common position codes
  const positions = new Set([
    // EN positions
    'GK', 'CB', 'RB', 'LB', 'WB', 'CM', 'DM', 'AM', 'RM', 'LM', 'RW', 'LW', 'ST', 'CF', 'SS', 'MF', 'W', 'S',
    // RU positions
    'ВР', 'ЦЗ', 'ПЗ', 'ЛЗ', 'ПФ', 'ЛФ', 'ЦП', 'ОП', 'АП', 'ПП', 'ЛП', 'Н', 'Ф',
    // Common empty/unknown values
    'NA', 'N/A', 'N\\A', '-', '—', 'n/a', 'n\\a'
  ]);

  let posLike = 0;
  let nameLike = 0;
  
  // Analyze first 50 values to avoid performance issues
  for (const s of trimmed.slice(0, 50)) {
    if (!s) continue;
    
    const upper = s.toUpperCase();
    
    // Check if it's a position code
    if (positions.has(upper) || shortCaps(upper)) {
      posLike++;
    }
    
    // Very rough "name-ish" check: starts with letter and is longer than 3 chars
    if (s.length > 3 && /^[A-Za-zА-ЯЁ]/.test(s) && !positions.has(upper)) {
      nameLike++;
    }
  }
  
  const total = Math.max(1, trimmed.length);
  const posRatio = posLike / total;
  const nameRatio = nameLike / total;
  
  return {
    posRatio,
    nameRatio,
    isPositionMapped: posRatio >= 0.6 && nameRatio < 0.3
  };
}

/**
 * Suggests alternative column for athlete names
 * @param headers - array of available headers
 * @returns suggested column name or undefined
 */
export function suggestAthleteNameColumn(headers: string[]): string | undefined {
  const namePatterns = [
    'player', 'name', 'surname', 'first', 'last', 'fullname', 'full_name',
    'игрок', 'фамилия', 'имя', 'полное_имя', 'фио', 'спортсмен'
  ];
  
  for (const header of headers) {
    const lowerHeader = header.toLowerCase().trim();
    if (namePatterns.some(pattern => lowerHeader.includes(pattern))) {
      return header;
    }
  }
  
  return undefined;
}

/**
 * Validates athlete name column mapping
 * @param values - values from the name column
 * @param headers - all available headers
 * @param sourceHeader - current source header for athlete_name
 * @returns validation result with warnings and suggestions
 */
export function validateAthleteNameColumn(
  values: string[],
  headers: string[],
  sourceHeader: string
): {
  warnings: Array<{ code: string; column: string; message: string }>;
  suggestions: { athleteNameHeader?: string };
} {
  const warnings: Array<{ code: string; column: string; message: string }> = [];
  const suggestions: { athleteNameHeader?: string } = {};
  
  const detection = detectPositionLike(values);
  
  if (detection.isPositionMapped) {
    warnings.push({
      code: 'POSITION_MAPPED_AS_NAME',
      column: sourceHeader,
      message: `Column "${sourceHeader}" contains position codes instead of player names (${Math.round(detection.posRatio * 100)}% positions, ${Math.round(detection.nameRatio * 100)}% names)`
    });
    
    // Suggest alternative column
    const suggested = suggestAthleteNameColumn(headers);
    if (suggested && suggested !== sourceHeader) {
      suggestions.athleteNameHeader = suggested;
    }
  }
  
  return { warnings, suggestions };
}
