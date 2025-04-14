import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Аварийный режим инициализации базы данных,
// когда нет возможности подключиться к базе через UI
export async function GET(request: Request) {
  try {
    // Пароль: Admin123!
    const hashedPassword = '$2b$10$zYl5eOEK4c3QYuQbKYW6ku3gFGVtTzTVUgQqVQbLty3Rk2Oi4GN5y';
    
    // 1. Создаем суперадмина
    const admin = await prisma.user.upsert({
      where: { email: 'admin@vista.club' },
      update: {}, // Не обновляем существующего пользователя
      create: {
        email: 'admin@vista.club',
        name: 'Администратор',
        password: hashedPassword,
        role: 'SUPERADMIN',
      },
    });
    
    // 2. Создаем тестовую команду
    const team = await prisma.team.upsert({
      where: { id: 'default-team-id' },
      update: {},
      create: {
        id: 'default-team-id',
        name: 'Vista Team',
        description: 'Основная команда клуба Vista',
      },
    });
    
    // 3. Добавляем админа в команду
    await prisma.team.update({
      where: { id: team.id },
      data: {
        members: {
          connect: { id: admin.id }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'База данных успешно инициализирована',
      data: {
        admin: { 
          id: admin.id, 
          email: admin.email, 
          role: admin.role 
        },
        team: { 
          id: team.id, 
          name: team.name 
        },
        credentials: {
          email: 'admin@vista.club',
          password: 'Admin123!'
        }
      }
    }, { status: 200 });
  } catch (error: any) {
    console.error('Ошибка инициализации базы данных:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Ошибка инициализации базы данных',
      error: error.message
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 