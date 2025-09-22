// Централизованная система логирования

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.isDevelopment) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    switch (level) {
      case LogLevel.ERROR:
        console.error(prefix, message, ...args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, ...args);
        break;
      case LogLevel.INFO:
        console.info(prefix, message, ...args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, message, ...args);
        break;
    }
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }
}

export const logger = new Logger();

// Утилиты для GPS компонентов
export const gpsLogger = {
  error: (context: string, message: string, ...args: any[]) => {
    logger.error(`[GPS:${context}] ${message}`, ...args);
  },
  warn: (context: string, message: string, ...args: any[]) => {
    logger.warn(`[GPS:${context}] ${message}`, ...args);
  },
  info: (context: string, message: string, ...args: any[]) => {
    logger.info(`[GPS:${context}] ${message}`, ...args);
  },
  debug: (context: string, message: string, ...args: any[]) => {
    logger.debug(`[GPS:${context}] ${message}`, ...args);
  }
};
