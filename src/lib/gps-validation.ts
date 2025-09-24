export interface ValidationError {
  type: 'missing_column' | 'invalid_data' | 'empty_file' | 'no_players';
  message: string;
  row?: number;
  column?: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class GpsDataValidator {
  /**
   * Валидирует GPS данные после парсинга файла
   */
  static validate(parsedData: {
    headers: string[];
    rows: Array<Record<string, any>>;
    playerNames: string[];
  }): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // 1. Проверка на пустой файл
    if (parsedData.rows.length === 0) {
      errors.push({
        type: 'empty_file',
        message: 'Файл пуст или не содержит данных'
      });
      return { isValid: false, errors, warnings };
    }

    // 2. Проверка наличия колонки с именами игроков
    const playerColumn = this.findPlayerColumn(parsedData.headers);
    if (!playerColumn) {
      errors.push({
        type: 'missing_column',
        message: 'Отсутствует колонка с именами игроков. Ожидаются колонки: Player, Игрок, Name, Имя'
      });
    }

    // 3. Проверка наличия игроков
    if (parsedData.playerNames.length === 0) {
      errors.push({
        type: 'no_players',
        message: 'Не найдены имена игроков в файле'
      });
    }

    // 4. Проверка данных в каждой строке
    parsedData.rows.forEach((row, rowIndex) => {
      // Пропускаем служебные строки (средние значения, суммы, итоги) на этапе валидации
      if (this.isServiceRow(row)) {
        return;
      }

      Object.entries(row).forEach(([columnName, value]) => {
        // Пропускаем колонку с именами игроков
        if (this.isPlayerColumn(columnName)) {
          return;
        }

        // Проверяем, что значение не пустое
        if (value === null || value === undefined || value === '') {
          warnings.push({
            type: 'invalid_data',
            message: `Пустое значение в строке ${rowIndex + 1}, колонка "${columnName}"`,
            row: rowIndex + 1,
            column: columnName,
            value
          });
          return;
        }

        // Проверяем тип данных в зависимости от колонки
        if (!this.isValidValueForColumn(columnName, value)) {
          errors.push({
            type: 'invalid_data',
            message: `Некорректное значение в строке ${rowIndex + 1}, колонка "${columnName}": "${value}". ${this.getExpectedValueMessage(columnName)}`,
            row: rowIndex + 1,
            column: columnName,
            value
          });
        }

        // Проверяем диапазоны значений для числовых данных
        const rangeValidation = this.validateValueRange(columnName, value);
        if (!rangeValidation.isValid) {
          warnings.push({
            type: 'invalid_data',
            message: `Подозрительное значение в строке ${rowIndex + 1}, колонка "${columnName}": "${value}". ${rangeValidation.message}`,
            row: rowIndex + 1,
            column: columnName,
            value
          });
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Находит колонку с именами игроков
   */
  private static findPlayerColumn(headers: string[]): string | null {
    const possibleNameColumns = [
      'Player', 'player', 'Игрок', 'игрок', 'Name', 'name', 'Имя', 'имя',
      'Player Name', 'player_name', 'Имя игрока', 'имя_игрока'
    ];

    for (const header of headers) {
      if (possibleNameColumns.some(col => 
        header.toLowerCase().includes(col.toLowerCase())
      )) {
        return header;
      }
    }

    return null;
  }

  /**
   * Проверяет, является ли колонка колонкой с именами игроков
   */
  private static isPlayerColumn(columnName: string): boolean {
    const possibleNameColumns = [
      'Player', 'player', 'Игрок', 'игрок', 'Name', 'name', 'Имя', 'имя',
      'Player Name', 'player_name', 'Имя игрока', 'имя_игрока'
    ];

    return possibleNameColumns.some(col => 
      columnName.toLowerCase().includes(col.toLowerCase())
    );
  }

  /**
   * Проверяет, является ли строка служебной (средние значения, суммы, итоги)
   */
  private static isServiceRow(row: Record<string, any>): boolean {
    // Ищем колонку с именами игроков
    const playerColumn = Object.keys(row).find(key => this.isPlayerColumn(key));
    
    if (!playerColumn) {
      return false;
    }

    const playerValue = row[playerColumn];
    
    if (typeof playerValue !== 'string') {
      return false;
    }

    const playerName = playerValue.trim().toLowerCase();
    
    // Список служебных значений
    const serviceValues = [
      // Русские
      'среднее', 'среднее значение', 'среднее знач', 'средн', 'сред',
      'сумма', 'сум', 'сумм', 'суммарное', 'суммарное значение',
      'итого', 'итог', 'итоговое', 'итоговое значение',
      'всего', 'всего игроков', 'общее', 'общее значение',
      'среднеарифметическое', 'среднеарифм', 'среднеариф',
      'агрегат', 'агрегация', 'агрегированное',
      'статистика', 'стат', 'статистические данные',
      'результат', 'результаты', 'результ',
      'n/a', 'na', 'не применимо', 'не применим',
      '-', '—', '–', 'нет данных',
      'пусто', 'пустая строка', 'пустая',
      'заголовок', 'header', 'заголовки',
      'подвал', 'footer', 'подвал таблицы',
      
      // Английские
      'average', 'avg', 'mean', 'среднее',
      'sum', 'total', 'tot', 'сумма',
      'total', 'итого', 'всего',
      'aggregate', 'agg', 'агрегат',
      'statistics', 'stats', 'статистика',
      'result', 'results', 'результат',
      'summary', 'summ', 'краткое',
      'overview', 'обзор', 'сводка',
      'header', 'заголовок',
      'footer', 'подвал',
      'n/a', 'na', 'not applicable',
      'empty', 'пусто',
      'blank', 'пустая строка',
      
      // Другие языки
      'moyenne', 'среднее', // французский
      'promedio', 'среднее', // испанский
      'durchschnitt', 'среднее', // немецкий
      'media', 'среднее', // итальянский
      'gemiddelde', 'среднее', // голландский
    ];

    // Проверяем, является ли строка служебной по названию
    const isServiceByName = serviceValues.some(serviceValue => 
      playerName.includes(serviceValue.toLowerCase())
    );
    
    // Проверяем, является ли строка служебной по содержимому (все значения пустые)
    const hasOnlyEmptyValues = Object.values(row).every(value => 
      value === null || value === undefined || value === '' || value === '-'
    );
    
    return isServiceByName || hasOnlyEmptyValues;
  }

  /**
   * Проверяет, является ли колонка колонкой с позициями
   */
  private static isPositionColumn(columnName: string): boolean {
    const positionKeywords = [
      'позиция', 'position', 'pos', 'поз', 'роль', 'role',
      'амплуа', 'амп', 'amp', 'позиц', 'position'
    ];

    return positionKeywords.some(keyword => 
      columnName.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Проверяет, является ли колонка колонкой с временем
   */
  private static isTimeColumn(columnName: string): boolean {
    const timeKeywords = [
      'время', 'time', 'врем', 'time_', 'duration', 'длительность',
      'индивидуальное время', 'individual time', 'игровое время', 'playing time',
      'время игры', 'game time', 'время_игры', 'game_time'
    ];

    return timeKeywords.some(keyword => 
      columnName.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  /**
   * Проверяет, является ли значение валидной позицией
   */
  private static isValidPosition(value: any): boolean {
    if (typeof value === 'number') {
      return !isNaN(value) && value >= 1 && value <= 11;
    }

    if (typeof value === 'string') {
      const str = value.trim().toUpperCase();
      
      // Числовые позиции (1-11)
      const numericPos = parseInt(str);
      if (!isNaN(numericPos) && numericPos >= 1 && numericPos <= 11) {
        return true;
      }

      // Текстовые позиции
      const validPositions = [
        'GK', 'ВР', 'ВРАТАРЬ', 'GOALKEEPER',
        'CB', 'ЦЗ', 'ЦЕНТРАЛЬНЫЙ ЗАЩИТНИК', 'CENTER BACK',
        'LB', 'ЛЗ', 'ЛЕВЫЙ ЗАЩИТНИК', 'LEFT BACK',
        'RB', 'ПЗ', 'ПРАВЫЙ ЗАЩИТНИК', 'RIGHT BACK',
        'CDM', 'ЦОП', 'ЦЕНТРАЛЬНЫЙ ОПОРНЫЙ ПОЛУЗАЩИТНИК', 'DEFENSIVE MIDFIELDER',
        'CM', 'ЦП', 'ЦЕНТРАЛЬНЫЙ ПОЛУЗАЩИТНИК', 'CENTRAL MIDFIELDER',
        'CAM', 'ЦАП', 'ЦЕНТРАЛЬНЫЙ АТАКУЮЩИЙ ПОЛУЗАЩИТНИК', 'ATTACKING MIDFIELDER',
        'LM', 'ЛП', 'ЛЕВЫЙ ПОЛУЗАЩИТНИК', 'LEFT MIDFIELDER',
        'RM', 'ПП', 'ПРАВЫЙ ПОЛУЗАЩИТНИК', 'RIGHT MIDFIELDER',
        'LW', 'ЛВ', 'ЛЕВЫЙ ВИНГЕР', 'LEFT WINGER',
        'RW', 'ПВ', 'ПРАВЫЙ ВИНГЕР', 'RIGHT WINGER',
        'ST', 'ЦН', 'ЦЕНТРАЛЬНЫЙ НАПАДАЮЩИЙ', 'STRIKER',
        'CF', 'ЦФ', 'ЦЕНТРАЛЬНЫЙ ФОРВАРД', 'CENTER FORWARD',
        'WF', 'ВФ', 'ВИНГЕР-ФОРВАРД', 'WING FORWARD',
        'FB', 'ЗАЩ', 'ЗАЩИТНИК', 'FULLBACK',
        'MF', 'ПЗ', 'ПОЛУЗАЩИТНИК', 'MIDFIELDER',
        'W', 'ВИНГЕР', 'WINGER',
        'S', 'НАПАДАЮЩИЙ', 'STRIKER'
      ];

      return validPositions.includes(str);
    }

    return false;
  }

  /**
   * Проверяет, является ли значение валидным временем
   */
  private static isValidTime(value: any): boolean {
    if (typeof value === 'number') {
      return !isNaN(value) && value >= 0;
    }

    if (typeof value === 'string') {
      const str = value.trim();
      
      // Проверяем числовое значение (секунды)
      const numericValue = parseFloat(str);
      if (!isNaN(numericValue) && numericValue >= 0) {
        return true;
      }

      // Проверяем формат времени (HH:MM:SS или MM:SS)
      const timeRegex = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
      if (timeRegex.test(str)) {
        const parts = str.split(':');
        const hours = parseInt(parts[0]);
        const minutes = parseInt(parts[1]);
        const seconds = parts[2] ? parseInt(parts[2]) : 0;
        
        return minutes < 60 && seconds < 60;
      }
    }

    return false;
  }

  /**
   * Проверяет, является ли значение валидным для данной колонки
   */
  private static isValidValueForColumn(columnName: string, value: any): boolean {
    // Позиции могут быть как текстом, так и числом
    if (this.isPositionColumn(columnName)) {
      return this.isValidPosition(value);
    }

    // Время может быть как в формате времени, так и числом
    if (this.isTimeColumn(columnName)) {
      return this.isValidTime(value);
    }

    // Для остальных колонок проверяем, что это число
    const numericValue = Number(value);
    return !isNaN(numericValue);
  }

  /**
   * Возвращает сообщение о том, какое значение ожидается для колонки
   */
  private static getExpectedValueMessage(columnName: string): string {
    if (this.isPositionColumn(columnName)) {
      return 'Ожидается позиция (число 1-11 или текст: GK, CB, LB, RB, CDM, CM, CAM, LM, RM, LW, RW, ST, CF, FB, MF, W, S и др.)';
    }

    if (this.isTimeColumn(columnName)) {
      return 'Ожидается время (число в секундах или формат времени: HH:MM:SS, MM:SS)';
    }

    return 'Ожидается число';
  }

  /**
   * Форматирует ошибки валидации для отображения пользователю
   */
  static formatErrors(errors: ValidationError[]): string {
    if (errors.length === 0) {
      return '';
    }

    const errorMessages = errors.map(error => {
      if (error.row && error.column) {
        return `• Строка ${error.row}, колонка "${error.column}": ${error.message}`;
      } else if (error.row) {
        return `• Строка ${error.row}: ${error.message}`;
      } else {
        return `• ${error.message}`;
      }
    });

    return errorMessages.join('\n');
  }

  /**
   * Форматирует предупреждения валидации для отображения пользователю
   */
  static formatWarnings(warnings: ValidationError[]): string {
    if (warnings.length === 0) {
      return '';
    }

    const warningMessages = warnings.map(warning => {
      if (warning.row && warning.column) {
        return `• Строка ${warning.row}, колонка "${warning.column}": ${warning.message}`;
      } else if (warning.row) {
        return `• Строка ${warning.row}: ${warning.message}`;
      } else {
        return `• ${warning.message}`;
      }
    });

    return warningMessages.join('\n');
  }

  /**
   * Валидирует диапазон значений для конкретной колонки
   */
  private static validateValueRange(columnName: string, value: any): { isValid: boolean; message: string } {
    const numValue = parseFloat(String(value));
    
    // Если значение не числовое, пропускаем проверку
    if (isNaN(numValue)) {
      return { isValid: true, message: '' };
    }

    const columnLower = columnName.toLowerCase();
    
    // Дистанция (метры)
    if (columnLower.includes('distance') || columnLower.includes('дистанция')) {
      if (numValue < 0) {
        return { isValid: false, message: 'Дистанция не может быть отрицательной' };
      }
      if (numValue > 50000) { // 50 км
        return { isValid: false, message: 'Дистанция слишком большая (>50км)' };
      }
    }
    
    // Скорость (м/с)
    if (columnLower.includes('speed') || columnLower.includes('скорость')) {
      if (numValue < 0) {
        return { isValid: false, message: 'Скорость не может быть отрицательной' };
      }
      if (numValue > 15) { // 15 м/с = 54 км/ч
        return { isValid: false, message: 'Скорость слишком высокая (>15 м/с)' };
      }
    }
    
    // Пульс (bpm)
    if (columnLower.includes('heart') || columnLower.includes('hr') || columnLower.includes('пульс')) {
      if (numValue < 30) {
        return { isValid: false, message: 'Пульс слишком низкий (<30 bpm)' };
      }
      if (numValue > 220) {
        return { isValid: false, message: 'Пульс слишком высокий (>220 bpm)' };
      }
    }
    
    // Время (секунды)
    if (columnLower.includes('time') || columnLower.includes('duration') || columnLower.includes('время')) {
      if (numValue < 0) {
        return { isValid: false, message: 'Время не может быть отрицательным' };
      }
      if (numValue > 14400) { // 4 часа
        return { isValid: false, message: 'Время слишком большое (>4 часов)' };
      }
    }
    
    // Ускорение (м/с²)
    if (columnLower.includes('acceleration') || columnLower.includes('acc') || columnLower.includes('ускорение')) {
      if (Math.abs(numValue) > 15) { // ±15 м/с²
        return { isValid: false, message: 'Ускорение слишком большое (>15 м/с²)' };
      }
    }
    
    // Нагрузка (AU)
    if (columnLower.includes('load') || columnLower.includes('нагрузка')) {
      if (numValue < 0) {
        return { isValid: false, message: 'Нагрузка не может быть отрицательной' };
      }
      if (numValue > 1000) {
        return { isValid: false, message: 'Нагрузка слишком большая (>1000 AU)' };
      }
    }
    
    // Количество (count)
    if (columnLower.includes('count') || columnLower.includes('entries') || columnLower.includes('количество')) {
      if (numValue < 0) {
        return { isValid: false, message: 'Количество не может быть отрицательным' };
      }
      if (numValue > 10000) {
        return { isValid: false, message: 'Количество слишком большое (>10000)' };
      }
    }
    
    // Проценты
    if (columnLower.includes('%') || columnLower.includes('percent') || columnLower.includes('процент')) {
      if (numValue < 0) {
        return { isValid: false, message: 'Процент не может быть отрицательным' };
      }
      if (numValue > 100) {
        return { isValid: false, message: 'Процент не может быть больше 100%' };
      }
    }

    return { isValid: true, message: '' };
  }
}
