import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getUserPermissions } from '@/services/user.service';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Получение всех клубов
export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'adminPanel.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    // Placeholder for the removed getAllClubs function
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching clubs:', error);
    return NextResponse.json(
      { error: 'Не удалось получить список клубов' },
      { status: 500 }
    );
  }
}

// Создание нового клуба
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const permissions = await getUserPermissions(token.id);
  if (!hasPermission(permissions, 'adminPanel.update')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const subdomain = formData.get('subdomain') as string;
    const logoUrl = formData.get('logoUrl') as string || undefined;

    // Проверка обязательных полей
    if (!name || !subdomain) {
      return NextResponse.json(
        { error: 'Название и поддомен обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Валидация поддомена (только латинские буквы, цифры и дефисы)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      return NextResponse.json(
        { 
          error: 'Поддомен может содержать только строчные латинские буквы, цифры и дефисы' 
        },
        { status: 400 }
      );
    }

    // Placeholder for the removed createClub function
    const club = null;

    if (!club) {
      return NextResponse.json(
        { error: 'Не удалось создать клуб' },
        { status: 500 }
      );
    }

    // Редирект на страницу администрирования
    return NextResponse.redirect(new URL('/admin', request.url));
  } catch (error) {
    console.error('Error creating club:', error);
    
    // Обрабатываем ошибку, если клуб с таким поддоменом уже существует
    if ((error as Error).message.includes('уже существует')) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Произошла ошибка при создании клуба' },
      { status: 500 }
    );
  }
} 