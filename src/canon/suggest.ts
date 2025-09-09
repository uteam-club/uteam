import { CANON } from './metrics.registry';

/**
 * Нормализует заголовок столбца для поиска соответствий
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    // Убираем пробелы, дефисы, подчеркивания, слеши, табы
    .replace(/[\s\-_\/\\\t]+/g, '')
    // Заменяем кириллические символы на латинские
    .replace(/[а-яё]/g, (char) => {
      const map: { [key: string]: string } = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
      };
      return map[char] || char;
    })
    // Убираем диакритику
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Словарь быстрых соответствий (first match wins)
 */
const QUICK_MATCHES: Array<{ pattern: RegExp; key: string }> = [
  // Общая дистанция
  { pattern: /^(td|totaldistance|distancetotal|oaldisance)$/, key: 'total_distance_m' },
  
  // Время
  { pattern: /^(time|duration|minutesplayed|minplayed|vremya)$/, key: 'duration_s' },
  
  // Максимальная скорость
  { pattern: /^(maxspeed|maxspeedkmh|maxspeed)$/, key: 'max_speed_ms' },
  
  // HSR дистанция
  { pattern: /^(hsr|highspeedrunning)$/, key: 'hsr_distance_m' },
  
  // HSR процент/отношение
  { pattern: /^(hsr%|hsrpercent|hsrratio)$/, key: 'hsr_ratio' },
  
  // Ускорения
  { pattern: /^(acc|accelerations?)$/, key: 'acc_count' },
  
  // Торможения
  { pattern: /^(dec|decelerations?)$/, key: 'dec_count' },
  
  // Зоны
  { pattern: /^(z[-\s]?3|tempo)$/, key: 'distance_zone3_m' },
  { pattern: /^(z[-\s]?4|hir)$/, key: 'distance_zone4_m' },
  { pattern: /^(z[-\s]?5|sprint)$/, key: 'distance_zone5_m' },
  
  // Дополнительные метрики
  { pattern: /^(sprints?)$/, key: 'sprint_count' },
  { pattern: /^(m\/min|mmin)$/, key: 'avg_speed_ms' },
  { pattern: /^(avg|average)$/, key: 'avg_speed_ms' },
  { pattern: /^(min|minimum)$/, key: 'min_speed_ms' },
];

/**
 * Ищет ближайший ключ по вхождению в labels и key
 */
function findClosestMatch(normalizedHeader: string): string | null {
  if (!normalizedHeader || normalizedHeader.length < 2) {
    return null;
  }
  
  const allKeys = CANON.metrics.map(m => m.key);
  
  // Ищем точное вхождение в key (только если заголовок достаточно длинный)
  if (normalizedHeader.length >= 3) {
    const exactKeyMatch = allKeys.find(key => 
      key.toLowerCase().includes(normalizedHeader) || 
      normalizedHeader.includes(key.toLowerCase())
    );
    if (exactKeyMatch) return exactKeyMatch;
  }
  
  // Ищем вхождение в labels (только если заголовок достаточно длинный)
  if (normalizedHeader.length >= 3) {
    for (const metric of CANON.metrics) {
      const ruLabel = metric.labels?.ru?.toLowerCase() || '';
      const enLabel = metric.labels?.en?.toLowerCase() || '';
      
      if (ruLabel.includes(normalizedHeader) || normalizedHeader.includes(ruLabel)) {
        return metric.key;
      }
      if (enLabel.includes(normalizedHeader) || normalizedHeader.includes(enLabel)) {
        return metric.key;
      }
    }
  }
  
  return null;
}

/**
 * Предлагает каноническую метрику на основе заголовка столбца
 */
export function suggestCanonical(header: string): string | null {
  if (!header || typeof header !== 'string') {
    return null;
  }
  
  const normalized = normalizeHeader(header);
  
  // Сначала проверяем быстрые соответствия
  for (const { pattern, key } of QUICK_MATCHES) {
    if (pattern.test(normalized)) {
      return key;
    }
  }
  
  // Если не нашли, ищем ближайшее соответствие
  return findClosestMatch(normalized);
}
