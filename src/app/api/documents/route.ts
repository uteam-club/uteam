import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

// Добавляю тип Token
type Token = { clubId: string; [key: string]: any };

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

// Универсальная функция для получения токена пользователя
async function getTokenFromRequest(request: NextRequest) {
  const { getToken } = await import('next-auth/jwt');
  const token = await getToken({ req: request });
  if (token) return token;
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const jwtLib = await import('jsonwebtoken');
    const bearerToken = authHeader.replace('Bearer ', '');
    const decodedToken = jwtLib.verify(
      bearerToken,
      process.env.NEXTAUTH_SECRET || 'fdcvista-default-secret-key-change-me'
    ) as any;
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


export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'documents.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasAccess = await checkClubAccess(request, token);
  if (!hasAccess) {
    return NextResponse.json({ error: 'Нет доступа к этому клубу' }, { status: 403 });
  }
  // ... остальной код ...
} 