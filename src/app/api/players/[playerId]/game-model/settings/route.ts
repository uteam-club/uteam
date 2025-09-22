import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { playerGameModelSettings, player } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId } = params;

    // Проверяем, что игрок принадлежит к клубу пользователя
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Получаем настройки
    const [settings] = await db
      .select()
      .from(playerGameModelSettings)
      .where(and(
        eq(playerGameModelSettings.playerId, playerId),
        eq(playerGameModelSettings.clubId, session.user.clubId || 'default-club')
      ));

    return NextResponse.json({
      success: true,
      settings: settings || {
        selectedMetrics: [],
        metricUnits: {}
      }
    });

  } catch (error) {
    console.error('Error fetching game model settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { playerId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { playerId } = params;
    const body = await request.json();
    const { selectedMetrics, metricUnits } = body;

    // Проверяем, что игрок принадлежит к клубу пользователя
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Проверяем существующие настройки
    const [existingSettings] = await db
      .select()
      .from(playerGameModelSettings)
      .where(and(
        eq(playerGameModelSettings.playerId, playerId),
        eq(playerGameModelSettings.clubId, session.user.clubId || 'default-club')
      ));

    let savedSettings;
    if (existingSettings) {
      [savedSettings] = await db
        .update(playerGameModelSettings)
        .set({
          selectedMetrics,
          metricUnits,
          updatedAt: new Date()
        })
        .where(eq(playerGameModelSettings.id, existingSettings.id))
        .returning();
    } else {
      [savedSettings] = await db
        .insert(playerGameModelSettings)
        .values({
          playerId,
          clubId: session.user.clubId || 'default-club',
          selectedMetrics,
          metricUnits
        })
        .returning();
    }

    return NextResponse.json({
      success: true,
      settings: savedSettings
    });

  } catch (error) {
    console.error('Error saving game model settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
