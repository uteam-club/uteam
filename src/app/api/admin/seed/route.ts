import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

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
    
    // 2. Проверяем существование тестовой команды, но не создаем
    const existingTeam = await prisma.team.findUnique({
      where: { id: 'default-team-id' },
    });
    
    let team = existingTeam;
    
    // Добавляем админа в команду только если она уже существует
    if (team) {
      await prisma.team.update({
        where: { id: team.id },
        data: {
          users: {
            connect: { id: admin.id }
          }
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'База данных успешно инициализирована',
      data: {
        admin: { 
          id: admin.id, 
          email: admin.email, 
          role: admin.role 
        },
        team: team ? { 
          id: team.id, 
          name: team.name 
        } : null,
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