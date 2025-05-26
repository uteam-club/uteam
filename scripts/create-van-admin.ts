/**
 * Скрипт для создания клуба FC VAN и суперадмина
 * 
 * Запуск: 
 * npx tsx scripts/create-van-admin.ts
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

// Загружаем переменные окружения
dotenv.config();

// Получаем URL базы данных из .env
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Ошибка: URL базы данных не указан в .env!');
  process.exit(1);
}

// Создаем экземпляр Prisma Client
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

// Настройки для создания
const CLUB_NAME = 'FC VAN';
const CLUB_SUBDOMAIN = 'van';
const ADMIN_EMAIL = 'admin@fdcvista.uteam.club'; // Такой же email как у FDC VISTA
const ADMIN_PASSWORD = 'FDCvista2024!'; // Такой же пароль как у FDC VISTA
const ADMIN_NAME = 'Администратор FC VAN';

async function main() {
  console.log('Начинаем создание клуба FC VAN и суперадмина...');
  
  try {
    // Проверяем соединение с базой данных
    console.log('Проверяем соединение с базой данных...');
    await prisma.$connect();
    console.log('✅ Соединение с базой данных установлено!');
    
    // Проверяем, есть ли уже клуб с таким поддоменом
    const existingClub = await prisma.club.findUnique({
      where: { subdomain: CLUB_SUBDOMAIN }
    });
    
    let clubId;
    
    if (existingClub) {
      console.log(`Клуб с поддоменом '${CLUB_SUBDOMAIN}' уже существует, ID: ${existingClub.id}`);
      clubId = existingClub.id;
    } else {
      // Создаем новый клуб
      console.log(`Создаем новый клуб '${CLUB_NAME}'...`);
      
      const newClub = await prisma.club.create({
        data: {
          name: CLUB_NAME,
          subdomain: CLUB_SUBDOMAIN,
        }
      });
      
      clubId = newClub.id;
      console.log(`✅ Клуб успешно создан с ID: ${clubId}`);
    }
    
    // Проверяем, есть ли уже пользователь с такой почтой в этом клубе
    const existingUser = await prisma.user.findFirst({
      where: { 
        email: ADMIN_EMAIL,
        clubId: clubId
      }
    });
    
    if (existingUser) {
      console.log(`Пользователь с почтой '${ADMIN_EMAIL}' уже существует в этом клубе, ID: ${existingUser.id}`);
      console.log(`Роль пользователя: ${existingUser.role}`);
      
      // Если пользователь существует, но не SUPER_ADMIN, обновляем его роль
      if (existingUser.role !== 'SUPER_ADMIN') {
        const updatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'SUPER_ADMIN' }
        });
        
        console.log(`✅ Роль пользователя обновлена до SUPER_ADMIN`);
      }
    } else {
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // Создаем суперадмина
      console.log(`Создаем суперадмина с почтой '${ADMIN_EMAIL}' для клуба FC VAN...`);
      
      const newUser = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: ADMIN_NAME,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          clubId: clubId
        }
      });
      
      console.log(`✅ Суперадмин успешно создан с ID: ${newUser.id}`);
      console.log(`Данные для входа в систему:`);
      console.log(`Email: ${ADMIN_EMAIL}`);
      console.log(`Пароль: ${ADMIN_PASSWORD}`);
    }
    
    console.log('✅ Операция успешно завершена!');
  } catch (error) {
    console.error('❌ Ошибка при создании клуба или суперадмина:', error);
    console.error('Детали ошибки:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 