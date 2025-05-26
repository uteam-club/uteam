import { getSession as nextAuthGetSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import * as jwt from 'jsonwebtoken';

// Экспортируем authOptions из локального файла
export { authOptions } from './auth-options';

export async function getSession() {
  return await nextAuthGetSession();
}

export async function getCurrentUser() {
  const session = await getSession();

  return session?.user;
}

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
    redirect("/login");
  }

  return user;
}

export async function isAuthenticated() {
  const session = await getSession();

  return !!session?.user;
}

/**
 * Получение токена из запроса с поддержкой как NextAuth, так и Bearer токена
 */
export async function getTokenFromRequest(request: NextRequest) {
  // Сначала пробуем стандартный способ NextAuth
  try {
    const token = await getToken({ req: request });
    
    if (token) {
      return token;
    }
    
    // Если нет токена NextAuth, проверяем заголовок Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    
    // Извлекаем токен из заголовка
    const bearerToken = authHeader.replace('Bearer ', '');
    
    // Верифицируем JWT токен
    const decodedToken = jwt.verify(
      bearerToken, 
      process.env.NEXTAUTH_SECRET || 'fdcvista-default-secret-key-change-me'
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
    console.error('Ошибка при получении/декодировании токена:', error);
    return null;
  }
}

/**
 * Проверка, имеет ли токен указанную роль
 */
export function hasRole(token: any, allowedRoles: string[]) {
  if (!token || !token.role) return false;
  return allowedRoles.includes(token.role);
} 