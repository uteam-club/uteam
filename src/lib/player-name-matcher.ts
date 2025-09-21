/**
 * Утилита для сопоставления имен игроков
 */

export interface PlayerMatch {
  playerId: string;
  playerName: string;
  similarity: number;
  matchLevel: 'high' | 'medium' | 'low' | 'none';
}

export interface PlayerMappingGroup {
  high: PlayerMatch[];
  medium: PlayerMatch[];
  low: PlayerMatch[];
  none: PlayerMatch[];
}

/**
 * Нормализует имя для сравнения
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Убираем знаки препинания
    .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
    .trim();
}

/**
 * Разбивает имя на части (слова)
 */
function splitName(name: string): string[] {
  return normalizeName(name).split(' ').filter(part => part.length > 0);
}

/**
 * Проверяет, содержат ли два имени общие слова
 */
function hasCommonWords(name1: string, name2: string): boolean {
  const words1 = splitName(name1);
  const words2 = splitName(name2);
  
  return words1.some(word1 => 
    words2.some(word2 => 
      word1 === word2 || 
      word1.includes(word2) || 
      word2.includes(word1)
    )
  );
}

/**
 * Вычисляет процент сходства между двумя строками
 * Улучшенный алгоритм с учетом порядка слов и частичных совпадений
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeName(str1);
  const s2 = normalizeName(str2);
  
  if (s1 === s2) return 100;
  
  // Проверяем точное совпадение после нормализации
  if (s1 === s2) return 100;
  
  // Проверяем, содержат ли имена общие слова
  if (!hasCommonWords(s1, s2)) return 0;
  
  const words1 = splitName(s1);
  const words2 = splitName(s2);
  
  // Считаем количество совпадающих слов
  let matchedWords = 0;
  const usedWords2 = new Set<number>();
  
  for (let i = 0; i < words1.length; i++) {
    for (let j = 0; j < words2.length; j++) {
      if (usedWords2.has(j)) continue;
      
      const word1 = words1[i];
      const word2 = words2[j];
      
      if (word1 === word2) {
        matchedWords++;
        usedWords2.add(j);
        break;
      } else if (word1.includes(word2) || word2.includes(word1)) {
        matchedWords += 0.8; // Частичное совпадение
        usedWords2.add(j);
        break;
      }
    }
  }
  
  // Учитываем порядок слов
  let orderBonus = 0;
  const minLength = Math.min(words1.length, words2.length);
  for (let i = 0; i < minLength; i++) {
    if (words1[i] === words2[i]) {
      orderBonus += 0.2;
    }
  }
  
  // Вычисляем процент сходства
  const wordSimilarity = (matchedWords / Math.max(words1.length, words2.length)) * 100;
  const finalSimilarity = Math.min(wordSimilarity + orderBonus, 100);
  
  return Math.round(finalSimilarity);
}

/**
 * Определяет уровень сходства на основе процента
 */
function getMatchLevel(similarity: number): 'high' | 'medium' | 'low' | 'none' {
  if (similarity >= 70) return 'high';    // 70%+ - высокое сходство
  if (similarity >= 50) return 'medium';  // 50-69% - среднее сходство
  if (similarity >= 30) return 'low';     // 30-49% - низкое сходство
  return 'none';                          // <30% - не найдены
}

/**
 * Сопоставляет имена игроков из файла с игроками в системе
 */
export function matchPlayers(
  filePlayerNames: string[],
  systemPlayers: Array<{ id: string; name: string; firstName: string; lastName: string }>
): Record<string, PlayerMappingGroup> {
  const result: Record<string, PlayerMappingGroup> = {};
  
  for (const filePlayerName of filePlayerNames) {
    const matches: PlayerMatch[] = [];
    
    // Сопоставляем с каждым игроком в системе
    for (const systemPlayer of systemPlayers) {
      const similarity = calculateSimilarity(filePlayerName, systemPlayer.name);
      const matchLevel = getMatchLevel(similarity);
      
      matches.push({
        playerId: systemPlayer.id,
        playerName: systemPlayer.name,
        similarity,
        matchLevel,
      });
    }
    
    // Сортируем по сходству (по убыванию)
    matches.sort((a, b) => b.similarity - a.similarity);
    
    // Группируем по уровням сходства
    const grouped: PlayerMappingGroup = {
      high: matches.filter(m => m.matchLevel === 'high'),
      medium: matches.filter(m => m.matchLevel === 'medium'),
      low: matches.filter(m => m.matchLevel === 'low'),
      none: matches.filter(m => m.matchLevel === 'none'),
    };
    
    result[filePlayerName] = grouped;
  }
  
  return result;
}

/**
 * Получает рекомендуемое сопоставление для игрока
 */
export function getRecommendedMatch(
  filePlayerName: string,
  matches: PlayerMappingGroup
): PlayerMatch | null {
  // Приоритет: высокое сходство > среднее > низкое
  if (matches.high.length > 0) {
    return matches.high[0];
  }
  if (matches.medium.length > 0) {
    return matches.medium[0];
  }
  if (matches.low.length > 0) {
    return matches.low[0];
  }
  return null;
}

/**
 * Проверяет, есть ли игроки без сопоставления
 */
export function hasUnmappedPlayers(mappings: Record<string, PlayerMappingGroup>): boolean {
  return Object.values(mappings).some(group => group.none.length > 0);
}

/**
 * Получает статистику сопоставления
 */
export function getMappingStats(mappings: Record<string, PlayerMappingGroup>) {
  let total = 0;
  let high = 0;
  let medium = 0;
  let low = 0;
  let none = 0;
  
  Object.values(mappings).forEach(group => {
    total++;
    if (group.high.length > 0) high++;
    else if (group.medium.length > 0) medium++;
    else if (group.low.length > 0) low++;
    else none++;
  });
  
  return { total, high, medium, low, none };
}
