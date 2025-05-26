import { NextRequest, NextResponse } from 'next/server';
import { createClub, getAllClubs } from '@/services/club.service';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Получение всех клубов
export async function GET(request: NextRequest) {
  try {
    const clubs = await getAllClubs();
    return NextResponse.json(clubs);
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

    // Создание клуба
    const club = await createClub({
      name,
      subdomain,
      logoUrl,
    });

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