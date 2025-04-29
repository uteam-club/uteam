const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Проверяю значения enum AttendanceStatus...');
    
    // Запрос для получения доступных значений enum
    const enumValues = await prisma.$queryRaw`
      SELECT enum_range(NULL::public."AttendanceStatus")
    `;
    
    console.log('Доступные значения для AttendanceStatus:');
    console.log(enumValues);
    
    // Также проверим доступные значения модели через Prisma
    console.log('Значения AttendanceStatus в модели Prisma:');
    // Узнаем какие значения доступны в перечислении AttendanceStatus
    const prismaEnumValues = await prisma.$queryRaw`
      SELECT n.nspname as schema,
             t.typname as type,
             e.enumlabel as value
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'AttendanceStatus'
      ORDER BY e.enumsortorder;
    `;
    console.log(prismaEnumValues);
    
  } catch (error) {
    console.error('Ошибка при проверке enum:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 