// Утилиты для валидации и санитизации данных

// Валидация UUID
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Валидация email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Валидация строки (защита от XSS)
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Удаляем < и >
    .replace(/javascript:/gi, '') // Удаляем javascript:
    .replace(/on\w+=/gi, '') // Удаляем обработчики событий
    .trim()
    .substring(0, 1000); // Ограничиваем длину
}

// Валидация числовых значений
export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

// Валидация положительного числа
export function isValidPositiveNumber(value: any): boolean {
  return isValidNumber(value) && value > 0;
}

// Валидация ID (UUID или число)
export function isValidId(id: any): boolean {
  if (typeof id === 'string') {
    return isValidUUID(id);
  }
  if (typeof id === 'number') {
    return isValidPositiveNumber(id);
  }
  return false;
}

// Валидация массива строк
export function isValidStringArray(arr: any): boolean {
  return Array.isArray(arr) && arr.every(item => typeof item === 'string' && item.length > 0);
}

// Валидация объекта с обязательными полями
export function validateRequiredFields(obj: any, requiredFields: string[]): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  return requiredFields.every(field => 
    obj.hasOwnProperty(field) && 
    obj[field] !== null && 
    obj[field] !== undefined && 
    obj[field] !== ''
  );
}

// Валидация GPS данных
export function validateGpsData(data: any): boolean {
  if (!data || typeof data !== 'object') return false;
  
  const requiredFields = ['headers', 'rows'];
  if (!validateRequiredFields(data, requiredFields)) return false;
  
  if (!Array.isArray(data.headers) || !Array.isArray(data.rows)) return false;
  
  // Проверяем, что все заголовки - строки
  if (!data.headers.every((header: any) => typeof header === 'string')) return false;
  
  // Проверяем, что все строки - объекты
  if (!data.rows.every((row: any) => typeof row === 'object' && row !== null)) return false;
  
  return true;
}

// Валидация профиля визуализации
export function validateVisualizationProfile(profile: any): boolean {
  if (!profile || typeof profile !== 'object') return false;
  
  const requiredFields = ['name', 'columns'];
  if (!validateRequiredFields(profile, requiredFields)) return false;
  
  if (!Array.isArray(profile.columns) || profile.columns.length === 0) return false;
  
  // Проверяем каждую колонку
  return profile.columns.every((col: any) => 
    col && 
    typeof col === 'object' &&
    typeof col.canonicalMetricId === 'string' &&
    typeof col.displayName === 'string' &&
    typeof col.displayUnit === 'string' &&
    typeof col.displayOrder === 'number'
  );
}

// Валидация файла
export function validateFile(file: File, maxSizeMB: number = 10, allowedTypes: string[] = []): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'Файл не выбран' };
  }
  
  // Проверяем размер
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `Файл слишком большой. Максимум: ${maxSizeMB}MB` };
  }
  
  // Проверяем тип
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `Неподдерживаемый тип файла. Разрешены: ${allowedTypes.join(', ')}` };
  }
  
  return { valid: true };
}

// Санитизация объекта
export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[sanitizeString(key)] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

// Валидация параметров запроса
export function validateQueryParams(params: any, requiredParams: string[]): { valid: boolean; error?: string } {
  for (const param of requiredParams) {
    if (!params[param]) {
      return { valid: false, error: `Отсутствует обязательный параметр: ${param}` };
    }
  }
  return { valid: true };
}
