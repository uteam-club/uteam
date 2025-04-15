import { PrismaClient } from '@prisma/client';

// Глобальная переменная для хранения Prisma клиента
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

// Функция для создания и кэширования клиента Prisma
export function getPrismaClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
    
    // Добавляем обработчик для отключения при завершении процесса
    process.on('beforeExit', () => {
      if (globalForPrisma.prisma) {
        globalForPrisma.prisma.$disconnect().catch(console.error);
      }
    });
  }
  
  return globalForPrisma.prisma;
}

// Экспортируем готовый инстанс
export const prisma = getPrismaClient(); 