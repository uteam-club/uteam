import { NextResponse } from 'next/server';
import { createSuperAdmin, getClubBySubdomain } from '@/services/user.service';
export const dynamic = 'force-dynamic';
export const revalidate = 0;



// Защищенный ключ для создания админа
const ADMIN_CREATION_SECRET = process.env.ADMIN_CREATION_SECRET || 'development-super-secret-key';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, clubName, clubSubdomain, secret } = body;

    // Проверяем секретный ключ
    if (secret !== ADMIN_CREATION_SECRET) {
      return NextResponse.json({ error: 'Неверный секретный ключ' }, { status: 403 });
    }

    // Проверяем обязательные поля
    if (!name || !email || !password || !clubName || !clubSubdomain) {
      return NextResponse.json({ error: 'Все поля обязательны для заполнения' }, { status: 400 });
    }

    // Получаем клуб по поддомену
    const club = await getClubBySubdomain(clubSubdomain);
    if (!club) {
      return NextResponse.json({ error: 'Клуб с таким поддоменом не найден' }, { status: 404 });
    }

    // Создаем суперадмина
    const admin = await createSuperAdmin({
      name,
      email,
      password,
      clubId: club.id
    });

    if (!admin) {
      return NextResponse.json({ error: 'Ошибка при создании администратора' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Администратор и клуб успешно созданы',
      club: { id: club.id, name: club.name, subdomain: club.subdomain },
      admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (error: any) {
    console.error('Error creating admin:', error);
    return NextResponse.json({ error: error.message || 'Произошла ошибка при создании администратора' }, { status: 500 });
  }
} 