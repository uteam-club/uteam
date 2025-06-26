import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { getFullFilePath } from '@/lib/storage';
import fs from 'fs';
import path from 'path';
import { getSubdomain } from '@/lib/utils';
import { getClubBySubdomain } from '@/services/user.service';
import { getToken } from 'next-auth/jwt';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'COACH'];

// Разрешенные MIME типы и их соответствующие расширения файлов
const ALLOWED_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Проверка clubId пользователя и клуба по subdomain
async function checkClubAccess(request: NextRequest, session: any) {
  const host = request.headers.get('host') || '';
  const subdomain = getSubdomain(host);
  if (!subdomain) return false;
  const club = await getClubBySubdomain(subdomain);
  if (!club) return false;
  return session.user.clubId === club.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const token = await getToken({ req: request });
  if (!token || !allowedRoles.includes(token.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    // Получаем сессию пользователя для проверки доступа
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return new NextResponse('Не авторизован', { status: 401 });
    }
    
    const hasAccess = await checkClubAccess(request, session);
    if (!hasAccess) {
      return new NextResponse('Нет доступа к этому клубу', { status: 403 });
    }
    
    // Формируем относительный путь к файлу
    const relativePath = params.path.join('/');
    
    // Проверяем, что путь содержит clubId
    const pathParts = relativePath.split('/');
    
    if (pathParts.length < 2 || pathParts[0] !== 'clubs') {
      return new NextResponse('Некорректный путь к файлу', { status: 400 });
    }
    
    const clubId = pathParts[1];
    
    // Получаем полный путь к файлу
    const fullPath = getFullFilePath(relativePath);
    
    // Проверяем существование файла
    if (!fs.existsSync(fullPath)) {
      return new NextResponse('Файл не найден', { status: 404 });
    }
    
    // Определяем MIME тип файла по расширению
    const fileExt = path.extname(fullPath).toLowerCase();
    const contentType = ALLOWED_MIME_TYPES[fileExt] || 'application/octet-stream';
    
    // Читаем файл
    const fileBuffer = fs.readFileSync(fullPath);
    
    // Возвращаем файл
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // кэшировать на 24 часа
      },
    });
  } catch (error) {
    console.error('Ошибка при получении файла:', error);
    return new NextResponse('Внутренняя ошибка сервера', { status: 500 });
  }
} 