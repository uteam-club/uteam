import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Этот эндпоинт можно вызвать только один раз для создания суперадмина
export async function POST(request: Request) {
  try {
    // Создаем суперадмина с заданными учетными данными и готовым хэшем пароля
    // Хеш соответствует паролю "Admin123!"
    const admin = await prisma.user.create({
      data: {
        email: 'admin@vista.club',
        name: 'Администратор',
        password: '$2b$10$zYl5eOEK4c3QYuQbKYW6ku3gFGVtTzTVUgQqVQbLty3Rk2Oi4GN5y', // Хеш от пароля Admin123!
        role: 'SUPERADMIN',
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Суперадминистратор создан успешно',
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Ошибка при создании суперадмина:', error);
    
    // Проверяем, является ли ошибка связанной с уникальностью email
    if (error.code === 'P2002') {
      return NextResponse.json({
        success: false,
        message: 'Пользователь с таким email уже существует',
        credentials: {
          email: 'admin@vista.club',
          password: 'Admin123!'
        }
      }, { status: 409 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Ошибка при создании суперадмина',
      error: error.message
    }, { status: 500 });
  }
} 