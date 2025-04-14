import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { UserRole } from '@prisma/client';
import { hashPassword } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }

    // Получение параметров запроса
    const { searchParams } = new URL(request.url);
    const roleParam = searchParams.get('role');

    // Подготовка фильтра по роли
    let whereClause: any = {};
    
    if (roleParam) {
      // Если указан параметр роли, добавляем его в фильтр
      // Для 'coach' используем роли MANAGER, ADMIN и SUPERADMIN
      if (roleParam === 'coach') {
        whereClause.role = {
          in: [UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPERADMIN]
        };
      } else if (Object.values(UserRole).includes(roleParam as UserRole)) {
        whereClause.role = roleParam as UserRole;
      }
    }

    // Выполнение запроса
    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Ошибка при получении пользователей:', error);
    return NextResponse.json(
      { error: 'Не удалось получить пользователей' },
      { status: 500 }
    );
  }
}

// POST для создания нового пользователя
export async function POST(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Проверка прав администратора
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      );
    }
    
    // Получение данных запроса
    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.firstName || !data.lastName) {
      return NextResponse.json(
        { error: 'Имя и фамилия обязательны' },
        { status: 400 }
      );
    }

    if (!data.role) {
      return NextResponse.json(
        { error: 'Роль пользователя обязательна' },
        { status: 400 }
      );
    }
    
    // Составление полного имени
    const name = `${data.firstName} ${data.lastName}`;
    // Формирование email если не указан
    const email = data.email || `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@vista.uteam.club`;
    
    // Генерация временного пароля
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Хеширование пароля
    const hashedPassword = await hashPassword(tempPassword);
    
    // Создание пользователя
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role: data.role as UserRole,
        password: hashedPassword, // Теперь сохраняем хешированный пароль
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true
      }
    });
    
    // Возвращаем данные пользователя вместе с временным паролем (открытым текстом)
    return NextResponse.json({
      user,
      temporaryPassword: tempPassword
    });
  } catch (error) {
    console.error('Ошибка при создании пользователя:', error);
    return NextResponse.json(
      { error: 'Не удалось создать пользователя' },
      { status: 500 }
    );
  }
}

// PUT для обновления существующего пользователя
export async function PUT(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Проверка прав администратора
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      );
    }
    
    // Получение данных запроса
    const data = await request.json();
    
    // Проверка обязательных полей
    if (!data.id) {
      return NextResponse.json(
        { error: 'ID пользователя обязателен' },
        { status: 400 }
      );
    }
    
    if (!data.firstName || !data.lastName) {
      return NextResponse.json(
        { error: 'Имя и фамилия обязательны' },
        { status: 400 }
      );
    }

    if (!data.role) {
      return NextResponse.json(
        { error: 'Роль пользователя обязательна' },
        { status: 400 }
      );
    }
    
    // Составление полного имени
    const name = `${data.firstName} ${data.lastName}`;
    
    // Обновление пользователя
    const user = await prisma.user.update({
      where: { id: data.id },
      data: {
        name,
        email: data.email || undefined,
        role: data.role as UserRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true
      }
    });
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Ошибка при обновлении пользователя:', error);
    return NextResponse.json(
      { error: 'Не удалось обновить пользователя' },
      { status: 500 }
    );
  }
}

// DELETE для удаления пользователя
export async function DELETE(request: Request) {
  try {
    // Проверка авторизации
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Требуется авторизация' }, 
        { status: 401 }
      );
    }
    
    // Проверка прав администратора
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });
    
    if (!currentUser || currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.SUPERADMIN) {
      return NextResponse.json(
        { error: 'Недостаточно прав для выполнения операции' },
        { status: 403 }
      );
    }
    
    // Получение ID пользователя
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID пользователя обязателен' },
        { status: 400 }
      );
    }
    
    // Удаление пользователя
    await prisma.user.delete({
      where: { id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    return NextResponse.json(
      { error: 'Не удалось удалить пользователя' },
      { status: 500 }
    );
  }
} 