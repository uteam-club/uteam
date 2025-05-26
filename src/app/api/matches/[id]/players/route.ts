import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

// Схема валидации для добавления игрока в состав на матч
const playerStatSchema = z.object({
  playerId: z.string().uuid(),
  isStarter: z.boolean().default(false),
  minutesPlayed: z.number().int().min(0).default(0),
  goals: z.number().int().min(0).default(0),
  assists: z.number().int().min(0).default(0),
  yellowCards: z.number().int().min(0).default(0),
  redCards: z.number().int().min(0).default(0),
});

// GET для получения всех игроков, участвующих в матче
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const matchId = params.id;

    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        clubId: session.user.clubId,
      },
      include: {
        team: true,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }

    // Получаем статистику игроков для этого матча
    const playerStats = await prisma.playerMatchStat.findMany({
      where: {
        matchId,
      },
      include: {
        player: true,
      },
      orderBy: {
        isStarter: 'desc', // Сначала основной состав, потом запасные
      },
    });

    return NextResponse.json(playerStats);
  } catch (error) {
    console.error('Ошибка при получении состава на матч:', error);
    return NextResponse.json({ error: 'Ошибка при получении состава на матч' }, { status: 500 });
  }
}

// POST для добавления игрока в состав на матч
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const matchId = params.id;
    const body = await request.json();

    // Валидация данных
    const validationResult = playerStatSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Ошибка валидации', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const { playerId, isStarter, minutesPlayed, goals, assists, yellowCards, redCards } = validationResult.data;

    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        clubId: session.user.clubId,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }

    // Проверяем, существует ли игрок и принадлежит ли он команде этого матча
    const player = await prisma.player.findFirst({
      where: {
        id: playerId,
        teamId: match.teamId,
      },
    });

    if (!player) {
      return NextResponse.json({ error: 'Игрок не найден или не принадлежит команде' }, { status: 404 });
    }

    // Проверяем, есть ли уже статистика для этого игрока в этом матче
    const existingPlayerStat = await prisma.playerMatchStat.findUnique({
      where: {
        matchId_playerId: {
          matchId,
          playerId,
        },
      },
    });

    let playerStat;

    if (existingPlayerStat) {
      // Обновляем существующую статистику
      playerStat = await prisma.playerMatchStat.update({
        where: {
          id: existingPlayerStat.id,
        },
        data: {
          isStarter,
          minutesPlayed,
          goals,
          assists,
          yellowCards,
          redCards,
        },
        include: {
          player: true,
        },
      });
    } else {
      // Создаем новую запись статистики
      playerStat = await prisma.playerMatchStat.create({
        data: {
          matchId,
          playerId,
          isStarter,
          minutesPlayed,
          goals,
          assists,
          yellowCards,
          redCards,
        },
        include: {
          player: true,
        },
      });
    }

    return NextResponse.json(playerStat, { status: existingPlayerStat ? 200 : 201 });
  } catch (error) {
    console.error('Ошибка при добавлении игрока в состав:', error);
    return NextResponse.json({ error: 'Ошибка при добавлении игрока в состав' }, { status: 500 });
  }
}

// DELETE для удаления игрока из состава
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const matchId = params.id;
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Требуется ID игрока' }, { status: 400 });
    }

    // Проверяем, существует ли матч и принадлежит ли он клубу пользователя
    const match = await prisma.match.findFirst({
      where: {
        id: matchId,
        clubId: session.user.clubId,
      },
    });

    if (!match) {
      return NextResponse.json({ error: 'Матч не найден' }, { status: 404 });
    }

    // Удаляем статистику игрока для этого матча
    await prisma.playerMatchStat.delete({
      where: {
        matchId_playerId: {
          matchId,
          playerId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка при удалении игрока из состава:', error);
    return NextResponse.json({ error: 'Ошибка при удалении игрока из состава' }, { status: 500 });
  }
} 