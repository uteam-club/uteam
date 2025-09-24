import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';
import { db } from '@/lib/db';
import { playerGameModel, player } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { calculatePlayerGameModel, savePlayerGameModel } from '@/lib/game-model-calculator';

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

    // Получаем последнюю игровую модель
    const [gameModel] = await db
      .select()
      .from(playerGameModel)
      .where(and(
        eq(playerGameModel.playerId, playerId),
        eq(playerGameModel.clubId, session.user.clubId || 'default-club')
      ))
      .orderBy(desc(playerGameModel.calculatedAt))
      .limit(1);

    if (!gameModel) {
      return NextResponse.json({
        success: true,
        gameModel: null,
        message: 'No game model calculated yet'
      });
    }

    return NextResponse.json({
      success: true,
      gameModel: {
        id: gameModel.id,
        playerId: gameModel.playerId,
        calculatedAt: gameModel.calculatedAt,
        matchesCount: gameModel.matchesCount,
        totalMinutes: gameModel.totalMinutes,
        metrics: gameModel.metrics,
        matchIds: gameModel.matchIds,
        version: gameModel.version
      }
    });

  } catch (error) {
    console.error('Error fetching game model:', error);
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

    // Проверяем, что игрок принадлежит к клубу пользователя
    const [playerData] = await db
      .select()
      .from(player)
      .where(eq(player.id, playerId));

    if (!playerData) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }

    // Рассчитываем игровую модель используя новую систему
    const gameModel = await calculatePlayerGameModel(playerId, session.user.clubId || 'default-club');

    if (!gameModel) {
      return NextResponse.json({
        success: false,
        message: 'Insufficient data for game model calculation. Need at least 1 match with 60+ minutes.',
        gameModel: null
      });
    }

    // Сохраняем игровую модель
    await savePlayerGameModel(playerId, session.user.clubId || 'default-club', gameModel);

    return NextResponse.json({
      success: true,
      message: 'Game model calculated and saved successfully',
      gameModel
    });

  } catch (error) {
    console.error('Error recalculating game model:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

