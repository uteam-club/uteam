import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { player, team } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET - получение игроков команды для публичного доступа
export async function GET(
  request: NextRequest,
  { params }: { params: { teamId: string } }
) {
  try {
    const teamId = params.teamId;

    if (!teamId) {
      return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
    }

    console.log('🔍 Получаем игроков команды для публичного доступа:', teamId);

    // Проверяем, что команда существует
    const [teamData] = await db
      .select()
      .from(team)
      .where(eq(team.id, teamId));

    if (!teamData) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Получаем игроков команды
    const players = await db
      .select({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        position: player.position,
        imageUrl: player.imageUrl,
        number: player.number
      })
      .from(player)
      .where(eq(player.teamId, teamId));

    console.log('✅ Найдено игроков:', players.length);

    return NextResponse.json(players);
  } catch (error) {
    console.error('❌ Ошибка при получении игроков команды:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 