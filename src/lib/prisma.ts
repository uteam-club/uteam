import { PrismaClient } from '@prisma/client';

// Определяем тип для глобального объекта 
type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

// Получаем доступ к глобальному объекту
const globalForPrisma: GlobalWithPrisma = global as unknown as GlobalWithPrisma;

// Инициализируем клиент с конфигурацией логирования
export const prisma = globalForPrisma.prisma || 
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });

// В режиме разработки сохраняем экземпляр в глобальной переменной
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Экспортируем альтернативное имя для совместимости с существующим кодом
export const prismaClient = prisma;

// Добавляем тип для совместимости с кодом, использующим trainingParticipant
// Это поможет разрешить проблемы типизации при использовании snake_case и camelCase
export type { PrismaClient }; 