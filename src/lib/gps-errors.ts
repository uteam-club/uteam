export class GpsFileError extends Error {
  constructor(
    message: string,
    public type: 'file_format' | 'file_size' | 'file_corrupted' | 'file_empty' | 'parsing_error' | 'unknown'
  ) {
    super(message);
    this.name = 'GpsFileError';
  }
}

export class GpsErrorHandler {
  /**
   * Обрабатывает ошибки парсинга файлов и возвращает понятные сообщения
   */
  static handleError(error: any): string {
    // Ошибки размера файла
    if (error.message?.includes('File too large') || error.message?.includes('размер')) {
      return 'Файл слишком большой. Максимальный размер: 10MB.';
    }

    // Ошибки формата файла
    if (error.message?.includes('Неподдерживаемый формат') || error.message?.includes('format')) {
      return 'Неподдерживаемый формат файла. Поддерживаются Excel (.xlsx, .xls), CSV (.csv), JSON (.json) и XML (.xml) файлы.';
    }

    // Ошибки чтения файла
    if (error.message?.includes('Ошибка чтения файла') || error.message?.includes('read')) {
      return 'Ошибка при чтении файла. Проверьте, что файл не поврежден.';
    }

    // Ошибки парсинга CSV
    if (error.message?.includes('Ошибки парсинга CSV') || error.message?.includes('CSV')) {
      return 'Ошибка при чтении CSV файла. Проверьте формат и разделители.';
    }

    // Ошибки парсинга Excel
    if (error.message?.includes('Excel') || error.message?.includes('xlsx') || error.message?.includes('xls')) {
      return 'Ошибка при чтении Excel файла. Проверьте, что файл не поврежден.';
    }

    // Пустой файл
    if (error.message?.includes('пуст') || error.message?.includes('empty') || error.message?.includes('данных')) {
      return 'Файл пуст или не содержит данных. Добавьте данные и загрузите снова.';
    }

    // Поврежденный файл
    if (error.message?.includes('поврежден') || error.message?.includes('corrupted') || error.message?.includes('damaged')) {
      return 'Файл поврежден. Попробуйте сохранить файл заново и загрузить снова.';
    }

    // Неизвестные ошибки
    return 'Произошла ошибка при загрузке файла. Проверьте формат файла и попробуйте снова.';
  }

  /**
   * Проверяет размер файла
   */
  static validateFileSize(file: File, maxSizeMB: number = 10): void {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      throw new GpsFileError(
        `Файл слишком большой. Размер: ${(file.size / 1024 / 1024).toFixed(1)}MB, максимум: ${maxSizeMB}MB`,
        'file_size'
      );
    }
  }

  /**
   * Проверяет тип файла
   */
  static validateFileType(file: File): void {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/json', // .json
      'text/xml', // .xml
      'application/xml', // .xml
    ];

    const allowedExtensions = ['.xlsx', '.xls', '.csv', '.json', '.xml'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      throw new GpsFileError(
        `Неподдерживаемый формат файла: ${fileExtension}. Поддерживаются: Excel (.xlsx, .xls), CSV (.csv), JSON (.json) и XML (.xml)`,
        'file_format'
      );
    }
  }

  /**
   * Проверяет, что файл не пустой
   */
  static validateFileNotEmpty(file: File): void {
    if (file.size === 0) {
      throw new GpsFileError('Файл пуст', 'file_empty');
    }
  }

  /**
   * Оборачивает функцию парсинга с обработкой ошибок
   */
  static async withErrorHandling<T>(
    parsingFunction: () => Promise<T>,
    fileName: string
  ): Promise<T> {
    try {
      return await parsingFunction();
    } catch (error) {
      // Если это уже наша ошибка, просто пробрасываем
      if (error instanceof GpsFileError) {
        throw error;
      }

      // Обрабатываем другие ошибки
      const message = this.handleError(error);
      throw new GpsFileError(message, 'parsing_error');
    }
  }
}
