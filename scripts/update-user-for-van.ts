/**
 * Скрипт для обновления существующего пользователя, чтобы он мог войти в клуб FC VAN
 * 
 * Запуск: 
 * npx tsx scripts/update-user-for-van.ts
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma';

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

// Настройки
const CLUB_NAME = 'FC VAN';
const CLUB_SUBDOMAIN = 'van';
const ADMIN_EMAIL = 'admin@fdcvista.uteam.club'; // Email существующего суперадмина

async function main() {
  console.log('Начинаем настройку мультитенантности для пользователя...');
  
  try {
    // Проверяем соединение с базой данных
    console.log('Проверяем соединение с базой данных...');
    await prisma.$connect();
    console.log('✅ Соединение с базой данных установлено!');
    
    // Проверяем существует ли уже клуб FC VAN
    let vanClub = await prisma.club.findUnique({
      where: { subdomain: CLUB_SUBDOMAIN }
    });
    
    if (!vanClub) {
      // Создаем клуб FC VAN
      console.log(`Создаем новый клуб '${CLUB_NAME}'...`);
      vanClub = await prisma.club.create({
        data: {
          name: CLUB_NAME,
          subdomain: CLUB_SUBDOMAIN,
        }
      });
      console.log(`✅ Клуб успешно создан с ID: ${vanClub.id}`);
    } else {
      console.log(`Клуб '${CLUB_NAME}' уже существует, ID: ${vanClub.id}`);
    }
    
    // Находим пользователя по email
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL }
    });
    
    if (!existingUser) {
      console.error(`❌ Пользователь с почтой '${ADMIN_EMAIL}' не найден!`);
      process.exit(1);
    }
    
    console.log(`Найден пользователь: ${existingUser.name}, ID: ${existingUser.id}`);
    console.log(`Текущий клуб пользователя: ${existingUser.clubId}`);
    
    // Проверяем, что пользователь имеет роль SUPER_ADMIN
    if (existingUser.role !== 'SUPER_ADMIN') {
      console.log(`Обновляем роль пользователя до SUPER_ADMIN...`);
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { role: 'SUPER_ADMIN' }
      });
    }
    
    console.log(`✅ Пользователь настроен для мультитенантности.`);
    console.log(`Теперь пользователь ${existingUser.email} может входить в систему с помощью следующих поддоменов:`);
    
    // Находим и выводим все доступные клубы
    const allClubs = await prisma.club.findMany();
    allClubs.forEach((club) => {
      console.log(`- ${club.subdomain}.uteam.club (${club.name})`);
    });
    
    console.log('\nСистема обеспечивает мультитенантность путем выбора клуба на основе поддомена.');
    console.log('Пользователь сможет входить на любой из этих поддоменов с одинаковыми учетными данными.');
    
    console.log('✅ Операция успешно завершена!');
  } catch (error) {
    console.error('❌ Ошибка при настройке мультитенантности:', error);
    console.error('Детали ошибки:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 