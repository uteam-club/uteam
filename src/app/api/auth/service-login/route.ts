import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/services/user.service';
import { sign } from 'jsonwebtoken';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const email = data.email as string;
    const password = data.password as string;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email и пароль обязательны для заполнения' },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(user, password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Неверный email или пароль' },
        { status: 401 }
      );
    }

    // Разрешаем только сервисным пользователям (SUPER_ADMIN)
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Нет доступа: только для сервисных пользователей' },
        { status: 403 }
      );
    }

    // Генерируем JWT-токен
    const token = sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        clubId: user.clubId,
      },
      process.env.NEXTAUTH_SECRET || 'secret',
      { expiresIn: '1d' }
    );

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Service login error:', error);
    return NextResponse.json(
      { error: 'Ошибка при сервисной авторизации' },
      { status: 500 }
    );
  }
} 