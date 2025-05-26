/**
 * Скрипт для проверки клуба FDC VISTA и его пользователей
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '../src/generated/prisma';

// Загружаем переменные окружения
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Проверяем клуб FDC VISTA...');
    
    // Получаем клуб по поддомену
    const club = await prisma.club.findUnique({
      where: { subdomain: 'fdcvista' }
    });
    
    if (!club) {
      console.log('❌ Клуб FDC VISTA не найден в базе данных');
      return;
    }
    
    console.log(`✅ Клуб найден:`);
    console.log(`ID: ${club.id}`);
    console.log(`Название: ${club.name}`);
    console.log(`Поддомен: ${club.subdomain}`);
    
    // Получаем пользователей клуба
    const users = await prisma.user.findMany({
      where: { clubId: club.id }
    });
    
    console.log(`\nПользователи клуба (всего: ${users.length}):`);
    
    users.forEach((user, index) => {
      console.log(`\nПользователь #${index + 1}:`);
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Имя: ${user.name || 'Не указано'}`);
      console.log(`Роль: ${user.role}`);
    });
    
  } catch (error) {
    console.error('Ошибка при проверке клуба:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 