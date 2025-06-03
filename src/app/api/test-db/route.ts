import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const users = await db.select({ id: user.id, email: user.email, role: user.role })
      .from(user)
      .limit(5);
    return NextResponse.json({ 
      success: true, 
      message: 'База данных работает',
      users
    });
  } catch (error) {
    console.error('Ошибка при подключении к БД:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Неизвестная ошибка' 
    }, { status: 500 });
  }
} 