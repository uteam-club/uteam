import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUsersByClubId, getClubBySubdomain, getUserPermissions } from '@/services/user.service';
import { generateRandomPassword, getSubdomain } from '@/lib/utils';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

// Функция для чтения токена из заголовка Authorization
async function getTokenFromRequest(request: NextRequest) {
  // Сначала пробуем стандартный способ NextAuth
  const token = await getToken({ req: request });
  
  if (token) return token;
  
  // Если нет токена NextAuth, проверяем заголовок Authorization
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  
  try {
    // Извлекаем токен из заголовка
    const bearerToken = authHeader.replace('Bearer ', '');
    
    // Верифицируем JWT токен
    const decodedToken = jwt.verify(
      bearerToken, 
      (() => {
        if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET не задан в .env');
        return process.env.NEXTAUTH_SECRET;
      })()
    ) as any;
    
    // Возвращаем декодированный токен в том же формате, что и NextAuth
    return {
      id: decodedToken.id,
      email: decodedToken.email,
      name: decodedToken.name,
      role: decodedToken.role,
      clubId: decodedToken.clubId,
    };
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error);
    return null;
  }
}

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, token: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  // Глобальный SUPER_ADMIN имеет доступ ко всем клубам
  if (token.role === 'SUPER_ADMIN' && token.clubId === '00000000-0000-0000-0000-000000000000') {
    return true;
  }
  return token.clubId === club.id;
}

/**
 * GET /api/users
 * Получение списка пользователей текущего клуба
 */
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'adminPanel.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const clubId = token.clubId as string;
  const users = await getUsersByClubId(clubId);
  return NextResponse.json(users);
}

/**
 * POST /api/users
 * Создание нового пользователя
 */
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'adminPanel.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!hasPermission(permissions, 'adminPanel.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    console.log('Начало обработки запроса на создание пользователя');
    const clubId = token.clubId as string;
    const email = token.email as string;
    console.log('Пользователь авторизован:', email);
    // Парсим тело запроса
    const data = await request.json();
    console.log('Получены данные:', data);
    // Проверяем обязательные поля
    if (!data.email) {
      console.log('Ошибка валидации: email обязателен');
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    // Генерируем случайный пароль
    const password = generateRandomPassword();
    console.log('Сгенерирован пароль для нового пользователя');
    // Составляем полное имя из имени и фамилии
    const name = data.firstName && data.lastName 
      ? `${data.firstName} ${data.lastName}` 
      : data.firstName || data.lastName || '';
    console.log('Создаем пользователя с данными:', { 
      email: data.email, 
      name, 
      role: data.role || 'MEMBER',
      clubId
    });
    // Создаем пользователя
    try {
      const user = await createUser({
        email: data.email,
        name,
        password,
        role: data.role || 'MEMBER',
        clubId, // Привязываем к текущему клубу
      });
      if (!user) {
        console.error('Пользователь не был создан: функция вернула null');
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
      console.log('Пользователь успешно создан:', user.id);
      // Возвращаем данные созданного пользователя вместе с паролем (для показа)
      return NextResponse.json({
        ...user,
        password, // Только для отображения один раз при создании!
      });
    } catch (innerError: any) {
      console.error('Ошибка при создании пользователя в createUser:', innerError);
      // Проверяем ошибку уникальности email
      if (innerError.code === 'P2002' && innerError.meta?.target?.includes('email')) {
        return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 400 });
      }
      throw innerError; // Пробрасываем ошибку дальше
    }
  } catch (error: any) {
    console.error('Необработанная ошибка при создании пользователя:', error);
    return NextResponse.json({ 
      error: 'Failed to create user', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 