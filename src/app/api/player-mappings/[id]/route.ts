import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { db } from '@/lib/db';
import { playerMapping } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;
  
  try {
    // Проверяем, что маппинг принадлежит клубу пользователя
    const existingMapping = await db
      .select()
      .from(playerMapping)
      .where(eq(playerMapping.id, id))
      .limit(1);

    if (existingMapping.length === 0) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    if (existingMapping[0].clubId !== token.clubId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Удаляем маппинг
    const result = await db
      .delete(playerMapping)
      .where(eq(playerMapping.id, id));

    return NextResponse.json({ 
      success: true, 
      removed: result.rowCount ?? 0 
    });
  } catch (error) {
    console.error('Ошибка при удалении маппинга:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}