// Централизованный обработчик ошибок для API

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: any;
}

export class ApiErrorHandler {
  /**
   * Обрабатывает ошибки и возвращает безопасные сообщения
   */
  static handleError(error: any): ApiError {
    // Ошибки валидации
    if (error.name === 'ValidationError' || error.message?.includes('validation')) {
      return {
        code: 'VALIDATION_ERROR',
        message: 'Ошибка валидации данных',
        statusCode: 400,
        details: error.details
      };
    }

    // Ошибки авторизации
    if (error.name === 'UnauthorizedError' || error.message?.includes('Unauthorized')) {
      return {
        code: 'UNAUTHORIZED',
        message: 'Необходима авторизация',
        statusCode: 401
      };
    }

    // Ошибки доступа
    if (error.name === 'ForbiddenError' || error.message?.includes('Forbidden')) {
      return {
        code: 'FORBIDDEN',
        message: 'Недостаточно прав доступа',
        statusCode: 403
      };
    }

    // Ошибки базы данных
    if (error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
      return {
        code: 'DUPLICATE_ENTRY',
        message: 'Запись с такими данными уже существует',
        statusCode: 409
      };
    }

    if (error.message?.includes('foreign key constraint') || error.message?.includes('referential integrity')) {
      return {
        code: 'REFERENCE_ERROR',
        message: 'Нарушение связей между данными',
        statusCode: 400
      };
    }

    if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
      return {
        code: 'NOT_FOUND',
        message: 'Запрашиваемый ресурс не найден',
        statusCode: 404
      };
    }

    // Ошибки файлов
    if (error.message?.includes('file') || error.message?.includes('File')) {
      return {
        code: 'FILE_ERROR',
        message: 'Ошибка при работе с файлом',
        statusCode: 400
      };
    }

    // Ошибки парсинга
    if (error.message?.includes('parse') || error.message?.includes('JSON')) {
      return {
        code: 'PARSE_ERROR',
        message: 'Ошибка при обработке данных',
        statusCode: 400
      };
    }

    // Ошибки сети
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return {
        code: 'NETWORK_ERROR',
        message: 'Ошибка сети. Попробуйте позже',
        statusCode: 503
      };
    }

    // Ошибки сервера
    if (error.message?.includes('database') || error.message?.includes('connection')) {
      return {
        code: 'DATABASE_ERROR',
        message: 'Ошибка базы данных. Попробуйте позже',
        statusCode: 503
      };
    }

    // Неизвестные ошибки
    return {
      code: 'INTERNAL_ERROR',
      message: 'Внутренняя ошибка сервера',
      statusCode: 500
    };
  }

  /**
   * Логирует ошибку для отладки (только в development)
   */
  static logError(error: any, context?: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.error(`[API Error]${context ? ` [${context}]` : ''}:`, {
        message: error.message,
        stack: error.stack,
        name: error.name,
        ...error
      });
    }
  }

  /**
   * Создает безопасный ответ с ошибкой
   */
  static createErrorResponse(error: any, context?: string) {
    const apiError = this.handleError(error);
    this.logError(error, context);

    return {
      error: apiError.code,
      message: apiError.message,
      ...(process.env.NODE_ENV === 'development' && { details: apiError.details }),
      statusCode: apiError.statusCode
    };
  }

  /**
   * Проверяет, является ли ошибка критической
   */
  static isCriticalError(error: any): boolean {
    const criticalCodes = ['DATABASE_ERROR', 'NETWORK_ERROR', 'INTERNAL_ERROR'];
    const apiError = this.handleError(error);
    return criticalCodes.includes(apiError.code);
  }

  /**
   * Получает пользовательское сообщение для ошибки
   */
  static getUserMessage(error: any): string {
    const apiError = this.handleError(error);
    return apiError.message;
  }
}

// Утилиты для работы с ошибками
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  REFERENCE_ERROR: 'REFERENCE_ERROR',
  FILE_ERROR: 'FILE_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

// Хук для обработки ошибок в React компонентах
export function useErrorHandler() {
  const handleError = (error: any, context?: string) => {
    const apiError = ApiErrorHandler.handleError(error);
    ApiErrorHandler.logError(error, context);
    return apiError;
  };

  const getUserMessage = (error: any) => {
    return ApiErrorHandler.getUserMessage(error);
  };

  return { handleError, getUserMessage };
}
