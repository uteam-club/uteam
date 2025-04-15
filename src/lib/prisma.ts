import { PrismaClient } from '@prisma/client';

// Глобальная переменная для хранения клиента в dev режиме
declare global {
  var prisma: PrismaClient | undefined;
}

// Создаем экземпляр клиента для production или берем существующий для dev
export const prisma = global.prisma || new PrismaClient({
  log: ['query', 'error'],
});

// Для dev режима сохраняем экземпляр клиента в глобальной переменной
if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

// Экспортируем готовый инстанс
export const prismaClient = prisma; 