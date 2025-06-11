import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const { pinCode, telegramId, language } = await req.json();
    if (!pinCode || !telegramId) {
      return NextResponse.json({ error: 'Missing pinCode or telegramId' }, { status: 400 });
    }
    // Ищем игрока по пинкоду (в любом клубе)
    const [foundPlayer]: any = await db.select({
      id: player.id,
      teamId: player.teamId,
      telegramId: player.telegramId,
    })
      .from(player)
      .where(eq(player.pinCode, pinCode))
      .limit(1);
    if (!foundPlayer) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    // Обновляем telegramId и язык
    await db.update(player)
      .set({ telegramId, language: language || 'en' })
      .where(eq(player.id, foundPlayer.id));
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack }, { status: 500 });
  }
} 