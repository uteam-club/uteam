import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';
import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUser, deleteUser, getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';
import { getSubdomain } from '@/lib/utils';

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
  return token.clubId === club.id;
}

/**
 * GET /api/users/[id]
 * Получение информации о конкретном пользователе
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(request) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    
    // Удаляю проверку по allowedRoles
    
    const userId = params.id;
    const user = await getUserById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Проверяем, что пользователь принадлежит к тому же клубу
    if (user.clubId !== clubId && role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Не возвращаем хэш пароля
    const { password, ...userWithoutPassword } = user;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch user',
      details: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/users/[id]
 * Обновление данных пользователя
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Начало обработки запроса на обновление пользователя');
    
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(request) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      console.log('Ошибка доступа: пользователь не имеет доступа к этому клубу');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    
    // Удаляю проверку по allowedRoles
    
    const userId = params.id;
    
    // Получаем текущего пользователя
    const currentUser = await getUserById(userId);
    
    if (!currentUser) {
      console.log('Пользователь не найден:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Проверяем, что пользователь принадлежит к тому же клубу
    if (currentUser.clubId !== clubId && role !== 'SUPER_ADMIN') {
      console.log('Попытка редактирования пользователя из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Парсим тело запроса
    const data = await request.json();
    console.log('Получены данные для обновления:', data);
    
    // Создаем объект с данными для обновления
    const updateData: any = {};
    
    // Обрабатываем имя и фамилию, если они предоставлены
    if (data.firstName || data.lastName) {
      let name = '';
      
      if (data.firstName && data.lastName) {
        name = `${data.firstName} ${data.lastName}`;
      } else {
        name = data.firstName || data.lastName;
      }
      
      updateData.name = name;
    }
    
    // Обрабатываем другие поля
    if (data.role) updateData.role = data.role;
    if (data.password) updateData.password = data.password;
    if (data.imageUrl) updateData.imageUrl = data.imageUrl;
    
    // Обновляем пользователя
    const updatedUser = await updateUser(userId, updateData);
    
    if (!updatedUser) {
      console.error('Пользователь не был обновлен: функция вернула null');
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
    
    console.log('Пользователь успешно обновлен:', updatedUser.id);
    
    // Не возвращаем хэш пароля
    const { password, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error('Необработанная ошибка при обновлении пользователя:', error);
    
    return NextResponse.json({ 
      error: 'Failed to update user', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/users/[id]
 * Удаление пользователя
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('Начало обработки запроса на удаление пользователя');
    
    // Получаем токен пользователя
    const token = (await getTokenFromRequest(request) as unknown) as Token | null;
    
    if (!token || typeof token.clubId !== 'string') {
      console.log('Ошибка аутентификации: пользователь не авторизован');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasAccess = await checkClubAccess(request, token);
    if (!hasAccess) {
      console.log('Ошибка доступа: пользователь не имеет доступа к этому клубу');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const role = token.role as string;
    const clubId = token.clubId as string;
    const currentUserId = token.id as string;
    
    // Удаляю проверку по allowedRoles
    
    const userId = params.id;
    
    // Нельзя удалять самого себя
    if (userId === currentUserId) {
      console.log('Попытка удаления собственного аккаунта');
      return NextResponse.json({ 
        error: 'Невозможно удалить свой собственный аккаунт' 
      }, { status: 400 });
    }
    
    // Получаем текущего пользователя
    const currentUser = await getUserById(userId);
    
    if (!currentUser) {
      console.log('Пользователь не найден:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Проверяем, что пользователь принадлежит к тому же клубу
    if (currentUser.clubId !== clubId && role !== 'SUPER_ADMIN') {
      console.log('Попытка удаления пользователя из другого клуба');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Нельзя удалить SUPER_ADMIN если ты не SUPER_ADMIN
    if (currentUser.role === 'SUPER_ADMIN' && role !== 'SUPER_ADMIN') {
      console.log('Попытка удаления суперадмина обычным админом');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Удаляем пользователя
    const isDeleted = await deleteUser(userId);
    
    if (!isDeleted) {
      console.error('Ошибка при удалении пользователя');
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
    
    console.log('Пользователь успешно удален:', userId);
    
    return NextResponse.json({ 
      success: true,
      message: 'User deleted successfully' 
    });
  } catch (error: any) {
    console.error('Необработанная ошибка при удалении пользователя:', error);
    
    return NextResponse.json({ 
      error: 'Failed to delete user', 
      details: error.message || 'Unknown error' 
    }, { status: 500 });
  }
} 