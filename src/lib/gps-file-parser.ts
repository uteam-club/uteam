import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { GpsDataValidator, ValidationResult } from './gps-validation';
import { GpsErrorHandler, GpsFileError } from './gps-errors';

export interface ParsedGpsData {
  headers: string[];
  rows: Array<Record<string, any>>;
  playerNames: string[];
  metadata: {
    fileName: string;
    fileSize: number;
    rowCount: number;
    columnCount: number;
  };
  validation?: ValidationResult;
}

export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'unknown';
  sampleValues: any[];
  hasNumericData: boolean;
}

export class GpsFileParser {
  static async parseFile(file: File): Promise<ParsedGpsData> {
    // Валидируем файл перед парсингом
    GpsErrorHandler.validateFileNotEmpty(file);
    GpsErrorHandler.validateFileSize(file, 10); // 10MB максимум
    GpsErrorHandler.validateFileType(file);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    return GpsErrorHandler.withErrorHandling(async () => {
      switch (fileExtension) {
        case 'xlsx':
        case 'xls':
          return this.parseExcelFile(file);
        case 'csv':
          return this.parseCsvFile(file);
        case 'json':
          return this.parseJsonFile(file);
        case 'xml':
          return this.parseXmlFile(file);
        default:
          throw new GpsFileError(
            `Неподдерживаемый формат файла: ${fileExtension}. Поддерживаются: Excel (.xlsx, .xls), CSV (.csv), JSON (.json) и XML (.xml)`,
            'file_format'
          );
      }
    }, file.name);
  }

  private static async parseExcelFile(file: File): Promise<ParsedGpsData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Берем первый лист
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Конвертируем в JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            throw new GpsFileError('Файл пуст или не содержит данных', 'file_empty');
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1).map((row: unknown) => {
            const rowData: Record<string, any> = {};
            const rowArray = row as any[];
            headers.forEach((header, index) => {
              rowData[header] = rowArray[index];
            });
            return rowData;
          });

          const playerNames = this.extractPlayerNames(rows);
          
          // Валидируем данные
          const validation = GpsDataValidator.validate({
            headers,
            rows,
            playerNames
          });
          
          resolve({
            headers,
            rows,
            playerNames,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              rowCount: rows.length,
              columnCount: headers.length,
            },
            validation,
          });
        } catch (error) {
          reject(new GpsFileError(
            'Ошибка при чтении Excel файла. Проверьте, что файл не поврежден.',
            'file_corrupted'
          ));
        }
      };
      
      reader.onerror = () => reject(new GpsFileError('Ошибка при чтении файла', 'parsing_error'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static async parseCsvFile(file: File): Promise<ParsedGpsData> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              throw new GpsFileError(
                'Ошибка при чтении CSV файла. Проверьте формат и разделители.',
                'file_corrupted'
              );
            }

            const rows = results.data as Record<string, any>[];
            const headers = Object.keys(rows[0] || {});
            const playerNames = this.extractPlayerNames(rows);

            // Валидируем данные
            const validation = GpsDataValidator.validate({
              headers,
              rows,
              playerNames
            });

            resolve({
              headers,
              rows,
              playerNames,
              metadata: {
                fileName: file.name,
                fileSize: file.size,
                rowCount: rows.length,
                columnCount: headers.length,
              },
              validation,
            });
          } catch (error) {
            reject(new GpsFileError(
              'Ошибка при обработке CSV файла. Проверьте формат данных.',
              'file_corrupted'
            ));
          }
        },
        error: (error) => {
          reject(new GpsFileError(
            'Ошибка при чтении CSV файла. Проверьте формат и кодировку.',
            'file_corrupted'
          ));
        },
      });
    });
  }

  private static async parseJsonFile(file: File): Promise<ParsedGpsData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const jsonData = JSON.parse(text);
          
          // Ожидаем массив объектов или объект с массивом данных
          let rows: Record<string, any>[];
          if (Array.isArray(jsonData)) {
            rows = jsonData;
          } else if (jsonData.data && Array.isArray(jsonData.data)) {
            rows = jsonData.data;
          } else if (jsonData.players && Array.isArray(jsonData.players)) {
            rows = jsonData.players;
          } else {
            throw new GpsFileError('JSON файл должен содержать массив данных или объект с массивом данных', 'file_corrupted');
          }

          if (rows.length === 0) {
            throw new GpsFileError('JSON файл пуст или не содержит данных', 'file_empty');
          }

          const headers = Object.keys(rows[0] || {});
          const playerNames = this.extractPlayerNames(rows);

          // Валидируем данные
          const validation = GpsDataValidator.validate({
            headers,
            rows,
            playerNames
          });

          resolve({
            headers,
            rows,
            playerNames,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              rowCount: rows.length,
              columnCount: headers.length,
            },
            validation,
          });
        } catch (error) {
          reject(new GpsFileError(
            'Ошибка при чтении JSON файла. Проверьте формат данных.',
            'file_corrupted'
          ));
        }
      };
      
      reader.onerror = () => reject(new GpsFileError('Ошибка при чтении файла', 'parsing_error'));
      reader.readAsText(file);
    });
  }

  private static async parseXmlFile(file: File): Promise<ParsedGpsData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(text, 'text/xml');
          
          // Проверяем на ошибки парсинга XML
          const parseError = xmlDoc.getElementsByTagName('parsererror')[0];
          if (parseError) {
            throw new GpsFileError('XML файл поврежден или имеет неправильный формат', 'file_corrupted');
          }

          // Ищем элементы с данными игроков
          const playerElements = xmlDoc.getElementsByTagName('player') || 
                                xmlDoc.getElementsByTagName('Player') ||
                                xmlDoc.getElementsByTagName('athlete') ||
                                xmlDoc.getElementsByTagName('Athlete');

          if (playerElements.length === 0) {
            throw new GpsFileError('XML файл не содержит данных игроков', 'file_empty');
          }

          const rows: Record<string, any>[] = [];
          const headers = new Set<string>();

          // Извлекаем данные из XML
          for (let i = 0; i < playerElements.length; i++) {
            const playerElement = playerElements[i];
            const rowData: Record<string, any> = {};
            
            // Обрабатываем атрибуты
            for (let j = 0; j < playerElement.attributes.length; j++) {
              const attr = playerElement.attributes[j];
              rowData[attr.name] = attr.value;
              headers.add(attr.name);
            }
            
            // Обрабатываем дочерние элементы
            for (let j = 0; j < playerElement.children.length; j++) {
              const child = playerElement.children[j];
              rowData[child.tagName] = child.textContent || '';
              headers.add(child.tagName);
            }
            
            rows.push(rowData);
          }

          const headersArray = Array.from(headers);
          const playerNames = this.extractPlayerNames(rows);

          // Валидируем данные
          const validation = GpsDataValidator.validate({
            headers: headersArray,
            rows,
            playerNames
          });

          resolve({
            headers: headersArray,
            rows,
            playerNames,
            metadata: {
              fileName: file.name,
              fileSize: file.size,
              rowCount: rows.length,
              columnCount: headersArray.length,
            },
            validation,
          });
        } catch (error) {
          reject(new GpsFileError(
            'Ошибка при чтении XML файла. Проверьте формат данных.',
            'file_corrupted'
          ));
        }
      };
      
      reader.onerror = () => reject(new GpsFileError('Ошибка при чтении файла', 'parsing_error'));
      reader.readAsText(file);
    });
  }

  private static extractPlayerNames(rows: Record<string, any>[]): string[] {
    const playerNames = new Set<string>();
    
    // Ищем колонки, которые могут содержать имена игроков
    const possibleNameColumns = [
      'Player', 'player', 'Игрок', 'игрок', 'Name', 'name', 'Имя', 'имя',
      'Player Name', 'player_name', 'Имя игрока', 'имя_игрока'
    ];

    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if (possibleNameColumns.some(col => key.toLowerCase().includes(col.toLowerCase()))) {
          if (typeof value === 'string' && value.trim()) {
            playerNames.add(value.trim());
          }
        }
      }
    }

    return Array.from(playerNames);
  }

  /**
   * Проверяет, является ли строка служебной (средние значения, суммы, итоги)
   */
  private static isServiceRow(row: Record<string, any>): boolean {
    // Ищем колонку с именами игроков
    const possibleNameColumns = [
      'Player', 'player', 'Игрок', 'игрок', 'Name', 'name', 'Имя', 'имя',
      'Player Name', 'player_name', 'Имя игрока', 'имя_игрока'
    ];

    const playerColumn = Object.keys(row).find(key => 
      possibleNameColumns.some(col => key.toLowerCase().includes(col.toLowerCase()))
    );
    
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
      'n/a', 'na', 'n/a', 'не применимо', 'не применим',
      '-', '—', '–', 'нет данных', 'нет данных',
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

    return serviceValues.some(serviceValue => 
      playerName.includes(serviceValue.toLowerCase())
    );
  }

  static analyzeColumns(headers: string[], rows: Record<string, any>[]): ColumnInfo[] {
    return headers.map(header => {
      const columnData = rows.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
      const sampleValues = columnData.slice(0, 5);
      
      // Определяем тип данных
      let type: 'string' | 'number' | 'date' | 'unknown' = 'unknown';
      let hasNumericData = false;

      if (columnData.length > 0) {
        const numericCount = columnData.filter(val => !isNaN(Number(val)) && val !== '').length;
        hasNumericData = numericCount > columnData.length * 0.5; // Если больше 50% числовых значений
        
        if (hasNumericData) {
          type = 'number';
        } else if (columnData.some(val => !isNaN(Date.parse(val)))) {
          type = 'date';
        } else {
          type = 'string';
        }
      }

      return {
        name: header,
        type,
        sampleValues,
        hasNumericData,
      };
    });
  }

  static suggestColumnMappings(columns: ColumnInfo[]): Array<{
    columnName: string;
    suggestedMetric: string;
    suggestedUnit: string;
    confidence: number;
  }> {
    const suggestions: Array<{
      columnName: string;
      suggestedMetric: string;
      suggestedUnit: string;
      confidence: number;
    }> = [];

    const metricPatterns = {
      total_distance: [
        /total.*distance/i,
        /общая.*дистанция/i,
        /distance.*total/i,
        /дистанция.*общая/i,
        /total.*dist/i,
      ],
      max_speed: [
        /max.*speed/i,
        /максимальная.*скорость/i,
        /peak.*speed/i,
        /макс.*скорость/i,
        /max.*vel/i,
      ],
      avg_speed: [
        /avg.*speed/i,
        /средняя.*скорость/i,
        /average.*speed/i,
        /сред.*скорость/i,
        /mean.*speed/i,
      ],
      avg_heart_rate: [
        /avg.*heart.*rate/i,
        /средний.*пульс/i,
        /average.*hr/i,
        /сред.*пульс/i,
        /mean.*hr/i,
        /avg.*hr/i,
      ],
      max_heart_rate: [
        /max.*heart.*rate/i,
        /максимальный.*пульс/i,
        /peak.*hr/i,
        /макс.*пульс/i,
        /max.*hr/i,
      ],
      duration: [
        /time.*on.*field/i,
        /время.*на.*поле/i,
        /playing.*time/i,
        /игровое.*время/i,
        /duration/i,
        /время/i,
        /индивидуальное.*время/i,
      ],
      sprint_count: [
        /sprint/i,
        /спринт/i,
        /sprint.*count/i,
        /количество.*спринтов/i,
      ],
      hsr_distance: [
        /high.*intensity/i,
        /высокоинтенсивн/i,
        /hie/i,
        /hight.*int/i,
        /виб/i,
        /hsr/i,
      ],
      // Добавляем зоны скорости
      distance_zone3: [
        /зона.*3/i,
        /zone.*3/i,
        /дист.*з.*3/i,
        /dist.*zone.*3/i,
      ],
      distance_zone4: [
        /зона.*4/i,
        /zone.*4/i,
        /дист.*з.*4/i,
        /dist.*zone.*4/i,
      ],
      distance_zone5: [
        /зона.*5/i,
        /zone.*5/i,
        /дист.*з.*5/i,
        /dist.*zone.*5/i,
      ],
      speed_zone5_entries: [
        /входы.*скор.*з.*5/i,
        /entries.*speed.*zone.*5/i,
        /входы.*в.*зону.*скорости.*5/i,
      ],
      acc_zone4_count: [
        /ускорения.*з.*4/i,
        /acceleration.*zone.*4/i,
        /ускорения.*по.*з.*4/i,
      ],
      dec_zone4_count: [
        /торможения.*з.*4/i,
        /deceleration.*zone.*4/i,
        /кол.*во.*торможений.*з.*4/i,
      ],
      hsr_percentage: [
        /виб.*%/i,
        /hsr.*%/i,
        /высокоинтенсивн.*%/i,
      ],
      distance_per_min: [
        /дистанция.*в.*минуту/i,
        /distance.*per.*minute/i,
        /дист.*мин/i,
      ],
      athlete_name: [
        /игрок/i,
        /player/i,
        /name/i,
        /имя/i,
      ],
      position: [
        /позиция/i,
        /position/i,
      ],
    };

    const unitPatterns = {
      m: [/метр/i, /meter/i, /m\b/i, /м\b/i],
      km: [/километр/i, /kilometer/i, /km/i],
      'km/h': [/км\/ч/i, /km\/h/i, /км.*ч/i],
      'm/s': [/м\/с/i, /m\/s/i, /м.*с/i],
      bpm: [/уд\/мин/i, /bpm/i, /beats.*per.*minute/i],
      min: [/мин/i, /min/i, /минут/i, /minute/i],
      s: [/сек/i, /sec/i, /секунд/i, /second/i],
      count: [/количество/i, /count/i, /число/i, /number/i, /шт/i],
      '%': [/процент/i, /percent/i, /%/i],
      'm/min': [/м\/мин/i, /m\/min/i, /м.*мин/i],
      'hh:mm:ss': [/время/i, /time/i, /длительность/i, /duration/i],
      string: [/игрок/i, /player/i, /позиция/i, /position/i, /имя/i, /name/i],
    };

    for (const column of columns) {
      if (!column.hasNumericData) continue;

      let bestMatch = { metric: '', unit: '', confidence: 0 };

      // Ищем совпадения с метриками
      for (const [metric, patterns] of Object.entries(metricPatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(column.name)) {
            bestMatch.metric = metric;
            bestMatch.confidence = 0.8;
            break;
          }
        }
        if (bestMatch.metric) break;
      }

      // Ищем совпадения с единицами измерения
      for (const [unit, patterns] of Object.entries(unitPatterns)) {
        for (const pattern of patterns) {
          if (pattern.test(column.name)) {
            bestMatch.unit = unit;
            break;
          }
        }
      }
      
      // Приоритет для метрик с количеством - переопределяем единицу
      if (bestMatch.metric && (bestMatch.metric.includes('count') || bestMatch.metric.includes('entries'))) {
        bestMatch.unit = 'count';
      }

      // Если не нашли единицу, пытаемся угадать по типу данных
      if (!bestMatch.unit && bestMatch.metric) {
        if (bestMatch.metric.includes('distance')) {
          bestMatch.unit = 'm';
        } else if (bestMatch.metric.includes('speed')) {
          bestMatch.unit = 'km/h';
        } else if (bestMatch.metric.includes('heart_rate')) {
          bestMatch.unit = 'bpm';
        } else if (bestMatch.metric.includes('duration') || bestMatch.metric.includes('time')) {
          bestMatch.unit = 's';
        } else if (bestMatch.metric.includes('count') || bestMatch.metric.includes('entries')) {
          bestMatch.unit = 'count';
        } else if (bestMatch.metric.includes('percentage')) {
          bestMatch.unit = '%';
        } else {
          bestMatch.unit = 'count';
        }
      }

      if (bestMatch.metric) {
        suggestions.push({
          columnName: column.name,
          suggestedMetric: bestMatch.metric,
          suggestedUnit: bestMatch.unit,
          confidence: bestMatch.confidence,
        });
      }
    }

    return suggestions;
  }
}
