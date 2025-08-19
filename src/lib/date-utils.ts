/**
 * Утилиты для работы с датами
 */

/**
 * Форматирует дату в читаемый формат
 * @param date - дата в виде строки или Date объекта
 * @param locale - локаль для форматирования (по умолчанию 'ru-RU')
 * @param options - опции форматирования
 * @returns отформатированная дата или исходная строка в случае ошибки
 */
export function formatDate(
  date: string | Date | null | undefined,
  locale: string = 'ru-RU',
  options: Intl.DateTimeFormatOptions = { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  }
): string {
  if (!date) return '';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      return typeof date === 'string' ? date : '';
    }
    
    return d.toLocaleDateString(locale, options);
  } catch {
    return typeof date === 'string' ? date : '';
  }
}

/**
 * Форматирует дату и время
 * @param date - дата в виде строки или Date объекта
 * @param locale - локаль для форматирования (по умолчанию 'ru-RU')
 * @returns отформатированная дата и время
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  locale: string = 'ru-RU'
): string {
  if (!date) return '';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      return typeof date === 'string' ? date : '';
    }
    
    return d.toLocaleString(locale, { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return typeof date === 'string' ? date : '';
  }
}

/**
 * Форматирует дату в коротком формате (только день и месяц)
 * @param date - дата в виде строки или Date объекта
 * @param locale - локаль для форматирования (по умолчанию 'ru-RU')
 * @returns отформатированная дата в коротком формате
 */
export function formatShortDate(
  date: string | Date | null | undefined,
  locale: string = 'ru-RU'
): string {
  if (!date) return '';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      return typeof date === 'string' ? date : '';
    }
    
    return d.toLocaleDateString(locale, { 
      day: '2-digit', 
      month: '2-digit'
    });
  } catch {
    return typeof date === 'string' ? date : '';
  }
}

/**
 * Проверяет, является ли строка валидной датой
 * @param dateString - строка для проверки
 * @returns true, если строка является валидной датой
 */
export function isValidDate(dateString: string): boolean {
  if (!dateString) return false;
  
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Получает относительное время (например, "2 дня назад")
 * @param date - дата для сравнения
 * @param locale - локаль для форматирования (по умолчанию 'ru-RU')
 * @returns относительное время
 */
export function getRelativeTime(
  date: string | Date | null | undefined,
  locale: string = 'ru-RU'
): string {
  if (!date) return '';
  
  try {
    const d = date instanceof Date ? date : new Date(date);
    
    if (isNaN(d.getTime())) {
      return typeof date === 'string' ? date : '';
    }
    
    const now = new Date();
    const diffInMs = now.getTime() - d.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return 'Сегодня';
    } else if (diffInDays === 1) {
      return 'Вчера';
    } else if (diffInDays > 1 && diffInDays < 7) {
      return `${diffInDays} дня назад`;
    } else if (diffInDays >= 7) {
      return formatDate(d, locale);
    } else {
      return formatDate(d, locale);
    }
  } catch {
    return typeof date === 'string' ? date : '';
  }
}
